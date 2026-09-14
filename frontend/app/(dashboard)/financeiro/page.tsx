'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Loader2, 
  BarChart3,
  X,
  Building,
  Trash2,
  CheckCircle2,
  CircleDashed,
  PieChart,
  Layers,
  Calendar,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import api from '@/lib/api'
import styles from './financeiro.module.css'

interface Transaction {
  id: string
  type: 'RECEITA' | 'DESPESA'
  amount: number
  paymentMethod: string
  category?: string | null
  costCenter?: string | null
  isReconciled?: boolean
  isRecurring?: boolean
  recurrenceDay?: number | null
  description?: string | null
  supplierId?: string | null
  paidAt: string
  supplier?: { id: string; name: string } | null
  appointment?: { id: string; patient: { name: string } } | null
}

interface Supplier {
  id: string
  name: string
  cnpj?: string
  contact?: string
}

interface TreatmentPlan {
  id: string
  title: string
  totalAmount: number
  status: string
  patient: { name: string }
}

interface ClinicCustomization {
  primaryColor: string
  accentColor: string
  secondaryColor?: string | null
  fontFamily: string
}

interface MetaPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const EXPENSE_CATEGORIES = [
  'Insumos & Dental',
  'Aluguel & Condomínio',
  'Folha & Pró-labore',
  'Energia & Água',
  'Software & Marketing',
  'Manutenção & Outros'
]

const INCOME_CATEGORIES = [
  'Consulta / Procedimento',
  'Plano de Tratamento',
  'Ortodontia (Mensalidade)',
  'Outras Receitas'
]

const COST_CENTERS = [
  'Atendimento Clínico',
  'Recepção & Administrativo',
  'Marketing & Comercial',
  'Geral / Estrutural'
]

function normalizePaymentMethod(method: string): string {
  const m = (method || '').toUpperCase()
  if (m.includes('PIX')) return 'PIX'
  if (m.includes('CREDIT') || m.includes('CRÉDITO') || m.includes('CREDITO')) return 'CREDIT_CARD'
  if (m.includes('DEBIT') || m.includes('DÉBITO') || m.includes('DEBITO')) return 'DEBIT_CARD'
  if (m.includes('DINHEIRO') || m.includes('CASH')) return 'CASH'
  if (m.includes('CONVENIO') || m.includes('CONVÊNIO')) return 'CONVENIO'
  return 'OUTROS'
}

function getMethodLabel(methodKey: string): string {
  const map: Record<string, string> = {
    PIX: 'Pix',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    CASH: 'Dinheiro',
    CONVENIO: 'Convênio Odontológico',
    OUTROS: 'Outros'
  }
  return map[methodKey] || methodKey
}

function parseInputValue(raw: string | number): number {
  if (typeof raw === 'number') return raw
  const str = String(raw).trim()
  if (!str) return 0

  if (str.includes(',')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned)
  }

  return parseFloat(str)
}

