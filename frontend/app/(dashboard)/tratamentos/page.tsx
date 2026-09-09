'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Sparkles 
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
import { CriarPlanoModal } from '../../components/financeiro/CriarPlanoModal'

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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function loadPlans() {
    try {
      setLoading(true)
      const res = await api.get('/treatment-plans?limit=100')
      const data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setPlans(data)
    } catch (err) {
      console.error('Erro ao carregar planos de tratamento:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  // Métricas do Topo
  const metrics = useMemo(() => {
    const total = plans.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0)
    const orcamentos = plans.filter((p) => p.status === 'ORCAMENTO')
    const aprovados = plans.filter((p) => ['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(p.status))
    const totalAprovado = aprovados.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0)

    const taxaConversao = plans.length > 0 
      ? Math.round((aprovados.length / plans.length) * 100) 
      : 0

    return { total, orcamentosCount: orcamentos.length, aprovadosCount: aprovados.length, totalAprovado, taxaConversao }
  }, [plans])

  // Agrupamento para o Donut
  const pieData = useMemo(() => {
    const counts: Record<string, { count: number; totalVal: number }> = {}

    plans.forEach((p) => {
      const cleanTitle = p.title.trim() || 'Tratamento Geral'
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
  }, [plans])

  const totalPlansCount = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0)
  }, [pieData])

  // Filtros
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchName = (p.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchTitle = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'TODOS' || p.status === statusFilter
      return (matchName || matchTitle) && matchStatus
    })
  }, [plans, searchTerm, statusFilter])

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

      await loadPlans()
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
      await loadPlans()
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

  return (
    <div className={styles.page}>
      {/* ─── Header da Página (Subtítulo e Ação) ─── */}
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

      {/* ─── Grid Analítico: Gráfico de Donut & Desempenho ─── */}
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
                            fill={index === 0 ? 'var(--primary-color, #06b6d4)' : PIE_COLORS[index % PIE_COLORS.length]} 
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
                    const color = idx === 0 ? 'var(--primary-color, #06b6d4)' : PIE_COLORS[idx % PIE_COLORS.length]

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
              <strong className={styles.statValue}>{plans.length}</strong>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Ticket Médio por Plano</span>
              <strong className={styles.statValue}>
                {formatCurrency(plans.length > 0 ? metrics.total / plans.length : 0)}
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
                style={{ width: `${metrics.taxaConversao}%` }} 
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.statusTabs}>
            {['TODOS', 'ORCAMENTO', 'APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'RECUSADO'].map((st) => (
              <button
                key={st}
                type="button"
                className={`${styles.statusTab} ${statusFilter === st ? styles.statusTabActive : ''}`}
                onClick={() => setStatusFilter(st)}
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
        ) : filteredPlans.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={36} className={styles.emptyIcon} />
            <p>Nenhum plano ou orçamento encontrado para este filtro.</p>
          </div>
        ) : (
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
                {filteredPlans.map((plan) => {
                  const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.ORCAMENTO

                  return (
                    <tr key={plan.id} className={styles.row}>
                      {/* Coluna 1: Paciente */}
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

                      {/* Coluna 2: Título do Plano */}
                      <td>
                        <div className={styles.planTitleCol}>
                          <strong className={styles.planTitleText}>{plan.title}</strong>
                          {plan.notes && <span className={styles.planNotes}>{plan.notes}</span>}
                        </div>
                      </td>

                      {/* Coluna 3: Valor Total */}
                      <td className={styles.amountCell}>
                        {formatCurrency(plan.totalAmount)}
                      </td>

                      {/* Coluna 4: Status */}
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

                      {/* Coluna 5: Criado Em */}
                      <td className={styles.dateCell}>{formatDate(plan.createdAt)}</td>

                      {/* Coluna 6: Ações */}
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
        )}
      </div>

      <CriarPlanoModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          loadPlans()
        }}
      />
    </div>
  )
}