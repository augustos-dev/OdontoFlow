'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  RefreshCw,
  CreditCard,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  FileText,
  Eye,
  X,
  Truck,
  Plus,
  Coins
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import api from '@/lib/api'
import styles from './gestaodetitulos.module.css'

export type FinancialDirection = 'RECEIVABLE' | 'PAYABLE'
export type TitleOrigin = 'PARTICULAR' | 'CONVENIO' | 'FORNECEDOR' | 'OPERACIONAL'

export interface FinancialTitleItem {
  id: string
  direction: FinancialDirection
  origin: TitleOrigin
  title: string
  entityName: string
  entityContact?: string
  entityCnpj?: string
  category: string
  costCenter?: string
  dentistId?: string
  treatmentPlanId?: string
  treatmentPlanTitle?: string
  batchNumber?: string
  amount: number
  dueDate: string
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELED'
  paidAt?: string
  paymentMethod?: string
  createdAt?: string
}

interface SupplierItem {
  id: string
  name: string
  cnpj?: string
}

function resolveEntityName(entity: any, fallback = 'Fornecedor / Clínica'): string {
  if (!entity) return fallback
  if (typeof entity === 'string') return entity
  if (typeof entity === 'object') {
    return entity.name || entity.tradeName || entity.razaoSocial || entity.cnpj || fallback
  }
  return String(entity)
}

function resolveText(val: any, fallback = ''): string {
  if (!val) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val.name || val.title || val.description || fallback
  }
  return String(val)
}

function CustomFinancialTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className={styles.darkTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipItems}>
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill || '#0284c7'
          const formattedVal = (Number(entry.value) || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })
          return (
            <div key={`entry-${index}`} className={styles.tooltipRow}>
              <span className={styles.tooltipDot} style={{ backgroundColor: color }} />
              <span className={styles.tooltipName}>{entry.name}:</span>
              <span className={styles.tooltipVal}>{formattedVal}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ContasPagarReceberPage() {
  const [titles, setTitles] = useState<FinancialTitleItem[]>([])
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([])
  const [userRole, setUserRole] = useState<'ADMIN' | 'DENTIST' | 'SECRETARY'>('ADMIN')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Abas e Filtros
  const [activeTab, setActiveTab] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE' | 'CONVENIO' | 'FORNECEDOR'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('PENDING')
  const [searchTerm, setSearchTerm] = useState('')

  // Seleção Múltipla para Liquidação em Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modais
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [newPayableModalOpen, setNewPayableModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTitle, setSelectedTitle] = useState<FinancialTitleItem | null>(null)
  const [batchToSettle, setBatchToSettle] = useState<FinancialTitleItem[]>([])

  // Formulário de Baixa
  const [settleMethod, setSettleMethod] = useState('PIX')
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10))
  const [settleDiscount, setSettleDiscount] = useState<number>(0)
  const [settlePenalty, setSettlePenalty] = useState<number>(0)
  const [settleNotes, setSettleNotes] = useState('')
  const [submittingSettle, setSubmittingSettle] = useState(false)
  const [settleError, setSettleError] = useState('')

  // Formulário de Nova Despesa (Contas a Pagar Operacional)
  const [newSupplierId, setNewSupplierId] = useState('')
  const [newPayableDesc, setNewPayableDesc] = useState('')
  const [newPayableAmount, setNewPayableAmount] = useState<number | ''>('')
  const [newPayableMethod, setNewPayableMethod] = useState('PIX')
  const [newPayableCategory, setNewPayableCategory] = useState('Insumos & Dental')
  const [newPayableCostCenter, setNewPayableCostCenter] = useState('Atendimento Clínico')
  const [newPayableDueDate, setNewPayableDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [isRecurring, setIsRecurring] = useState(false)
  const [creatingPayable, setCreatingPayable] = useState(false)

  const loadFinancialTitles = useCallback(async () => {
    try {
      setLoading(true)

      // Identifica Usuário e Role
      try {
        const { data: meRes } = await api.get('/auth/me')
        const me = meRes?.user || meRes
        setUserRole(me?.role || 'ADMIN')
        setCurrentUserId(me?.id || '')
      } catch {
        setUserRole('ADMIN')
      }

      let list: FinancialTitleItem[] = []

      // Carrega Planos, Transações e Fornecedores
      const [plansRes, transRes, suppliersRes] = await Promise.allSettled([
        api.get('/treatment-plans?limit=100'),
        api.get('/transactions?limit=150'),
        api.get('/suppliers?limit=50'),
      ])

      const suppMap: Record<string, SupplierItem> = {}
      if (suppliersRes.status === 'fulfilled') {
        const rawSuppliers = Array.isArray(suppliersRes.value.data)
          ? suppliersRes.value.data
          : suppliersRes.value.data?.data || []

        const loadedSuppliers: SupplierItem[] = []
        rawSuppliers.forEach((s: any) => {
          if (s.id) {
            const item = {
              id: s.id,
              name: resolveEntityName(s.name, 'Fornecedor Cadastrado'),
              cnpj: s.cnpj || undefined,
            }
            suppMap[s.id] = item
            loadedSuppliers.push(item)
          }
        })
        setSuppliers(loadedSuppliers)
      }

      const plans = plansRes.status === 'fulfilled'
        ? (Array.isArray(plansRes.value.data) ? plansRes.value.data : plansRes.value.data?.data || [])
        : []
      const transactions = transRes.status === 'fulfilled'
        ? (Array.isArray(transRes.value.data) ? transRes.value.data : transRes.value.data?.data || [])
        : []

      // 1. Mapeamento de Planos de Tratamento (Somente Planos requerem controle de parcelamento)
      plans.forEach((pl: any) => {
        const patientName = resolveEntityName(pl.patient, 'Paciente Geral')
        const planTitle = resolveText(pl.title, 'Plano Odontológico')
        const totalAmount = Number(pl.totalAmount || 0)
        const installments = Number(pl.installmentsCount || pl.installments || 1)
        const installmentVal = installments > 0 ? totalAmount / installments : totalAmount
        const isConvenio = Boolean(
          pl.insuranceCompany ||
          pl.category === 'CONVENIO' ||
          planTitle.toLowerCase().includes('convênio') ||
          planTitle.toLowerCase().includes('convenio')
        )

        const baseDate = new Date(pl.createdAt || new Date())
        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date(baseDate)
          dueDate.setMonth(baseDate.getMonth() + (i - 1))
          const today = new Date()

          const isPaid = pl.status === 'COMPLETED' || pl.status === 'PAID'
          const isOverdue = !isPaid && dueDate < today

          list.push({
            id: `${pl.id}-rec-${i}`,
            direction: 'RECEIVABLE',
            origin: isConvenio ? 'CONVENIO' : 'PARTICULAR',
            title: isConvenio ? `Fatura / Guia • ${planTitle}` : `Parcela ${i}/${installments} • ${planTitle}`,
            entityName: isConvenio ? resolveEntityName(pl.insuranceCompany, 'Operadora Convênio') : patientName,
            entityContact: resolveText(pl.patient?.phone),
            category: isConvenio ? 'Convênio Odontológico' : 'Tratamento Clínico',
            costCenter: 'Atendimento Clínico',
            dentistId: pl.dentistId || pl.dentist?.id,
            treatmentPlanId: pl.id,
            treatmentPlanTitle: planTitle,
            batchNumber: isConvenio ? `LOTE-${new Date(baseDate).getFullYear()}${(new Date(baseDate).getMonth() + 1).toString().padStart(2, '0')}-${i}` : undefined,
            amount: installmentVal,
            dueDate: dueDate.toISOString(),
            status: isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING',
            createdAt: pl.createdAt,
          })
        }
      })

      // 2. Mapeamento de Contas a Pagar (Despesas não conciliadas e contas agendadas)
      transactions.forEach((tr: any) => {
        if (tr.type === 'DESPESA') {
          // Despesas que foram registradas com vencimento futuro ou não-conciliadas
          const isPending = !tr.reconciled && (!tr.paidAt || new Date(tr.date) > new Date())
          const isOverdue = isPending && new Date(tr.date) < new Date()

          let resolvedSupplierName = ''
          let resolvedCnpj: string | undefined = undefined

          if (tr.supplierId && suppMap[tr.supplierId]) {
            resolvedSupplierName = suppMap[tr.supplierId].name
            resolvedCnpj = suppMap[tr.supplierId].cnpj
          } else if (tr.supplier) {
            resolvedSupplierName = resolveEntityName(tr.supplier)
            if (typeof tr.supplier === 'object' && tr.supplier.cnpj) {
              resolvedCnpj = tr.supplier.cnpj
            }
          } else if (tr.description?.includes(':')) {
            resolvedSupplierName = tr.description.split(':')[1]?.trim()
          } else {
            resolvedSupplierName = 'Fornecedor / Clínica'
          }

          const desc = resolveText(tr.description, 'Despesa Operacional')
          const isSupplier = tr.supplierId || tr.supplier || desc.toLowerCase().includes('dental') || desc.toLowerCase().includes('compra')

          list.push({
            id: tr.id,
            direction: 'PAYABLE',
            origin: isSupplier ? 'FORNECEDOR' : 'OPERACIONAL',
            title: desc,
            entityName: resolvedSupplierName,
            entityCnpj: resolvedCnpj,
            category: resolveText(tr.category, 'Geral'),
            costCenter: resolveText(tr.costCenter, 'Geral / Estrutural'),
            amount: Number(tr.amount || 0),
            dueDate: tr.date || tr.createdAt,
            status: isPending ? (isOverdue ? 'OVERDUE' : 'PENDING') : 'PAID',
            paidAt: tr.paidAt || tr.date,
            paymentMethod: resolveText(tr.paymentMethod, 'PIX'),
            createdAt: tr.createdAt,
          })
        }
      })

      setTitles(list)
      setSelectedIds([])
    } catch (err) {
      console.error('Erro ao carregar títulos financeiros:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFinancialTitles()
  }, [loadFinancialTitles])

  function formatCurrency(val: number) {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  // Filtragem com suporte a RBAC
  const filteredList = useMemo(() => {
    return titles.filter((item) => {
      // Regra RBAC: Dentista só visualiza títulos de sua própria produção clínica
      if (userRole === 'DENTIST' && item.direction === 'RECEIVABLE') {
        if (item.dentistId && item.dentistId !== currentUserId) return false
      }

      const matchTab =
        activeTab === 'ALL'
          ? true
          : activeTab === 'CONVENIO'
          ? item.origin === 'CONVENIO'
          : activeTab === 'FORNECEDOR'
          ? item.origin === 'FORNECEDOR'
          : item.direction === activeTab

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'OVERDUE'
          ? item.status === 'OVERDUE'
          : statusFilter === 'PENDING'
          ? item.status === 'PENDING' || item.status === 'OVERDUE'
          : item.status === statusFilter

      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchLower) ||
        item.entityName.toLowerCase().includes(searchLower) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(searchLower))

      return matchTab && matchStatus && matchSearch
    })
  }, [titles, activeTab, statusFilter, searchTerm, userRole, currentUserId])

  // KPIs Dinâmicos de Acordo com a Aba Ativa
  const dynamicKpis = useMemo(() => {
    let card1Title = 'TOTAL A RECEBER (PLANOS)'
    let card1Val = 0
    let card1Desc = 'Parcelas de tratamentos a compensar'
    let card1Color = styles.blueIcon

    let card2Title = 'TOTAL A PAGAR'
    let card2Val = 0
    let card2Desc = 'Boletos de fornecedores e fixos'
    let card2Color = styles.redIcon

    let card3Title = 'SALDO PREVISTO'
    let card3Val = 0
    let card3Desc = 'Caixa projetado após compensações'
    let card3Color = styles.greenIcon

    let card4Title = 'TÍTULOS EM ATRASO'
    let card4Val = 0
    let card4Desc = 'Contas ou parcelas vencidas'
    let card4Color = styles.yellowIcon

    const scopeTitles = titles.filter((item) => {
      if (userRole === 'DENTIST' && item.dentistId && item.dentistId !== currentUserId) return false
      if (activeTab === 'ALL') return true
      if (activeTab === 'CONVENIO') return item.origin === 'CONVENIO'
      if (activeTab === 'FORNECEDOR') return item.origin === 'FORNECEDOR'
      return item.direction === activeTab
    })

    if (activeTab === 'RECEIVABLE') {
      let totalPendente = 0
      let totalAtraso = 0
      let recebidoTotal = 0

      scopeTitles.forEach((t) => {
        if (t.status === 'PENDING') totalPendente += t.amount
        if (t.status === 'OVERDUE') totalAtraso += t.amount
        if (t.status === 'PAID') recebidoTotal += t.amount
      })

      card1Title = 'PARCELAS EM ABERTO'
      card1Val = totalPendente
      card1Desc = 'Aguardando vencimento do paciente'

      card2Title = 'INADIMPLÊNCIA TOTAL'
      card2Val = totalAtraso
      card2Desc = 'Parcelas vencidas sem quitação'

      card3Title = 'TOTAL BAIXADO'
      card3Val = recebidoTotal
      card3Desc = 'Quitado diretamente no DRE'

      card4Title = 'TICKET MÉDIO'
      card4Val = scopeTitles.length > 0 ? (totalPendente + totalAtraso + recebidoTotal) / scopeTitles.length : 0
      card4Desc = 'Valor médio por parcela de plano'
      card4Color = styles.blueIcon
    } else if (activeTab === 'PAYABLE') {
      let aPagar = 0
      let pago = 0
      let emAtraso = 0

      scopeTitles.forEach((t) => {
        if (t.status === 'PENDING') aPagar += t.amount
        if (t.status === 'OVERDUE') emAtraso += t.amount
        if (t.status === 'PAID') pago += t.amount
      })

      card1Title = 'CONTAS A VENCER'
      card1Val = aPagar
      card1Desc = 'Contas programadas do período'

      card2Title = 'CONTAS EM ATRASO'
      card2Val = emAtraso
      card2Desc = 'Boletos ou dívidas expiradas'

      card3Title = 'TOTAL PAGO'
      card3Val = pago
      card3Desc = 'Despesas liquidadas no caixa'

      card4Title = 'TOTAL COMPROMETIDO'
      card4Val = aPagar + emAtraso
      card4Desc = 'Volume a liquidar no período'
      card4Color = styles.redIcon
    } else if (activeTab === 'CONVENIO') {
      let lotesAbertos = 0
      let lotesLiquidados = 0
      let lotesAtraso = 0

      scopeTitles.forEach((t) => {
        if (t.status === 'PENDING') lotesAbertos += t.amount
        if (t.status === 'OVERDUE') lotesAtraso += t.amount
        if (t.status === 'PAID') lotesLiquidados += t.amount
      })

      card1Title = 'REPASSE PREVISTO TISS'
      card1Val = lotesAbertos
      card1Desc = 'Faturamento de guias em aberto'
      card1Color = styles.purpleIcon

      card2Title = 'FATURAS EM ATRASO'
      card2Val = lotesAtraso
      card2Desc = 'Operadoras com repasse expirado'

      card3Title = 'REPASSE RECEBIDO'
      card3Val = lotesLiquidados
      card3Desc = 'Valores repassados em conta'

      card4Title = 'VOLUME TOTAL CONVÊNIOS'
      card4Val = lotesAbertos + lotesLiquidados + lotesAtraso
      card4Desc = 'Produção geral via operadoras'
      card4Color = styles.blueIcon
    } else if (activeTab === 'FORNECEDOR') {
      let insumosAbertos = 0
      let insumosPagos = 0
      let insumosAtraso = 0

      scopeTitles.forEach((t) => {
        if (t.status === 'PENDING') insumosAbertos += t.amount
        if (t.status === 'OVERDUE') insumosAtraso += t.amount
        if (t.status === 'PAID') insumosPagos += t.amount
      })

      card1Title = 'BOLETOS DE DENTAIS'
      card1Val = insumosAbertos
      card1Desc = 'Compras a prazo de materiais'
      card1Color = styles.blueIcon

      card2Title = 'BOLETOS EM ATRASO'
      card2Val = insumosAtraso
      card2Desc = 'Insumos com prazo estourado'

      card3Title = 'PAGO A FORNECEDORES'
      card3Val = insumosPagos
      card3Desc = 'Quitado em estoque no período'

      card4Title = 'TOTAL COMPRAS'
      card4Val = insumosAbertos + insumosPagos + insumosAtraso
      card4Desc = 'Volume total adquirido'
      card4Color = styles.redIcon
    } else {
      let totalAReceber = 0
      let totalAPagar = 0
      let totalAtrasado = 0

      titles.forEach((t) => {
        const isPending = t.status === 'PENDING' || t.status === 'OVERDUE'
        if (isPending) {
          if (t.direction === 'RECEIVABLE') totalAReceber += t.amount
          if (t.direction === 'PAYABLE') totalAPagar += t.amount
          if (t.status === 'OVERDUE') totalAtrasado += t.amount
        }
      })

      card1Val = totalAReceber
      card2Val = totalAPagar
      card3Val = totalAReceber - totalAPagar
      card4Val = totalAtrasado
    }

    return {
      card1: { title: card1Title, value: card1Val, desc: card1Desc, colorClass: card1Color },
      card2: { title: card2Title, value: card2Val, desc: card2Desc, colorClass: card2Color },
      card3: { title: card3Title, value: card3Val, desc: card3Desc, colorClass: card3Color },
      card4: { title: card4Title, value: card4Val, desc: card4Desc, colorClass: card4Color },
    }
  }, [titles, activeTab, userRole, currentUserId])

  // Gráfico Recharts Adaptável e Balanceado
  const dynamicChartConfig = useMemo(() => {
    const scopeTitles = titles.filter((item) => {
      if (userRole === 'DENTIST' && item.dentistId && item.dentistId !== currentUserId) return false
      if (activeTab === 'ALL') return true
      if (activeTab === 'CONVENIO') return item.origin === 'CONVENIO'
      if (activeTab === 'FORNECEDOR') return item.origin === 'FORNECEDOR'
      return item.direction === activeTab
    })

    const map = new Map<string, any>()

    scopeTitles.forEach((t) => {
      const d = new Date(t.dueDate)
      const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`

      if (activeTab === 'RECEIVABLE') {
        const prev = map.get(key) || { label: key, recebido: 0, aVencer: 0, atrasado: 0 }
        if (t.status === 'PAID') prev.recebido += t.amount
        else if (t.status === 'OVERDUE') prev.atrasado += t.amount
        else prev.aVencer += t.amount
        map.set(key, prev)
      } else if (activeTab === 'PAYABLE' || activeTab === 'FORNECEDOR') {
        const prev = map.get(key) || { label: key, pago: 0, aPagar: 0, vencido: 0 }
        if (t.status === 'PAID') prev.pago += t.amount
        else if (t.status === 'OVERDUE') prev.vencido += t.amount
        else prev.aPagar += t.amount
        map.set(key, prev)
      } else if (activeTab === 'CONVENIO') {
        const prev = map.get(key) || { label: key, repassado: 0, previsto: 0, atrasado: 0 }
        if (t.status === 'PAID') prev.repassado += t.amount
        else if (t.status === 'OVERDUE') prev.atrasado += t.amount
        else prev.previsto += t.amount
        map.set(key, prev)
      } else {
        const prev = map.get(key) || { label: key, realizado: 0, entradas: 0, saidas: 0 }
        if (t.status === 'PAID') {
          prev.realizado += t.amount
        } else {
          if (t.direction === 'RECEIVABLE') prev.entradas += t.amount
          else prev.saidas += t.amount
        }
        map.set(key, prev)
      }
    })

    const data = Array.from(map.values()).slice(-6)

    let title = 'Comparativo de Fluxo: Entradas Previstas x Saídas Previstas x Realizado'
    let subtitle = 'Projeção consolidada de tesouraria por mês de competência.'

    if (activeTab === 'RECEIVABLE') {
      title = 'Curva de Parcelas de Planos: Recebidas x A Vencer x Inadimplência'
      subtitle = 'Comportamento financeiro exclusivo de planos de tratamento odontológico.'
    } else if (activeTab === 'PAYABLE') {
      title = 'Cronograma de Despesas: Pagas x A Pagar x Atrasadas'
      subtitle = 'Distribuição das contas operacionais e compras de materiais odontológicos.'
    } else if (activeTab === 'CONVENIO') {
      title = 'Faturamento de Operadoras: Repassado x Previsto x Em Atraso'
      subtitle = 'Previsão de compensação e liquidação de lotes de guias odontológicas.'
    } else if (activeTab === 'FORNECEDOR') {
      title = 'Contas de Fornecedores Dentais: Quitado x Boletos em Aberto'
      subtitle = 'Histórico e vencimentos com fornecedores de insumos (Dental Cremer, etc.).'
    }

    return { data, title, subtitle }
  }, [titles, activeTab, userRole, currentUserId])

  // Paginação
  const totalItems = filteredList.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  function handleOpenSettleSingle(item: FinancialTitleItem) {
    setSelectedTitle(item)
    setBatchToSettle([item])
    setSettleDiscount(0)
    setSettlePenalty(0)
    setSettleNotes('')
    setSettleError('')
    setSettleMethod(item.origin === 'CONVENIO' ? 'TRANSFERENCIA' : 'PIX')
    setSettleModalOpen(true)
  }

  function handleOpenSettleBatch() {
    const items = titles.filter((t) => selectedIds.includes(t.id) && t.status !== 'PAID')
    if (items.length === 0) return

    setSelectedTitle(null)
    setBatchToSettle(items)
    setSettleDiscount(0)
    setSettlePenalty(0)
    setSettleNotes(`Liquidação em Lote de ${items.length} títulos financeiros.`)
    setSettleError('')
    setSettleMethod(items[0]?.origin === 'CONVENIO' ? 'TRANSFERENCIA' : 'PIX')
    setSettleModalOpen(true)
  }

  function handleOpenDetails(item: FinancialTitleItem) {
    setSelectedTitle(item)
    setDetailModalOpen(true)
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleSelectAllVisible() {
    const visiblePendingIds = paginatedList.filter((t) => t.status !== 'PAID').map((t) => t.id)
    const allSelected = visiblePendingIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visiblePendingIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visiblePendingIds])))
    }
  }

  // Baixa Financeira Unificada
  async function handleConfirmSettle(e: React.FormEvent) {
    e.preventDefault()
    if (batchToSettle.length === 0) return

    setSubmittingSettle(true)
    setSettleError('')

    try {
      const isBatch = batchToSettle.length > 1
      const totalRaw = batchToSettle.reduce((acc, cur) => acc + cur.amount, 0)
      const finalPaidAmount = totalRaw - settleDiscount + settlePenalty

      await Promise.all(
        batchToSettle.map((item) =>
          api.post('/transactions', {
            type: item.direction === 'RECEIVABLE' ? 'RECEITA' : 'DESPESA',
            category: item.category,
            costCenter: item.costCenter || 'Geral',
            description: `Liquidação: ${item.title} (${item.entityName})`,
            amount: isBatch ? item.amount : finalPaidAmount,
            paymentMethod: settleMethod,
            treatmentPlanId: item.treatmentPlanId || undefined,
            accountReceivableId: item.direction === 'RECEIVABLE' ? item.id : undefined,
            date: new Date(`${settleDate}T12:00:00.000Z`).toISOString(),
            notes: settleNotes.trim() || undefined,
          }).catch(async () => {
            await api.patch(`/transactions/${item.id}/reconcile`).catch(() => {})
          })
        )
      )

      const settledIds = batchToSettle.map((b) => b.id)
      setTitles((prev) =>
        prev.map((t) =>
          settledIds.includes(t.id)
            ? { ...t, status: 'PAID', paidAt: new Date().toISOString(), paymentMethod: settleMethod }
            : t
        )
      )

      setSelectedIds((prev) => prev.filter((id) => !settledIds.includes(id)))
      setSettleModalOpen(false)
      setBatchToSettle([])
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao registrar a baixa dos títulos.'
      setSettleError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSubmittingSettle(false)
    }
  }

  // Cadastro de Nova Despesa Operacional / Fornecedor
  async function handleCreatePayable(e: React.FormEvent) {
    e.preventDefault()
    if (!newPayableDesc || !newPayableAmount) return

    setCreatingPayable(true)
    try {
      const payload = {
        type: 'DESPESA',
        category: newPayableCategory,
        costCenter: newPayableCostCenter,
        description: newPayableDesc,
        amount: Number(newPayableAmount),
        paymentMethod: newPayableMethod,
        supplierId: newSupplierId || undefined,
        date: new Date(`${newPayableDueDate}T12:00:00.000Z`).toISOString(),
        isRecurring,
      }

      await api.post('/transactions', payload)
      setNewPayableModalOpen(false)
      setNewPayableDesc('')
      setNewPayableAmount('')
      setNewSupplierId('')
      loadFinancialTitles()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao lançar conta a pagar.')
    } finally {
      setCreatingPayable(false)
    }
  }

  const batchTotalAmount = batchToSettle.reduce((acc, cur) => acc + cur.amount, 0)
  const batchFinalAmount = batchTotalAmount - settleDiscount + settlePenalty
  const isPayableBatch = batchToSettle[0]?.direction === 'PAYABLE'

  return (
    <div className={styles.page}>
      
      {/* ─── Topo de Módulo ─── */}
      <div className={styles.topBarRow}>
        <div className={styles.badgeSection}>
          <span className={styles.moduleBadge}>TESOURARIA & GESTÃO DE TÍTULOS</span>
          <span className={styles.moduleDesc}>
            Controle de parcelas de planos de tratamento, faturamento de convênios e contas a pagar
          </span>
        </div>

        <div className={styles.topActions}>
          {selectedIds.length > 0 && userRole !== 'DENTIST' && (
            <button
              type="button"
              onClick={handleOpenSettleBatch}
              className={styles.btnBatchLiquidate}
            >
              <CheckCircle2 size={14} />
              <span>Liquidar Lote ({selectedIds.length})</span>
            </button>
          )}

          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setNewPayableModalOpen(true)}
              className={styles.btnNewPayable}
            >
              <Plus size={14} />
              <span>Lançar Conta a Pagar</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadFinancialTitles}
            className={styles.btnSecondaryAction}
            title="Atualizar títulos"
          >
            <RefreshCw size={14} className={loading ? styles.spinner : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── Cards de KPI Dinâmicos por Aba ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>{dynamicKpis.card1.title}</span>
            <div className={`${styles.iconWrap} ${dynamicKpis.card1.colorClass}`}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className={styles.kpiAmount}>{formatCurrency(dynamicKpis.card1.value)}</div>
          <span className={styles.kpiFooter}>{dynamicKpis.card1.desc}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>{dynamicKpis.card2.title}</span>
            <div className={`${styles.iconWrap} ${dynamicKpis.card2.colorClass}`}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${styles.dangerText}`}>
            {formatCurrency(dynamicKpis.card2.value)}
          </div>
          <span className={styles.kpiFooter}>{dynamicKpis.card2.desc}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>{dynamicKpis.card3.title}</span>
            <div className={`${styles.iconWrap} ${dynamicKpis.card3.colorClass}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${dynamicKpis.card3.value >= 0 ? styles.successText : styles.dangerText}`}>
            {formatCurrency(dynamicKpis.card3.value)}
          </div>
          <span className={styles.kpiFooter}>{dynamicKpis.card3.desc}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>{dynamicKpis.card4.title}</span>
            <div className={`${styles.iconWrap} ${dynamicKpis.card4.colorClass}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${styles.warningText}`}>
            {formatCurrency(dynamicKpis.card4.value)}
          </div>
          <span className={styles.kpiFooter}>{dynamicKpis.card4.desc}</span>
        </div>
      </div>

      {/* ─── Gráfico Recharts Adaptável e Inteligente ─── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>{dynamicChartConfig.title}</h3>
            <p className={styles.chartSubtitle}>{dynamicChartConfig.subtitle}</p>
          </div>
          <span className={styles.chartTag}>Visão: {activeTab}</span>
        </div>

        <div className={styles.chartWrapper}>
          {dynamicChartConfig.data.length === 0 ? (
            <div className={styles.emptyChart}>
              <Clock size={32} color="#94a3b8" />
              <span>Nenhum lançamento previsto para este filtro no período.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dynamicChartConfig.data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip content={<CustomFinancialTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />

                {activeTab === 'RECEIVABLE' && (
                  <>
                    <Bar dataKey="recebido" name="Recebido / Baixado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="aVencer" name="A Vencer" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="atrasado" name="Inadimplente (Atrasado)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                  </>
                )}

                {(activeTab === 'PAYABLE' || activeTab === 'FORNECEDOR') && (
                  <>
                    <Bar dataKey="pago" name="Pago / Liquidado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="aPagar" name="A Pagar" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="vencido" name="Vencido / Em Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                  </>
                )}

                {activeTab === 'CONVENIO' && (
                  <>
                    <Bar dataKey="repassado" name="Repasse Liquidado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="previsto" name="Faturamento Previsto" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="atrasado" name="Faturas em Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                  </>
                )}

                {activeTab === 'ALL' && (
                  <>
                    <Bar dataKey="realizado" name="Total Realizado (Baixado)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="entradas" name="Entradas Previstas (Receber)" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="saidas" name="Saídas Previstas (Pagar)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Navegação de Abas do Módulo ─── */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
          className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
        >
          <DollarSign size={15} />
          <span>Todos os Títulos ({titles.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('RECEIVABLE'); setCurrentPage(1); }}
          className={`${styles.tabBtn} ${activeTab === 'RECEIVABLE' ? styles.tabBtnActive : ''}`}
        >
          <ArrowDownLeft size={15} />
          <span>Contas a Receber (Planos)</span>
        </button>
        {userRole === 'ADMIN' && (
          <>
            <button
              type="button"
              onClick={() => { setActiveTab('PAYABLE'); setCurrentPage(1); }}
              className={`${styles.tabBtn} ${activeTab === 'PAYABLE' ? styles.tabBtnActive : ''}`}
            >
              <ArrowUpRight size={15} />
              <span>Contas a Pagar</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('CONVENIO'); setCurrentPage(1); }}
              className={`${styles.tabBtn} ${activeTab === 'CONVENIO' ? styles.tabBtnActive : ''}`}
            >
              <Building2 size={15} />
              <span>Lotes de Convênio</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('FORNECEDOR'); setCurrentPage(1); }}
              className={`${styles.tabBtn} ${activeTab === 'FORNECEDOR' ? styles.tabBtnActive : ''}`}
            >
              <Truck size={15} />
              <span>Fornecedores Dentais</span>
            </button>
          </>
        )}
      </div>

      {/* ─── Barra de Filtros Integrada ─── */}
      <div className={styles.filterBar}>
        <div className={styles.filterTitleRow}>
          <h3 className={styles.tableSectionTitle}>Extrato Consolidado de Títulos</h3>
          <span className={styles.badgeTotalCount}>{totalItems} títulos</span>
        </div>

        <div className={styles.filterControlsGroup}>
          <div className={styles.searchWrap}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar por descrição, paciente, fornecedor ou lote..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.statusButtonGroup}>
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'ALL' ? styles.statusToggleActive : ''}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'PENDING' ? styles.statusToggleActive : ''}`}
            >
              A Vencer
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('OVERDUE'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'OVERDUE' ? styles.statusToggleActiveDanger : ''}`}
            >
              Em Atraso
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('PAID'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'PAID' ? styles.statusToggleActive : ''}`}
            >
              Baixados
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabela ─── */}
      <div className={styles.tableCard}>
        {filteredList.length === 0 ? (
          <div className={styles.emptyTable}>
            <DollarSign size={32} color="#94a3b8" />
            <p>Nenhum título pendente de liquidação ou baixa para os filtros selecionados.</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {userRole === 'ADMIN' && (
                    <th style={{ width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        onChange={toggleSelectAllVisible}
                        checked={
                          paginatedList.filter((t) => t.status !== 'PAID').length > 0 &&
                          paginatedList
                            .filter((t) => t.status !== 'PAID')
                            .every((t) => selectedIds.includes(t.id))
                        }
                      />
                    </th>
                  )}
                  <th>FLUXO</th>
                  <th>STATUS</th>
                  <th>BENEFICIÁRIO / FORNECEDOR</th>
                  <th>DESCRIÇÃO / VÍNCULO</th>
                  <th>CATEGORIA</th>
                  <th>VENCIMENTO</th>
                  <th>VALOR</th>
                  <th style={{ textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((item) => {
                  const isPaid = item.status === 'PAID'
                  const isOverdue = item.status === 'OVERDUE'
                  const isReceivable = item.direction === 'RECEIVABLE'
                  const isSelected = selectedIds.includes(item.id)

                  return (
                    <tr key={item.id} className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ''}`}>
                      {userRole === 'ADMIN' && (
                        <td style={{ textAlign: 'center' }}>
                          {!isPaid ? (
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.id)}
                            />
                          ) : (
                            <span style={{ opacity: 0.3 }}>—</span>
                          )}
                        </td>
                      )}
                      <td>
                        <span className={isReceivable ? styles.flowBadgeReceita : styles.flowBadgeDespesa}>
                          {isReceivable ? 'Receber' : 'Pagar'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            isPaid
                              ? styles.statusPaid
                              : isOverdue
                              ? styles.statusOverdue
                              : styles.statusPending
                          }`}
                        >
                          {isPaid ? 'Liquidado' : isOverdue ? 'Em Atraso' : 'A Vencer'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.patientInfoCol}>
                          <strong className={styles.patientCell}>{String(item.entityName)}</strong>
                          {item.origin === 'CONVENIO' && <small className={styles.subTagPurple}>Convênio Odontológico</small>}
                          {item.origin === 'FORNECEDOR' && <small className={styles.subTagOrange}>Fornecedor Dental</small>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.titleInfoCol}>
                          <span>{String(item.title)}</span>
                          {item.batchNumber && <small className={styles.batchTag}>{item.batchNumber}</small>}
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryCell}>{String(item.category)}</span>
                      </td>
                      <td>
                        <span className={`${styles.dateCell} ${isOverdue ? styles.dateOverdue : ''}`}>
                          {formatDate(item.dueDate)}
                        </span>
                      </td>
                      <td className={styles.moneyCell}>
                        <span className={isReceivable ? styles.moneyPlus : styles.moneyMinus}>
                          {isReceivable ? '+ ' : '- '}{formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionButtonsWrap}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item)}
                            className={styles.btnActionIcon}
                            title="Ver detalhes"
                          >
                            <Eye size={14} />
                          </button>

                          {!isPaid && userRole === 'ADMIN' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSettleSingle(item)}
                              className={isReceivable ? styles.btnSettleReceivable : styles.btnSettlePayable}
                            >
                              <CheckCircle2 size={13} />
                              <span>{isReceivable ? 'Baixar' : 'Pagar'}</span>
                            </button>
                          ) : isPaid ? (
                            <span className={styles.doneLabel}>Quitado</span>
                          ) : (
                            <span className={styles.disabledAction}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Paginação ─── */}
        <div className={styles.paginationFooter}>
          <div className={styles.paginationInfo}>
            Exibindo <strong>{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a{' '}
            <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> de{' '}
            <strong>{totalItems}</strong> lançamentos ({pageSize} por folha)
          </div>

          <div className={styles.paginationControls}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className={styles.pageBtn}
              title="Primeira página"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={styles.pageBtn}
              title="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                Math.abs(pageNumber - currentPage) <= 1
              ) {
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`${styles.pageBtn} ${
                      currentPage === pageNumber ? styles.pageBtnActive : ''
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              }
              return null
            })}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={styles.pageBtn}
              title="Próxima página"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(totalPages)}
              className={styles.pageBtn}
              title="Última página"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal de Liquidação / Baixa ─── */}
      {settleModalOpen && (
        <div className={styles.overlay} onClick={() => setSettleModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <div className={isPayableBatch ? styles.modalHeaderIconDanger : styles.modalHeaderIconSuccess}>
                  {isPayableBatch ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div>
                  <h2 className={styles.modalTitle}>
                    {batchToSettle.length > 1
                      ? `Liquidação em Lote (${batchToSettle.length} Títulos)`
                      : isPayableBatch ? 'Liquidação de Conta a Pagar' : 'Baixa de Parcela de Plano'}
                  </h2>
                  <p className={styles.modalSubtitle}>
                    Registro de movimentação financeira e conciliação direta no DRE contábil
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.receivableCard}>
              <div className={styles.receivableMetaRow}>
                <div>
                  <span className={styles.metaLabel}>{isPayableBatch ? 'CREDOR / FORNECEDOR' : 'PACIENTE / TITULAR'}</span>
                  <strong className={styles.metaValue}>
                    {batchToSettle.length > 1
                      ? `${batchToSettle.length} Lançamentos Selecionados`
                      : String(batchToSettle[0]?.entityName)}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.metaLabel}>NATUREZA</span>
                  <span className={isPayableBatch ? styles.flowBadgeDespesa : styles.flowBadgeReceita}>
                    {isPayableBatch ? 'Saída de Caixa (Despesa)' : 'Entrada de Caixa (Receita)'}
                  </span>
                </div>
              </div>

              <div className={styles.receivableMetaRow} style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <div>
                  <span className={styles.metaLabel}>VALOR BASE</span>
                  <span className={styles.subText}>{formatCurrency(batchTotalAmount)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.metaLabel}>TOTAL FINAL DA OPERAÇÃO</span>
                  <strong className={isPayableBatch ? styles.priceHighlightDanger : styles.priceHighlightSuccess}>
                    {formatCurrency(batchFinalAmount)}
                  </strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmSettle} className={styles.settleForm}>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <CreditCard size={14} />
                    <span>Meio de Pagamento</span>
                  </label>
                  <select
                    className={styles.select}
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    required
                  >
                    <option value="PIX">Pix Instantâneo</option>
                    <option value="TRANSFERENCIA">Transferência Bancária / TED</option>
                    <option value="BOLETO">Boleto Compensado</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <Calendar size={14} />
                    <span>Data da Baixa</span>
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Desconto Obtido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={settleDiscount}
                    onChange={(e) => setSettleDiscount(Number(e.target.value))}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Juros / Multa de Atraso (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={settlePenalty}
                    onChange={(e) => setSettlePenalty(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Observações do Comprovante</label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Ex: Baixa de parcela registrada no balcão da clínica."
                />
              </div>

              {settleError && (
                <div className={styles.errorBox}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{settleError}</span>
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className={styles.btnCancel}
                  disabled={submittingSettle}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submittingSettle}
                  className={isPayableBatch ? styles.btnSubmitDanger : styles.btnSubmit}
                >
                  {submittingSettle ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirmar Baixa ({formatCurrency(batchFinalAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal de Lançar Despesa Operacional ─── */}
      {newPayableModalOpen && (
        <div className={styles.overlay} onClick={() => setNewPayableModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <div className={styles.modalHeaderIconDanger}>
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <h2 className={styles.modalTitle}>Lançar Despesa Operacional</h2>
                  <p className={styles.modalSubtitle}>
                    Programação de conta a pagar ou boleto de fornecedor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewPayableModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className={styles.settleForm} style={{ marginTop: '16px' }}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Fornecedor Vinculado (Opcional)</label>
                <select
                  className={styles.select}
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value)}
                >
                  <option value="">Nenhum (Despesa interna / avulsa)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Descrição do Lançamento*</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Ex: Compra Dental Cremer ou Aluguel Sala Comercial"
                  value={newPayableDesc}
                  onChange={(e) => setNewPayableDesc(e.target.value)}
                />
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Valor (R$)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={styles.input}
                    placeholder="Ex: 550.00"
                    value={newPayableAmount}
                    onChange={(e) => setNewPayableAmount(Number(e.target.value))}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Forma de Pagamento*</label>
                  <select
                    className={styles.select}
                    value={newPayableMethod}
                    onChange={(e) => setNewPayableMethod(e.target.value)}
                  >
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="PIX">Pix</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Categoria Contábil*</label>
                  <select
                    className={styles.select}
                    value={newPayableCategory}
                    onChange={(e) => setNewPayableCategory(e.target.value)}
                  >
                    <option value="Insumos & Dental">Insumos & Dental</option>
                    <option value="Aluguel & Condomínio">Aluguel & Condomínio</option>
                    <option value="Software & Marketing">Software & Marketing</option>
                    <option value="Folha & Pró-labore">Folha & Pró-labore</option>
                    <option value="Manutenção de Equipamentos">Manutenção de Equipamentos</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Centro de Custo*</label>
                  <select
                    className={styles.select}
                    value={newPayableCostCenter}
                    onChange={(e) => setNewPayableCostCenter(e.target.value)}
                  >
                    <option value="Atendimento Clínico">Atendimento Clínico</option>
                    <option value="Geral / Estrutural">Geral / Estrutural</option>
                    <option value="Recepção & Administrativo">Recepção & Administrativo</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Data de Vencimento*</label>
                <input
                  type="date"
                  required
                  className={styles.input}
                  value={newPayableDueDate}
                  onChange={(e) => setNewPayableDueDate(e.target.value)}
                />
              </div>

              <div className={styles.recurringBox}>
                <input
                  type="checkbox"
                  id="recurrentCheck"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="recurrentCheck" className={styles.recurringLabel}>
                  <strong>Dívida Fixa / Despesa Recorrente Mensal</strong>
                  <span>Programada todo mês (Ex: Aluguel R$ 800, OdontoFlow R$ 159,99)</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setNewPayableModalOpen(false)}
                  className={styles.btnCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPayable}
                  className={styles.btnSubmitDanger}
                >
                  {creatingPayable ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Salvar Despesa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal de Detalhes ─── */}
      {detailModalOpen && selectedTitle && (
        <div className={styles.overlay} onClick={() => setDetailModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <div className={styles.modalHeaderIconSuccess}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className={styles.modalTitle}>Detalhamento do Registro Financeiro</h2>
                  <p className={styles.modalSubtitle}>ID: #{selectedTitle.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.detailsModalBody}>
              <div className={styles.detailSection}>
                <div className={styles.detailGrid2}>
                  <div>
                    <span className={styles.metaLabel}>TITULAR / ENTIDADE</span>
                    <strong>{String(selectedTitle.entityName)}</strong>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>FLUXO CONTÁBIL</span>
                    <strong className={selectedTitle.direction === 'RECEIVABLE' ? styles.successText : styles.dangerText}>
                      {selectedTitle.direction === 'RECEIVABLE' ? 'Conta a Receber (Receita)' : 'Conta a Pagar (Despesa)'}
                    </strong>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>CATEGORIA</span>
                    <span>{String(selectedTitle.category)}</span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>CENTRO DE CUSTO</span>
                    <span>{String(selectedTitle.costCenter || 'Geral')}</span>
                  </div>
                  {selectedTitle.entityCnpj && (
                    <div>
                      <span className={styles.metaLabel}>CNPJ FORNECEDOR</span>
                      <span>{selectedTitle.entityCnpj}</span>
                    </div>
                  )}
                  {selectedTitle.batchNumber && (
                    <div>
                      <span className={styles.metaLabel}>LOTE / GUIA</span>
                      <strong className={styles.batchTag}>{selectedTitle.batchNumber}</strong>
                    </div>
                  )}
                </div>
              </div>

              {selectedTitle.treatmentPlanTitle && (
                <div className={styles.detailSection}>
                  <div className={styles.planInfoCard}>
                    <span className={styles.metaLabel}>PLANO DE TRATAMENTO VINCULADO</span>
                    <strong>{selectedTitle.treatmentPlanTitle}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className={styles.btnCancel}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}