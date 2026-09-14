'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  Loader2, 
  FileText, 
  User, 
  Trash2, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'
import api from '@/lib/api'
import styles from './planos.module.css'
import { CriarPlanoModal } from '../../components/planos/CriarPlanoModal'

interface TreatmentPlan {
  id: string
  title: string
  status: 'ORCAMENTO' | 'APROVADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'RECUSADO'
  totalAmount: number
  notes?: string
  createdAt: string
  patientId: string
  dentistId: string
  patient?: { id: string; name: string; phone: string }
  dentist?: { id: string; name: string }
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

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: any }> = {
  ORCAMENTO: { label: 'Orçamento', class: styles.statusOrcamento, icon: Clock },
  APROVADO: { label: 'Aprovado', class: styles.statusAprovado, icon: CheckCircle2 },
  EM_ANDAMENTO: { label: 'Em Andamento', class: styles.statusAndamento, icon: TrendingUp },
  CONCLUIDO: { label: 'Concluído', class: styles.statusConcluido, icon: CheckCircle2 },
  RECUSADO: { label: 'Recusado', class: styles.statusRecusado, icon: XCircle },
}

const PIE_COLORS = ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

export default function PlanosTratamentoPage() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [allPlansForMetrics, setAllPlansForMetrics] = useState<TreatmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // 📄 Paginação de Folhas
  const [page, setPage] = useState<number>(1)
  const [meta, setMeta] = useState<MetaPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  })

  // White-Label da Clínica
  const [customization, setCustomization] = useState<ClinicCustomization>({
    primaryColor: '#06b6d4',
    accentColor: '#0891b2',
    secondaryColor: '#0f172a',
    fontFamily: 'Inter'
  })

  // Carrega customização da clínica e métricas globais
  async function loadAuxiliaryData() {
    try {
      const [clinicsRes, allRes] = await Promise.all([
        api.get('/clinics').catch(() => ({ data: [] })),
        api.get('/treatment-plans?limit=1000').catch(() => ({ data: [] }))
      ])

      const clinicList = Array.isArray(clinicsRes.data) ? clinicsRes.data : clinicsRes.data?.data || []
      const currentClinic = clinicList[0]
      if (currentClinic?.id) {
        const customRes = await api.get(`/clinics/${currentClinic.id}/customization`).catch(() => null)
        if (customRes?.data?.primaryColor) {
          setCustomization(customRes.data)
        }
      }

      const allData = Array.isArray(allRes.data) ? allRes.data : allRes.data?.data || []
      setAllPlansForMetrics(allData)
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err)
    }
  }

  useEffect(() => {
    loadAuxiliaryData()
  }, [])

  // Busca paginada de planos
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {
        page,
        limit: 20
      }

      if (statusFilter !== 'TODOS') {
        params.status = statusFilter
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      const res = await api.get('/treatment-plans', { params })
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      const metaInfo = res.data?.meta || {
        total: list.length,
        page,
        limit: 20,
        totalPages: Math.ceil(list.length / 20) || 1
      }

      setPlans(list)
      setMeta(metaInfo)
    } catch (err) {
      console.error('Erro ao buscar planos de tratamento:', err)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  function handleStatusChange(newStatus: string) {
    setStatusFilter(newStatus)
    setPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  // Métricas Consolidadas (Baseadas no total global)
  const metrics = useMemo(() => {
    const list = allPlansForMetrics.length > 0 ? allPlansForMetrics : plans
    const total = list.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0)
    const orcamentos = list.filter((p) => p.status === 'ORCAMENTO')
    const aprovados = list.filter((p) => ['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(p.status))
    const totalAprovado = aprovados.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0)
    const taxaConversao = list.length > 0 ? Math.round((aprovados.length / list.length) * 100) : 0

    return { total, orcamentosCount: orcamentos.length, aprovadosCount: aprovados.length, totalAprovado, taxaConversao }
  }, [allPlansForMetrics, plans])

  // Agrupamento para Donut Chart
  const pieData = useMemo(() => {
    const counts: Record<string, { count: number; totalVal: number }> = {}
    const list = allPlansForMetrics.length > 0 ? allPlansForMetrics : plans

    list.forEach((p) => {
      const cleanTitle = p.title?.trim() || 'Tratamento Geral'
      if (!counts[cleanTitle]) {
        counts[cleanTitle] = { count: 0, totalVal: 0 }
      }
      counts[cleanTitle].count += 1
      counts[cleanTitle].totalVal += Number(p.totalAmount || 0)
    })

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        value: data.count,
        totalVal: data.totalVal
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [allPlansForMetrics, plans])

  const totalPlansCount = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0)
  }, [pieData])

  async function handleUpdateStatus(planId: string, newStatus: string) {
    try {
      setUpdatingId(planId)
      await api.patch(`/treatment-plans/${planId}/status`, { status: newStatus })
      
      if (newStatus === 'APROVADO') {
        const plan = plans.find((p) => p.id === planId)
        if (plan && window.confirm(`Deseja lançar a receita de ${formatCurrency(plan.totalAmount)} no financeiro agora?`)) {
          await api.post('/transactions', {
            type: 'RECEITA',
            amount: Number(plan.totalAmount),
            paymentMethod: 'PIX',
            category: 'Plano de Tratamento',
            description: `Plano: ${plan.title} (${plan.patient?.name || 'Paciente'})`,
            paidAt: new Date().toISOString(),
          })
        }
      }

      fetchPlans()
      loadAuxiliaryData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao alterar o status do plano.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!window.confirm('Tem certeza que deseja excluir este plano/orçamento permanentemente?')) return
    try {
      await api.delete(`/treatment-plans/${planId}`)
      fetchPlans()
      loadAuxiliaryData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir o plano.')
    }
  }

  function formatCurrency(val: number | string) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  // Folhas Numeradas (1, 2, 3...)
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

  return (
    <div 
      className={styles.page}
      style={{
        '--brand-primary': customization.primaryColor || '#06b6d4',
        '--brand-accent': customization.accentColor || '#0891b2',
        '--primary-color': customization.primaryColor || '#06b6d4',
        fontFamily: customization.fontFamily || 'Inter'
      } as React.CSSProperties}
    >
      {/* ─── Header da Página ─── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInfo}>
          <span className={styles.headerTag}>ODONTOFLOW • GESTÃO COMERCIAL</span>
          <p className={styles.pageSubtitle}>
            Controle de propostas comerciais, tratamentos ativos e taxa de conversão da clínica.
          </p>
        </div>
        <button 
          type="button" 
          className={styles.btnNewPlan}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={16} />
          <span>Novo Orçamento / Plano</span>
        </button>
      </div>

      {/* ─── Cards de Indicadores (KPIs) ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>EM ABERTO (ORÇAMENTOS)</span>
            <div className={`${styles.metricIconBg} ${styles.iconAmber}`}>
              <Clock size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{metrics.orcamentosCount}</span>
          <span className={styles.metricSub}>Aguardando aprovação do paciente</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>PLANOS APROVADOS</span>
            <div className={`${styles.metricIconBg} ${styles.iconGreen}`}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <span className={`${styles.metricValue} ${styles.textGreen}`}>{metrics.aprovadosCount}</span>
          <span className={styles.metricSub}>Em execução ou concluídos</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>FATURAMENTO APROVADO</span>
            <div className={`${styles.metricIconBg} ${styles.iconCyan}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <span className={`${styles.metricValue} ${styles.textCyan}`}>{formatCurrency(metrics.totalAprovado)}</span>
          <span className={styles.metricSub}>Volume total convertido</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>TAXA DE CONVERSÃO</span>
            <div className={`${styles.metricIconBg} ${styles.iconSlate}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{metrics.taxaConversao}%</span>
          <span className={styles.metricSub}>Propostas fechadas com sucesso</span>
        </div>
      </div>

      {/* ─── Grid Analítico ─── */}
      <div className={styles.analyticsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrapper}>
              <PieChartIcon size={18} className={styles.textCyan} />
              <h4>Planos Mais Aderidos</h4>
            </div>
            <span className={styles.chartBadge}>Distribuição</span>
          </div>

          <div className={styles.pieContainer}>
            {pieData.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <p className={styles.emptyChartTitle}>Nenhum plano cadastrado</p>
                <p className={styles.emptyChartSub}>Os tratamentos mais procurados aparecerão aqui.</p>
              </div>
            ) : (
              <div className={styles.pieContent}>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className={styles.customTooltip}>
                                <span className={styles.tooltipName}>{data.name}</span>
                                <span className={styles.tooltipValue}>{data.value} adesões ({formatCurrency(data.totalVal)})</span>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Pie
                        data={pieData}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? (customization.primaryColor || '#06b6d4') : PIE_COLORS[index % PIE_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className={styles.donutCenter}>
                    <strong>{totalPlansCount}</strong>
                    <span>Planos</span>
                  </div>
                </div>

                <div className={styles.legendList}>
                  {pieData.map((item, idx) => {
                    const percent = totalPlansCount > 0 ? Math.round((item.value / totalPlansCount) * 100) : 0
                    const color = idx === 0 ? (customization.primaryColor || '#06b6d4') : PIE_COLORS[idx % PIE_COLORS.length]

                    return (
                      <div key={item.name} className={styles.legendItem}>
                        <div className={styles.legendLeft}>
                          <span className={styles.legendDot} style={{ background: color }} />
                          <span className={styles.legendName} title={item.name}>{item.name}</span>
                        </div>
                        <span className={styles.legendPercent}>{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.conversionCard}>
          <div className={styles.conversionHeader}>
            <div className={styles.conversionIconBg}>
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className={styles.conversionTitle}>Performance Comercial</h4>
              <p className={styles.conversionSub}>Taxa de aceite das propostas</p>
            </div>
          </div>

          <div className={styles.conversionStats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Orçamentos Apresentados</span>
              <strong className={styles.statValue}>{meta.total || plans.length}</strong>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Ticket Médio por Plano</span>
              <strong className={styles.statValue}>
                {formatCurrency(metrics.total / (allPlansForMetrics.length || 1))}
              </strong>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressTop}>
              <span>Conversão em Vendas</span>
              <strong>{metrics.taxaConversao}%</strong>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressBar} 
                style={{ 
                  width: `${metrics.taxaConversao}%`,
                  backgroundColor: customization.primaryColor || '#06b6d4'
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabela e Filtros ─── */}
      <div className={styles.card}>
        <div className={styles.tableToolbar}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar por paciente ou título do plano..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.statusTabs}>
            {['TODOS', 'ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'RECUSADO'].map((st) => (
              <button
                key={st}
                type="button"
                className={`${styles.statusTab} ${statusFilter === st ? styles.statusTabActive : ''}`}
                onClick={() => handleStatusChange(st)}
              >
                {st === 'TODOS' ? 'Todos' : STATUS_CONFIG[st]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando planos de tratamento...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={36} className={styles.emptyIcon} />
            <p>Nenhum plano ou orçamento encontrado para este filtro.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>PACIENTE</th>
                    <th style={{ width: '28%' }}>TÍTULO DO PLANO</th>
                    <th style={{ width: '14%' }}>VALOR TOTAL</th>
                    <th style={{ width: '14%' }}>STATUS</th>
                    <th style={{ width: '12%' }}>CRIADO EM</th>
                    <th style={{ width: '5%', textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => {
                    const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.ORCAMENTO

                    return (
                      <tr key={plan.id} className={styles.row}>
                        <td>
                          <div className={styles.patientWrapper}>
                            <div className={styles.patientAvatar}>
                              <User size={15} />
                            </div>
                            <div className={styles.patientInfo}>
                              <span className={styles.patientName}>{plan.patient?.name || 'Paciente'}</span>
                              {plan.patient?.phone && (
                                <span className={styles.patientPhone}>{plan.patient.phone}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.planTitleCol}>
                            <strong className={styles.planTitleText}>{plan.title}</strong>
                            {plan.notes && <span className={styles.planNotes}>{plan.notes}</span>}
                          </div>
                        </td>

                        <td className={styles.amountCell}>
                          {formatCurrency(plan.totalAmount)}
                        </td>

                        <td>
                          <select 
                            className={`${styles.statusSelect} ${config.class}`}
                            value={plan.status}
                            disabled={updatingId === plan.id}
                            onChange={(e) => handleUpdateStatus(plan.id, e.target.value)}
                          >
                            <option value="ORCAMENTO">Orçamento</option>
                            <option value="APROVADO">Aprovado</option>
                            <option value="EM_ANDAMENTO">Em Andamento</option>
                            <option value="CONCLUIDO">Concluído</option>
                            <option value="RECUSADO">Recusado</option>
                          </select>
                        </td>

                        <td className={styles.dateCell}>{formatDate(plan.createdAt)}</td>

                        <td style={{ textAlign: 'right' }}>
                          <button 
                            type="button" 
                            className={styles.btnDelete} 
                            title="Excluir Plano"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Folhas / Paginação Numerada (1, 2, 3...) ─── */}
            {meta.total > 0 && (
              <div className={styles.paginationFooter}>
                <div className={styles.paginationInfo}>
                  <span>
                    Exibindo <strong>{startIndex}</strong> a <strong>{endIndex}</strong> de <strong>{meta.total}</strong> orçamentos (20 por folha)
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className={styles.paginationControls}>
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className={styles.pageBtnNav}
                      title="Primeira folha"
                    >
                      <ChevronsLeft size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className={styles.pageBtnNav}
                      title="Folha anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

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

                    <button
                      type="button"
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      className={styles.pageBtnNav}
                      title="Próxima folha"
                    >
                      <ChevronRight size={16} />
                    </button>

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

      {/* Modal Padrão Ouro */}
      <CriarPlanoModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        primaryColor={customization.primaryColor}
        accentColor={customization.accentColor} 
        onSuccess={() => {
          setIsCreateModalOpen(false)
          fetchPlans()
          loadAuxiliaryData()
        }}
      />
    </div>
  )
}