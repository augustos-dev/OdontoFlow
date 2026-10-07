'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  DollarSign,
  PackageMinus,
  CheckCircle2,
  Clock,
  Search,
  BarChart3,
  Stethoscope,
  RefreshCw,
  Zap,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight
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
import { ModalLiquidacao, CommissionItem } from '../../components/comissoes/modalLiquidacao'
import styles from './comissoes.module.css'

interface UserProfile {
  id: string
  name: string
  role: 'ADMIN' | 'DENTIST' | 'SECRETARY'
}

interface DentistOption {
  id: string
  name: string
}

function CustomCommissionsTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div style={{
      backgroundColor: '#0f172a',
      borderRadius: '8px',
      padding: '8px 12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      border: '1px solid #1e293b',
      fontSize: '12px',
      color: '#ffffff',
      minWidth: '150px'
    }}>
      <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '6px', fontSize: '11px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill || '#38bdf8'
          const formattedVal = (Number(entry.value) || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })

          return (
            <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: '#f1f5f9' }}>{entry.name}:</span>
              <span style={{ marginLeft: 'auto', paddingLeft: '8px' }}>{formattedVal}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ComissoesPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [dentists, setDentists] = useState<DentistOption[]>([])
  const [proceduresMap, setProceduresMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Cor primária do White-Label lida diretamente das CSS variables
  const [themePrimary, setThemePrimary] = useState('#0284c7')

  // Filtros
  const [selectedDentistId, setSelectedDentistId] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [chartDentistFilter, setChartDentistFilter] = useState<string>('ALL')

  // Seleção em lote
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCommission, setSelectedCommission] = useState<CommissionItem | null>(null)
  const [batchList, setBatchList] = useState<CommissionItem[]>([])
  const [batchDentistName, setBatchDentistName] = useState('')

  // Sincroniza White-Label do :root
  const syncWhiteLabel = useCallback(() => {
    if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement)
      const primary = computed.getPropertyValue('--primary-color').trim()
      if (primary) setThemePrimary(primary)
    }
  }, [])

  const loadCommissions = useCallback(async (
    dentistId?: string,
    procLookup = proceduresMap,
    dentistLookup = dentists
  ) => {
    try {
      const params: Record<string, string> = {}
      if (dentistId && dentistId !== 'ALL') params.dentistId = dentistId

      const { data } = await api.get('/commissions', { params })
      const rawList = Array.isArray(data) ? data : data?.data || []

      const enrichedList: CommissionItem[] = rawList.map((item: any) => {
        const foundDentist = dentistLookup.find((d) => d.id === item.dentistId)
        const procedureTitle =
          item.procedureName ||
          procLookup[item.procedureId] ||
          (item.treatmentPlanTitle ? `Plano: ${item.treatmentPlanTitle}` : 'Procedimento Clínico')

        return {
          ...item,
          dentistName: item.dentistName || foundDentist?.name || 'Dr(a). Cirurgião-Dentista',
          procedureName: procedureTitle,
          grossAmount: Number(item.grossAmount) || 0,
          materialsCost: Number(item.materialsCost) || 0,
          netBaseAmount: Number(item.netBaseAmount) || 0,
          percentage: Number(item.percentage) || 0,
          commissionAmount: Number(item.commissionAmount) || 0,
        }
      })

      setCommissions(enrichedList)
      setSelectedItemIds([])
    } catch (err) {
      console.error('Erro ao buscar comissões:', err)
    }
  }, [proceduresMap, dentists])

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      syncWhiteLabel()

      // 1. Perfil e RBAC
      let currentUser: UserProfile | null = null
      try {
        const { data: meRes } = await api.get('/auth/me')
        currentUser = meRes?.user || meRes
        setUser(currentUser)
      } catch {
        const fallbackUser: UserProfile = { id: '', name: 'Usuário', role: 'ADMIN' }
        setUser(fallbackUser)
        currentUser = fallbackUser
      }

      // 2. Dentistas e Catálogo de Procedimentos
      const [usersRes, proceduresRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/procedures'),
      ])

      const dentistsList: DentistOption[] = []
      if (usersRes.status === 'fulfilled') {
        const rawUsers = Array.isArray(usersRes.value.data)
          ? usersRes.value.data
          : usersRes.value.data?.data || []

        rawUsers
          .filter((u: any) => u.role === 'DENTIST' || u.role === 'ADMIN')
          .forEach((u: any) => {
            dentistsList.push({ id: u.id, name: u.name })
          })
        setDentists(dentistsList)
      }

      const procMap: Record<string, string> = {}
      if (proceduresRes.status === 'fulfilled') {
        const rawProcs = Array.isArray(proceduresRes.value.data)
          ? proceduresRes.value.data
          : proceduresRes.value.data?.data || []
        rawProcs.forEach((p: any) => {
          procMap[p.id] = p.name
        })
        setProceduresMap(procMap)
      }

      // RBAC: Trava filtro se for DENTIST
      const initialDentist = currentUser?.role === 'DENTIST' ? currentUser.id : undefined
      if (initialDentist) {
        setSelectedDentistId(initialDentist)
        setChartDentistFilter(initialDentist)
      }

      await loadCommissions(initialDentist, procMap, dentistsList)
    } finally {
      setLoading(false)
    }
  }, [syncWhiteLabel, loadCommissions])

  useEffect(() => {
    loadInitialData()

    const handleThemeUpdate = () => syncWhiteLabel()
    const handlePermissionsUpdate = () => loadInitialData()

    window.addEventListener('clinic_customization_updated', handleThemeUpdate)
    window.addEventListener('permissions_updated', handlePermissionsUpdate)

    return () => {
      window.removeEventListener('clinic_customization_updated', handleThemeUpdate)
      window.removeEventListener('permissions_updated', handlePermissionsUpdate)
    }
  }, [loadInitialData, syncWhiteLabel])

  function formatCurrency(val: number) {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  const isDentistRole = user?.role === 'DENTIST'

  // Filtragem da tabela
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const matchesDentist =
        isDentistRole ? c.dentistId === user?.id : selectedDentistId === 'ALL' || c.dentistId === selectedDentistId
      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter
      const matchesSearch =
        !searchTerm ||
        (c.procedureName && c.procedureName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.dentistName && c.dentistName.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesDentist && matchesStatus && matchesSearch
    })
  }, [commissions, isDentistRole, user?.id, selectedDentistId, statusFilter, searchTerm])

  const pendingForSelectedDentist = useMemo(() => {
    if (selectedDentistId === 'ALL') return []
    return commissions.filter((c) => c.dentistId === selectedDentistId && c.status === 'PENDING')
  }, [commissions, selectedDentistId])

  const pendingAmountForSelectedDentist = useMemo(() => {
    return pendingForSelectedDentist.reduce((acc, c) => acc + c.commissionAmount, 0)
  }, [pendingForSelectedDentist])

  // Paginação
  const totalItems = filteredCommissions.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedCommissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCommissions.slice(start, start + pageSize)
  }, [filteredCommissions, currentPage, pageSize])

  // KPIs
  const kpis = useMemo(() => {
    let totalBruto = 0
    let totalInsumos = 0
    let liquidado = 0
    let pendente = 0

    filteredCommissions.forEach((c) => {
      totalBruto += c.grossAmount
      totalInsumos += c.materialsCost
      if (c.status === 'PAID') liquidado += c.commissionAmount
      if (c.status === 'PENDING') pendente += c.commissionAmount
    })

    return { totalBruto, totalInsumos, liquidado, pendente }
  }, [filteredCommissions])

  // Gráfico Recharts Dinâmico
  const chartData = useMemo(() => {
    const targetList =
      chartDentistFilter === 'ALL'
        ? filteredCommissions
        : filteredCommissions.filter((c) => c.dentistId === chartDentistFilter)

    const map = new Map<string, { label: string; bruto: number; insumos: number; comissao: number }>()

    targetList.forEach((c) => {
      const key =
        chartDentistFilter === 'ALL'
          ? (c.dentistName ? c.dentistName.replace('Dr(a). ', '') : 'Geral')
          : (c.procedureName ? c.procedureName.slice(0, 16) + '...' : 'Proc.')

      const prev = map.get(key) || { label: key, bruto: 0, insumos: 0, comissao: 0 }
      prev.bruto += c.grossAmount
      prev.insumos += c.materialsCost
      prev.comissao += c.commissionAmount
      map.set(key, prev)
    })

    return Array.from(map.values())
  }, [filteredCommissions, chartDentistFilter])

  function handleOpenLiquidate(c: CommissionItem) {
    if (isDentistRole) return
    setSelectedCommission(c)
    setBatchList([])
    setBatchDentistName('')
    setIsModalOpen(true)
  }

  function handleOpenLiquidateAllForDentist() {
    if (isDentistRole || pendingForSelectedDentist.length === 0) return
    const dName = dentists.find(d => d.id === selectedDentistId)?.name || 'Cirurgião-Dentista'
    setSelectedCommission(null)
    setBatchList(pendingForSelectedDentist)
    setBatchDentistName(dName)
    setIsModalOpen(true)
  }

  function handleOpenLiquidateSelected() {
    if (isDentistRole) return
    const selectedItems = commissions.filter(c => selectedItemIds.includes(c.id) && c.status === 'PENDING')
    if (selectedItems.length === 0) return
    const firstDentistName = selectedItems[0]?.dentistName || 'Profissional'
    setSelectedCommission(null)
    setBatchList(selectedItems)
    setBatchDentistName(firstDentistName)
    setIsModalOpen(true)
  }

  function toggleSelectItem(id: string) {
    if (isDentistRole) return
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  function toggleSelectAllVisible() {
    if (isDentistRole) return
    const visiblePendingIds = paginatedCommissions
      .filter(c => c.status === 'PENDING')
      .map(c => c.id)

    const allSelected = visiblePendingIds.every(id => selectedItemIds.includes(id))
    if (allSelected) {
      setSelectedItemIds(prev => prev.filter(id => !visiblePendingIds.includes(id)))
    } else {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...visiblePendingIds])))
    }
  }

  const selectedDentistName = dentists.find(d => d.id === selectedDentistId)?.name

  return (
    <div className={styles.page}>
      
      {/* ─── Topo de Módulo ─── */}
      <div className={styles.topBarRow}>
        <div className={styles.badgeSection}>
          <span className={styles.moduleBadge}>MÓDULO DE REPASSES</span>
          <span className={styles.moduleDesc}>
            {isDentistRole 
              ? 'Acompanhamento da sua produtividade clínica individual e comissões acumuladas'
              : 'Auditoria de produção clínica, controle de insumos debitados e fechamento de comissões'}
          </span>
        </div>

        <div className={styles.topActions}>
          {!isDentistRole && selectedDentistId !== 'ALL' && pendingForSelectedDentist.length > 0 && (
            <button
              type="button"
              onClick={handleOpenLiquidateAllForDentist}
              className={styles.btnLiquidateAll}
              title={`Liquidar repasses pendentes de ${selectedDentistName}`}
            >
              <Zap size={14} />
              <span>Liquidar Total ({formatCurrency(pendingAmountForSelectedDentist)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadCommissions(selectedDentistId)}
            className={styles.btnSecondaryAction}
          >
            <RefreshCw size={14} className={loading ? styles.spinner : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── KPIs Executivos ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>TOTAL PRODUZIDO</span>
            <div className={`${styles.iconWrap} ${styles.blueIcon}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={styles.kpiAmount}>{formatCurrency(kpis.totalBruto)}</div>
          <span className={styles.kpiFooter}>Receita bruta gerada em atendimentos</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>CUSTO DE INSUMOS</span>
            <div className={`${styles.iconWrap} ${styles.redIcon}`}>
              <PackageMinus size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${styles.dangerText}`}>
            {formatCurrency(kpis.totalInsumos)}
          </div>
          <span className={styles.kpiFooter}>Materiais debitados via Ficha Técnica</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>REPASSES LIQUIDADOS</span>
            <div className={`${styles.iconWrap} ${styles.greenIcon}`}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${styles.successText}`}>
            {formatCurrency(kpis.liquidado)}
          </div>
          <span className={styles.kpiFooter}>Valores já pagos e refletidos no DRE</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span className={styles.kpiTitle}>PENDENTE DE REPASSE</span>
            <div className={`${styles.iconWrap} ${styles.yellowIcon}`}>
              <Clock size={18} />
            </div>
          </div>
          <div className={`${styles.kpiAmount} ${styles.warningText}`}>
            {formatCurrency(kpis.pendente)}
          </div>
          <span className={styles.kpiFooter}>Aguardando conferência e liquidação</span>
        </div>
      </div>

      {/* ─── Gráfico Recharts com Cor do White-Label ─── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Comparativo de Eficiência: Receita Bruta x Repasse x Insumos</h3>
            <p className={styles.chartSubtitle}>
              Mapeamento de faturamento gerado vs. consumo real de materiais por profissional.
            </p>
          </div>

          <div className={styles.chartControls}>
            {!isDentistRole && (
              <select
                className={styles.chartSelect}
                value={chartDentistFilter}
                onChange={(e) => setChartDentistFilter(e.target.value)}
              >
                <option value="ALL">Visão Geral (Todos)</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <span className={styles.chartTag}>R$ Reais</span>
          </div>
        </div>

        <div className={styles.chartWrapper}>
          {chartData.length === 0 ? (
            <div className={styles.emptyChart}>
              <BarChart3 size={32} color="#94a3b8" />
              <span>Nenhum lançamento no período selecionado.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip content={<CustomCommissionsTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
                <Bar dataKey="bruto" name="Receita" fill={themePrimary} radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="insumos" name="Despesa (Insumos)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="comissao" name="Comissão Líquida" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Navegação de Abas do Módulo ─── */}
      <div className={styles.tabsNav}>
        <button className={`${styles.tabBtn} ${styles.tabBtnActive}`}>
          <DollarSign size={15} />
          <span>Extrato de Comissões ({filteredCommissions.length})</span>
        </button>
      </div>

      {/* ─── Filtros Integrados ─── */}
      <div className={styles.filterBar}>
        <div className={styles.filterTitleRow}>
          <h3 className={styles.tableSectionTitle}>Extrato de Comissões e Procedimentos</h3>
          <span className={styles.badgeTotalCount}>{totalItems} lançamentos</span>

          {selectedItemIds.length > 0 && !isDentistRole && (
            <div className={styles.batchActionBar}>
              <span>{selectedItemIds.length} selecionado(s)</span>
              <button
                type="button"
                onClick={handleOpenLiquidateSelected}
                className={styles.btnLiquidateBatch}
              >
                <CheckCircle2 size={13} />
                <span>Liquidar Selecionados</span>
              </button>
            </div>
          )}
        </div>

        <div className={styles.filterControlsGroup}>
          <div className={styles.searchWrap}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar por dentista, procedimento ou plano..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.searchInput}
            />
          </div>

          <select
            className={styles.select}
            value={selectedDentistId}
            disabled={isDentistRole}
            onChange={(e) => {
              setSelectedDentistId(e.target.value)
              setCurrentPage(1)
              loadCommissions(e.target.value)
            }}
          >
            {!isDentistRole && <option value="ALL">Todos os Dentistas</option>}
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className={styles.statusButtonGroup}>
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'ALL' ? styles.statusToggleActive : ''}`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'PENDING' ? styles.statusToggleActive : ''}`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('PAID'); setCurrentPage(1); }}
              className={`${styles.statusToggleBtn} ${statusFilter === 'PAID' ? styles.statusToggleActive : ''}`}
            >
              Liquidadas
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabela Operacional ─── */}
      <div className={styles.tableCard}>
        {filteredCommissions.length === 0 ? (
          <div className={styles.emptyTable}>
            <Stethoscope size={32} color="#94a3b8" />
            <p>Nenhum lançamento de comissão registrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {!isDentistRole && (
                    <th style={{ width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        onChange={toggleSelectAllVisible}
                        checked={
                          paginatedCommissions.filter(c => c.status === 'PENDING').length > 0 &&
                          paginatedCommissions
                            .filter(c => c.status === 'PENDING')
                            .every(c => selectedItemIds.includes(c.id))
                        }
                      />
                    </th>
                  )}
                  <th style={{ width: '36px' }}></th>
                  <th>STATUS</th>
                  <th>DENTISTA</th>
                  <th>PROCEDIMENTO / PLANO</th>
                  <th>VALOR BRUTO</th>
                  <th>INSUMOS</th>
                  <th>BASE LÍQUIDA</th>
                  <th>%</th>
                  <th>REPASSE</th>
                  <th>DATA</th>
                  <th style={{ textAlign: 'right' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCommissions.map((c) => {
                  const isSelected = selectedItemIds.includes(c.id)
                  const isPending = c.status === 'PENDING'

                  return (
                    <tr key={c.id} className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ''}`}>
                      {!isDentistRole && (
                        <td style={{ textAlign: 'center' }}>
                          {isPending ? (
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={isSelected}
                              onChange={() => toggleSelectItem(c.id)}
                            />
                          ) : (
                            <span style={{ opacity: 0.2 }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: 'center' }}>
                        <div className={c.status === 'PAID' ? styles.circleSuccess : styles.circlePending}>
                          {c.status === 'PAID' ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            c.status === 'PAID'
                              ? styles.statusPaid
                              : c.status === 'PENDING'
                              ? styles.statusPending
                              : styles.statusCanceled
                          }`}
                        >
                          {c.status === 'PAID' ? 'Liquidado' : c.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                        </span>
                      </td>
                      <td>
                        <strong className={styles.dentistCell}>{c.dentistName}</strong>
                      </td>
                      <td>
                        <span className={styles.procedureCell}>{c.procedureName}</span>
                      </td>
                      <td className={styles.moneyCell}>{formatCurrency(c.grossAmount)}</td>
                      <td className={`${styles.moneyCell} ${styles.dangerText}`}>
                        - {formatCurrency(c.materialsCost)}
                      </td>
                      <td className={styles.moneyCell}>{formatCurrency(c.netBaseAmount)}</td>
                      <td>
                        <span className={styles.percentBadge}>{c.percentage}%</span>
                      </td>
                      <td>
                        <strong className={styles.payoutCell}>
                          {formatCurrency(c.commissionAmount)}
                        </strong>
                      </td>
                      <td className={styles.dateCell}>{formatDate(c.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending && !isDentistRole ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLiquidate(c)}
                            className={styles.btnLiquidate}
                          >
                            <DollarSign size={13} />
                            <span>Liquidar</span>
                          </button>
                        ) : c.status === 'PAID' ? (
                          <span className={styles.paidLabelText}>Pago</span>
                        ) : (
                          <span className={styles.disabledAction}>—</span>
                        )}
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

      {/* Modal de Liquidação com cor primária injetada */}
      <ModalLiquidacao
        isOpen={isModalOpen}
        commission={selectedCommission}
        commissionsList={batchList}
        batchDentistName={batchDentistName}
        primaryColor={themePrimary}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedCommission(null)
          setBatchList([])
          setBatchDentistName('')
        }}
        onSuccess={() => {
          loadCommissions(selectedDentistId)
        }}
      />
    </div>
  )
}