export default function FinanceiroPage() {
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [activeTab, setActiveTab] = useState<'caixa' | 'dre' | 'planos'>('caixa')
  const [loading, setLoading] = useState(true)

  // Meta vindo do Backend
  const [meta, setMeta] = useState<MetaPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  })

  // White-label
  const [customization, setCustomization] = useState<ClinicCustomization>({
    primaryColor: '#06b6d4',
    accentColor: '#0891b2',
    secondaryColor: '#0f172a',
    fontFamily: 'Inter'
  })

  // Filtros Caixa
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL')
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL')
  const [selectedCostCenterFilter, setSelectedCostCenterFilter] = useState<string>('ALL')

  // Página atual do backend
  const [page, setPage] = useState<number>(1)

  // Filtro DRE
  const [drePeriod, setDrePeriod] = useState<'ALL' | 'CURRENT_MONTH' | 'LAST_MONTH'>('ALL')

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'RECEITA' | 'DESPESA'>('DESPESA')
  const [saving, setSaving] = useState(false)

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierCnpj, setNewSupplierCnpj] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')

  // Form Fields de Transação
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [costCenter, setCostCenter] = useState(COST_CENTERS[0])
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  // Recorrência (Dívidas Fixas)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('5')

  useEffect(() => {
    const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch (e) {}
    }
    loadAuxiliaryData()
  }, [])

  // Carrega fornecedores, planos e personalização da clínica
  async function loadAuxiliaryData() {
    try {
      const [plansRes, suppliersRes, clinicsRes] = await Promise.all([
        api.get('/treatment-plans').catch(() => ({ data: [] })),
        api.get('/suppliers').catch(() => ({ data: [] })),
        api.get('/clinics').catch(() => ({ data: [] }))
      ])

      const plansData = Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.data || []
      const suppliersData = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data?.data || []

      setPlans(plansData)
      setSuppliers(suppliersData)

      const clinicList = Array.isArray(clinicsRes.data) ? clinicsRes.data : clinicsRes.data?.data || []
      const currentClinic = clinicList[0]
      if (currentClinic?.id) {
        const customRes = await api.get(`/clinics/${currentClinic.id}/customization`).catch(() => null)
        if (customRes?.data?.primaryColor) {
          setCustomization(customRes.data)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err)
    }
  }

  // Busca transações paginadas do backend
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)

      const params: Record<string, any> = {
        page,
        limit: 20
      }

      if (typeFilter !== 'ALL') {
        params.type = typeFilter
      }
      if (selectedSupplierFilter !== 'ALL') {
        params.supplierId = selectedSupplierFilter
      }
      if (selectedCostCenterFilter !== 'ALL') {
        params.costCenter = selectedCostCenterFilter
      }

      const res = await api.get('/transactions', { params })

      // Suporta { data: [...], meta: { ... } } ou array direto
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      const metaInfo = res.data?.meta || {
        total: list.length,
        page,
        limit: 20,
        totalPages: Math.ceil(list.length / 20) || 1
      }

      setTransactions(list)
      setMeta(metaInfo)
    } catch (err) {
      console.error('Erro ao buscar transações paginadas:', err)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, selectedSupplierFilter, selectedCostCenterFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Se trocar filtro, reseta para a Folha 1
  function handleTypeFilterChange(newType: 'ALL' | 'RECEITA' | 'DESPESA') {
    setTypeFilter(newType)
    setPage(1)
  }

  function handleSupplierFilterChange(newSupplier: string) {
    setSelectedSupplierFilter(newSupplier)
    setPage(1)
  }

  function handleCostCenterFilterChange(newCostCenter: string) {
    setSelectedCostCenterFilter(newCostCenter)
    setPage(1)
  }

  function openCreateModal(type: 'RECEITA' | 'DESPESA') {
    setModalType(type)
    setCategory(type === 'DESPESA' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
    setCostCenter(COST_CENTERS[0])
    setDescription('')
    setAmount('')
    setPaymentMethod('PIX')
    setSelectedSupplierId('')
    setIsRecurring(false)
    setRecurrenceDay('5')
    setIsModalOpen(true)
  }

  async function handleToggleReconcile(t: Transaction) {
    try {
      const nextStatus = !t.isReconciled
      await api.patch(`/transactions/${t.id}/reconcile`, { isReconciled: nextStatus })
      setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, isReconciled: nextStatus } : item))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao alterar conciliação.')
    }
  }

  async function handleQuickCreateSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!newSupplierName.trim()) return

    try {
      const res = await api.post('/suppliers', {
        name: newSupplierName,
        cnpj: newSupplierCnpj || undefined,
        contact: newSupplierContact || undefined
      })
      const created = res.data
      setSuppliers(prev => [created, ...prev])
      setSelectedSupplierId(created.id)
      setIsSupplierModalOpen(false)
      setNewSupplierName('')
      setNewSupplierCnpj('')
      setNewSupplierContact('')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar fornecedor.')
    }
  }

  async function handleSaveTransaction(e: React.FormEvent) {
    e.preventDefault()
    
    const numericAmount = parseInputValue(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Informe um valor numérico válido maior que zero.')
      return
    }

    setSaving(true)
    try {
      await api.post('/transactions', {
        type: modalType,
        amount: numericAmount,
        category,
        costCenter,
        isReconciled: true,
        isRecurring: modalType === 'DESPESA' ? isRecurring : false,
        recurrenceDay: modalType === 'DESPESA' && isRecurring ? parseInt(recurrenceDay, 10) : null,
        description,
        paymentMethod,
        supplierId: modalType === 'DESPESA' && selectedSupplierId ? selectedSupplierId : undefined,
        paidAt: new Date().toISOString(),
      })

      setIsModalOpen(false)
      setPage(1)
      fetchTransactions()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cadastrar transação.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!window.confirm('Deseja realmente remover esta transação?')) return
    try {
      await api.delete(`/transactions/${id}`)
      fetchTransactions()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao deletar transação.')
    }
  }

  function formatCurrency(val: number) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Cálculos de KPIs da tela
  const { totalReceitas, totalDespesas, saldoLiquido, ticketMedio } = useMemo(() => {
    let rec = 0
    let desp = 0
    let recCount = 0

    transactions.forEach(t => {
      const val = Number(t.amount) || 0
      if (t.type === 'RECEITA') {
        rec += val
        recCount += 1
      } else {
        desp += val
      }
    })

    return {
      totalReceitas: rec,
      totalDespesas: desp,
      saldoLiquido: rec - desp,
      ticketMedio: recCount > 0 ? rec / recCount : 0
    }
  }, [transactions])

  // DRE Contábil
  const dreReport = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const list = transactions.filter(t => {
      if (drePeriod === 'ALL') return true
      const d = new Date(t.paidAt)
      if (drePeriod === 'CURRENT_MONTH') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }
      if (drePeriod === 'LAST_MONTH') {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear
      }
      return true
    })

    let receitaBruta = 0
    let insumosLab = 0
    let operacionais = 0
    let marketing = 0
    let folhaAdm = 0

    list.forEach(t => {
      const val = Number(t.amount) || 0
      if (t.type === 'RECEITA') {
        receitaBruta += val
      } else {
        const cat = (t.category || '').toLowerCase()
        if (cat.includes('insumo') || cat.includes('dental') || cat.includes('laborat')) {
          insumosLab += val
        } else if (cat.includes('marketing') || cat.includes('software')) {
          marketing += val
        } else if (cat.includes('aluguel') || cat.includes('energia') || cat.includes('água') || cat.includes('manuten')) {
          operacionais += val
        } else {
          folhaAdm += val
        }
      }
    })

    const margemContribuicao = receitaBruta - insumosLab
    const despesasFixas = operacionais + marketing + folhaAdm
    const ebitda = margemContribuicao - despesasFixas

    const calcAv = (val: number) => {
      if (!receitaBruta || receitaBruta === 0) return '0.0%'
      return `${((val / receitaBruta) * 100).toFixed(1)}%`
    }

    return {
      receitaBruta,
      insumosLab,
      margemContribuicao,
      operacionais,
      marketing,
      folhaAdm,
      despesasFixas,
      ebitda,
      margemContribuicaoAv: calcAv(margemContribuicao),
      insumosLabAv: calcAv(insumosLab),
      operacionaisAv: calcAv(operacionais),
      marketingAv: calcAv(marketing),
      folhaAdmAv: calcAv(folhaAdm),
      ebitdaAv: calcAv(ebitda),
    }
  }, [transactions, drePeriod])

  // Gráfico Diário
  const chartTimelineData = useMemo(() => {
    const daysMap = new Map<string, { date: string; formattedDate: string; receitas: number; despesas: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      const [, m, day] = dateKey.split('-')
      daysMap.set(dateKey, { date: dateKey, formattedDate: `${day}/${m}`, receitas: 0, despesas: 0 })
    }

    transactions.forEach(t => {
      const key = t.paidAt.slice(0, 10)
      if (daysMap.has(key)) {
        const entry = daysMap.get(key)!
        if (t.type === 'RECEITA') {
          entry.receitas += Number(t.amount) || 0
        } else {
          entry.despesas += Number(t.amount) || 0
        }
      }
    })

    return Array.from(daysMap.values())
  }, [transactions])

  // Gerador de Folhas/Páginas com 1, 2, 3...
  const totalPages = meta.totalPages || 1
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages)
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }
    return pages
  }, [totalPages, page])

  const startIndex = meta.total === 0 ? 0 : (page - 1) * 20 + 1
  const endIndex = Math.min(page * 20, meta.total)

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div 
      className={styles.container}
      style={{
        '--brand-primary': customization.primaryColor || '#06b6d4',
        '--brand-accent': customization.accentColor || '#0891b2',
        fontFamily: customization.fontFamily || 'Inter'
      } as React.CSSProperties}
    >
      {/* ─── Top Bar Executiva ─── */}
      <div className={styles.actionBar}>
        <div className={styles.contextInfo}>
          <span className={styles.contextBadge}>MÓDULO FINANCEIRO</span>
          <span className={styles.contextText}>Fluxo de caixa diário, dívidas fixas e DRE contábil</span>
        </div>

        <div className={styles.actionButtons}>
          <button 
            type="button" 
            onClick={() => openCreateModal('DESPESA')} 
            className={styles.btnExpense}
          >
            <Minus size={15} />
            <span>Lançar Despesa</span>
          </button>

          <button 
            type="button" 
            onClick={() => openCreateModal('RECEITA')} 
            className={styles.btnRevenue}
          >
            <Plus size={15} />
            <span>Lançar Receita</span>
          </button>
        </div>
      </div>

      {/* ─── 4 KPIs Executivos ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>RECEITA TOTAL</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconCyan}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className={styles.kpiValue}>{formatCurrency(totalReceitas)}</h3>
          <span className={styles.kpiSubGreen}>Entradas brutas</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>DESPESAS TOTAIS</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconRed}`}>
              <TrendingUp size={18} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
          <h3 className={`${styles.kpiValue} ${styles.textRed}`}>{formatCurrency(totalDespesas)}</h3>
          <span className={styles.kpiSubText}>Insumos e despesas fixas</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>LUCRO LÍQUIDO</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconGreen}`}>
              <Clock size={18} />
            </div>
          </div>
          <h3 className={`${styles.kpiValue} ${saldoLiquido >= 0 ? styles.textGreen : styles.textRed}`}>
            {formatCurrency(saldoLiquido)}
          </h3>
          <span className={saldoLiquido >= 0 ? styles.kpiSubGreen : styles.kpiSubRed}>
            Resultado consolidado
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>TICKET MÉDIO</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconSlate}`}>
              <BarChart3 size={18} />
            </div>
          </div>
          <h3 className={styles.kpiValue}>{formatCurrency(ticketMedio)}</h3>
          <span className={styles.kpiSubText}>Média por procedimento</span>
        </div>
      </div>

      {/* ─── Comparativo de Fluxo ─── */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Comparativo de Fluxo: Receitas x Despesas</h3>
            <p className={styles.cardSubtitle}>Volume diário movimentado nos últimos 7 dias</p>
          </div>
          <span className={styles.unitPill}>R$ Reais</span>
        </div>

        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartTimelineData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="formattedDate" 
                axisLine={{ stroke: '#f1f5f9' }}
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={styles.customTooltip}>
                        <span className={styles.tooltipHeader}>{payload[0].payload.formattedDate}</span>
                        <div className={styles.tooltipRow}>
                          <span className={styles.dotCyan} />
                          <span>Receita: {formatCurrency(Number(payload[0].value))}</span>
                        </div>
                        <div className={styles.tooltipRow}>
                          <span className={styles.dotRed} />
                          <span>Despesa: {formatCurrency(Number(payload[1].value))}</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(val) => val === 'receitas' ? 'Receitas (Entradas)' : 'Despesas (Saídas)'}
              />
              <Bar dataKey="receitas" fill="var(--brand-primary, #06b6d4)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Navegação de Abas ─── */}
      <div className={styles.tabNav}>
        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'caixa' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('caixa')}
        >
          <DollarSign size={16} />
          <span>Caixa & Transações ({meta.total})</span>
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'dre' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('dre')}
        >
          <PieChart size={16} />
          <span>Demonstrativo DRE</span>
        </button>

        <button 
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'planos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('planos')}
        >
          <FileText size={16} />
          <span>Planos de Tratamento ({plans.length})</span>
        </button>
      </div>

      {/* ─── ABA 1: Caixa & Transações ─── */}
      {activeTab === 'caixa' && (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.titleWithCount}>
              <h3 className={styles.tableHeading}>Extrato de Transações Recentes</h3>
              <span className={styles.countBadge}>{meta.total} transações no total</span>
            </div>
            
            <div className={styles.toolbarFilters}>
              {/* Filtro de Centros de Custo */}
              <div className={styles.selectWrapper}>
                <Layers size={13} className={styles.selectIcon} />
                <select 
                  value={selectedCostCenterFilter} 
                  onChange={(e) => handleCostCenterFilterChange(e.target.value)}
                  className={styles.supplierSelectFilter}
                >
                  <option value="ALL">Todos os Centros de Custo</option>
                  {COST_CENTERS.map(cc => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Fornecedores */}
              {suppliers.length > 0 && (
                <div className={styles.selectWrapper}>
                  <Building size={13} className={styles.selectIcon} />
                  <select 
                    value={selectedSupplierFilter} 
                    onChange={(e) => handleSupplierFilterChange(e.target.value)}
                    className={styles.supplierSelectFilter}
                  >
                    <option value="ALL">Todos os Fornecedores</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botões de Filtro: Tipo */}
              <div className={styles.filterButtonGroup}>
                <button 
                  type="button" 
                  className={`${styles.filterBtn} ${typeFilter === 'ALL' ? styles.filterBtnActive : ''}`}
                  onClick={() => handleTypeFilterChange('ALL')}
                >
                  Todas
                </button>
                <button 
                  type="button" 
                  className={`${styles.filterBtn} ${typeFilter === 'RECEITA' ? styles.filterBtnActive : ''}`}
                  onClick={() => handleTypeFilterChange('RECEITA')}
                >
                  Receitas
                </button>
                <button 
                  type="button" 
                  className={`${styles.filterBtn} ${typeFilter === 'DESPESA' ? styles.filterBtnActive : ''}`}
                  onClick={() => handleTypeFilterChange('DESPESA')}
                >
                  Despesas
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingWrapper}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Buscando transações do caixa...</span>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>STATUS / CONCIL.</th>
                      <th>DESCRIÇÃO / VÍNCULO</th>
                      <th>CENTRO DE CUSTO</th>
                      <th>CATEGORIA</th>
                      <th>MÉTODO</th>
                      <th>VALOR</th>
                      <th>DATA</th>
                      {isAdmin && <th style={{ textAlign: 'center' }}>AÇÃO</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className={styles.emptyTableState}>
                          Nenhuma movimentação financeira encontrada nesta folha.
                        </td>
                      </tr>
                    ) : (
                      transactions.map(t => {
                        const isRec = t.type === 'RECEITA'
                        return (
                          <tr key={t.id} className={styles.tableRow}>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleToggleReconcile(t)}
                                className={styles.btnReconcile}
                                title={t.isReconciled ? 'Conciliado no caixa' : 'Pendente de conciliação'}
                              >
                                {t.isReconciled ? (
                                  <CheckCircle2 size={16} className={styles.reconciledIcon} />
                                ) : (
                                  <CircleDashed size={16} className={styles.pendingIcon} />
                                )}
                              </button>
                            </td>
                            <td className={styles.descCell}>
                              <div className={isRec ? styles.iconIn : styles.iconOut}>
                                {isRec ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                              </div>
                              <div className={styles.descGroup}>
                                <div className={styles.descRow}>
                                  <span className={styles.boldText}>{t.description || 'Lançamento avulso'}</span>
                                  {t.isRecurring && (
                                    <span className={styles.recurringBadge} title="Despesa Fixa Recorrente Mensal">
                                      <Repeat size={10} /> Todo dia {t.recurrenceDay || '05'}
                                    </span>
                                  )}
                                </div>
                                {t.supplier && (
                                  <span className={styles.supplierBadge}>
                                    <Building size={11} /> {t.supplier.name}
                                  </span>
                                )}
                                {t.appointment?.patient && (
                                  <span className={styles.patientBadge}>
                                    Paciente: {t.appointment.patient.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={styles.costCenterBadge}>
                                {t.costCenter || 'Geral'}
                              </span>
                            </td>
                            <td>{t.category || 'Geral'}</td>
                            <td>{getMethodLabel(normalizePaymentMethod(t.paymentMethod))}</td>
                            <td className={isRec ? styles.valueRec : styles.valueDesp}>
                              {isRec ? `+ ${formatCurrency(Number(t.amount))}` : `- ${formatCurrency(Number(t.amount))}`}
                            </td>
                            <td className={styles.dateCell}>
                              {new Date(t.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(t.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </td>
                            {isAdmin && (
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteTransaction(t.id)} 
                                  className={styles.btnDeleteRow}
                                  title="Remover transação"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ─── Folhas / Paginação 1, 2, 3... ─── */}
              {meta.total > 0 && (
                <div className={styles.paginationFooter}>
                  <div className={styles.paginationInfo}>
                    <span>
                      Exibindo <strong>{startIndex}</strong> a <strong>{endIndex}</strong> de <strong>{meta.total}</strong> transações (20 por folha)
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <div className={styles.paginationControls}>
                      {/* Primeira Folha */}
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className={styles.pageBtnNav}
                        title="Primeira folha"
                      >
                        <ChevronsLeft size={16} />
                      </button>

                      {/* Folha Anterior */}
                      <button
                        type="button"
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                        className={styles.pageBtnNav}
                        title="Folha anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Folhas Numeradas 1, 2, 3... */}
                      <div className={styles.pageNumbersList}>
                        {pageNumbers.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`dots-${idx}`} className={styles.pageDots}>
                                ...
                              </span>
                            )
                          }
                          const pageNum = Number(p)
                          const isActive = page === pageNum
                          return (
                            <button
                              key={`page-${pageNum}`}
                              type="button"
                              onClick={() => setPage(pageNum)}
                              className={`${styles.pageNumberBtn} ${isActive ? styles.pageNumberActive : ''}`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      {/* Próxima Folha */}
                      <button
                        type="button"
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                        className={styles.pageBtnNav}
                        title="Próxima folha"
                      >
                        <ChevronRight size={16} />
                      </button>

                      {/* Última Folha */}
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className={styles.pageBtnNav}
                        title="Última folha"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── ABA 2: DRE Gerencial Avançado ─── */}
      {activeTab === 'dre' && (
        <div className={styles.dreCard}>
          <div className={styles.dreHeader}>
            <div>
              <h3 className={styles.cardTitle}>Demonstrativo de Resultado do Exercício (DRE)</h3>
              <p className={styles.cardSubtitle}>Estrutura contábil por regime de competência com Análise Vertical (% AV)</p>
            </div>

            <div className={styles.dreToolbar}>
              <div className={styles.selectWrapper}>
                <Calendar size={13} className={styles.selectIcon} />
                <select 
                  value={drePeriod} 
                  onChange={(e) => setDrePeriod(e.target.value as any)}
                  className={styles.supplierSelectFilter}
                >
                  <option value="ALL">Todo o Período Histórico</option>
                  <option value="CURRENT_MONTH">Mês Vigente</option>
                  <option value="LAST_MONTH">Mês Anterior</option>
                </select>
              </div>

              <div className={styles.marginTag}>
                Margem EBITDA: <strong>{dreReport.ebitdaAv}</strong>
              </div>
            </div>
          </div>

          <div className={styles.dreSummaryCards}>
            <div className={styles.summaryMiniCard}>
              <span className={styles.miniLabel}>Margem de Contribuição</span>
              <strong className={styles.textGreen}>{formatCurrency(dreReport.margemContribuicao)}</strong>
              <small>{dreReport.margemContribuicaoAv} da receita</small>
            </div>

            <div className={styles.summaryMiniCard}>
              <span className={styles.miniLabel}>Despesas Estruturais Fixas</span>
              <strong className={styles.textRed}>{formatCurrency(dreReport.despesasFixas)}</strong>
              <small>Custo mínimo de operação</small>
            </div>

            <div className={styles.summaryMiniCard}>
              <span className={styles.miniLabel}>EBITDA Operacional</span>
              <strong className={dreReport.ebitda >= 0 ? styles.textGreen : styles.textRed}>
                {formatCurrency(dreReport.ebitda)}
              </strong>
              <small>{dreReport.ebitda >= 0 ? 'Operação superavitária' : 'Atenção ao fluxo'}</small>
            </div>
          </div>

          <div className={styles.dreStructure}>
            <div className={styles.dreRowHeader}>
              <span style={{ flex: 1 }}>Estrutura Contábil / Indicador</span>
              <span style={{ width: '130px', textAlign: 'right' }}>% AV</span>
              <span style={{ width: '180px', textAlign: 'right' }}>Valor Realizado</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowPositive}`}>
              <span className={styles.dreItemTitle}>(+) Receita Bruta Operacional (Consultas e Tratamentos)</span>
              <span className={styles.dreItemAv}>100.0%</span>
              <span className={styles.dreItemValue}>{formatCurrency(dreReport.receitaBruta)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowNegative}`}>
              <span className={styles.dreItemTitle}>(-) Insumos, Dentais & Protéticos (Custos Diretos)</span>
              <span className={styles.dreItemAv}>{dreReport.insumosLabAv}</span>
              <span className={styles.dreItemValue}>- {formatCurrency(dreReport.insumosLab)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowSubtotal}`}>
              <span className={styles.dreItemTitle}>(=) Margem de Contribuição Clínica</span>
              <span className={styles.dreItemAv}>{dreReport.margemContribuicaoAv}</span>
              <span className={styles.dreItemValue}>{formatCurrency(dreReport.margemContribuicao)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowNegative}`}>
              <span className={styles.dreItemTitle}>(-) Ocupação & Utilidades (Aluguel, Água, Luz, Internet)</span>
              <span className={styles.dreItemAv}>{dreReport.operacionaisAv}</span>
              <span className={styles.dreItemValue}>- {formatCurrency(dreReport.operacionais)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowNegative}`}>
              <span className={styles.dreItemTitle}>(-) Marketing Odontológico & Aquisição de Pacientes</span>
              <span className={styles.dreItemAv}>{dreReport.marketingAv}</span>
              <span className={styles.dreItemValue}>- {formatCurrency(dreReport.marketing)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowNegative}`}>
              <span className={styles.dreItemTitle}>(-) Pessoal & Administrativo (Salários, Softwares, Pró-Labore)</span>
              <span className={styles.dreItemAv}>{dreReport.folhaAdmAv}</span>
              <span className={styles.dreItemValue}>- {formatCurrency(dreReport.folhaAdm)}</span>
            </div>

            <div className={`${styles.dreRow} ${styles.dreRowTotal}`}>
              <span className={styles.dreItemTitle}>(=) Resultado Líquido / EBITDA Operacional</span>
              <span className={styles.dreItemAv}>{dreReport.ebitdaAv}</span>
              <span className={`${styles.dreItemValue} ${dreReport.ebitda >= 0 ? styles.textGreen : styles.textRed}`}>
                {formatCurrency(dreReport.ebitda)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 3: Planos de Tratamento ─── */}
      {activeTab === 'planos' && (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PACIENTE</th>
                  <th>TÍTULO DO PLANO</th>
                  <th>STATUS</th>
                  <th>VALOR TOTAL</th>
                  <th style={{ textAlign: 'right' }}>INTEGRAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyTableState}>
                      Nenhum plano de tratamento cadastrado.
                    </td>
                  </tr>
                ) : (
                  plans.map(p => (
                    <tr key={p.id} className={styles.tableRow}>
                      <td className={styles.boldText}>{p.patient?.name}</td>
                      <td>{p.title}</td>
                      <td>
                        <span className={styles.statusBadge}>{p.status}</span>
                      </td>
                      <td className={styles.boldText}>{formatCurrency(Number(p.totalAmount))}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        Integrado ao Caixa
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modal de Lançamento Manual ─── */}
      {isModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                {modalType === 'RECEITA' ? (
                  <ArrowUpRight size={18} color="#16a34a" />
                ) : (
                  <ArrowDownRight size={18} color="#ef4444" />
                )}
                <h3>{modalType === 'RECEITA' ? 'Lançar Receita Manual' : 'Lançar Despesa Operacional'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={styles.btnClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className={styles.modalForm}>
              {modalType === 'DESPESA' && (
                <div className={styles.formGroup}>
                  <div className={styles.labelRowWithAction}>
                    <label>Fornecedor Vinculado</label>
                    <button 
                      type="button" 
                      onClick={() => setIsSupplierModalOpen(true)} 
                      className={styles.btnQuickLink}
                    >
                      <Plus size={12} /> Novo Fornecedor
                    </button>
                  </div>
                  <select 
                    value={selectedSupplierId} 
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedSupplierId(id)
                      const sup = suppliers.find(s => s.id === id)
                      if (sup && !description) {
                        setDescription(`Compra: ${sup.name}`)
                      }
                    }}
                    className={styles.input}
                  >
                    <option value="">Nenhum (Despesa interna / avulsa)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.cnpj ? `(${s.cnpj})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Descrição do Lançamento*</label>
                <input 
                  type="text" 
                  required 
                  placeholder={modalType === 'RECEITA' ? 'Ex: Pagamento Consulta Avulsa' : 'Ex: Aluguel Clínica ou Mensalidade Software'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Valor (R$)*</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    required 
                    placeholder="Ex: 15,99 ou 15.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={styles.input} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Forma de Pagamento*</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={styles.input}
                  >
                    <option value="PIX">Pix</option>
                    <option value="CREDITO">Cartão de Crédito</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CONVENIO">Convênio</option>
                  </select>
                </div>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Categoria Contábil*</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className={styles.input}
                  >
                    {(modalType === 'DESPESA' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Centro de Custo*</label>
                  <select 
                    value={costCenter} 
                    onChange={(e) => setCostCenter(e.target.value)}
                    className={styles.input}
                  >
                    {COST_CENTERS.map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dívida Fixa Recorrente */}
              {modalType === 'DESPESA' && (
                <div className={styles.recurringBox}>
                  <label className={styles.recurringLabel}>
                    <input 
                      type="checkbox" 
                      checked={isRecurring} 
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <div className={styles.recurringText}>
                      <strong>Dívida Fixa / Despesa Recorrente Mensal</strong>
                      <span>Programada todo mês (Ex: Aluguel R$ 800, Odontoflow R$ 159,99)</span>
                    </div>
                  </label>

                  {isRecurring && (
                    <div className={styles.recurringDayInputGroup}>
                      <label>Dia do Vencimento Todo Mês:</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={recurrenceDay} 
                        onChange={(e) => setRecurrenceDay(e.target.value)}
                        className={styles.inputSmall}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className={modalType === 'RECEITA' ? styles.btnSaveIncome : styles.btnSaveExpense}
                >
                  {saving ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={16} />}
                  <span>{modalType === 'RECEITA' ? 'Salvar Receita' : 'Salvar Despesa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Rápido: Cadastrar Fornecedor ─── */}
      {isSupplierModalOpen && (
        <div className={styles.modalBackdrop} style={{ zIndex: 10000 }}>
          <div className={styles.modalCard} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Building size={18} color="var(--brand-primary, #06b6d4)" />
                <h3>Cadastrar Fornecedor</h3>
              </div>
              <button onClick={() => setIsSupplierModalOpen(false)} className={styles.btnClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSupplier} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nome do Fornecedor / Dental*</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Dental Cremer S.A."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>CNPJ</label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0000-00"
                  value={newSupplierCnpj}
                  onChange={(e) => setNewSupplierCnpj(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Contato / Vendedor</label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos (85) 99999-9999"
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                  className={styles.input} 
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className={styles.btnCancel}>
                  Voltar
                </button>
                <button type="submit" className={styles.btnSaveIncome} style={{ background: 'var(--brand-primary, #06b6d4)' }}>
                  <Plus size={15} />
                  <span>Cadastrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}