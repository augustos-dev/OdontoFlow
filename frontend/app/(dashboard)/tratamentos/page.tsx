'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
  ClipboardList, 
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
  AlertCircle
} from 'lucide-react'
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
      const data = Array.isArray(res.data) ? res.data : res.data.data || []
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

  // Filtros de busca e status
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchName = (p.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchTitle = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'TODOS' || p.status === statusFilter
      return (matchName || matchTitle) && matchStatus
    })
  }, [plans, searchTerm, statusFilter])

  // Atualização rápida de status via PATCH
  async function handleUpdateStatus(planId: string, newStatus: string) {
    try {
      setUpdatingId(planId)
      await api.patch(`/treatment-plans/${planId}/status`, { status: newStatus })
      
      // Se aprovou, pergunta se quer lançar no caixa
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
      {/* ─── Header da Página ─── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Planos & Orçamentos</h1>
          <p className={styles.pageSubtitle}>Gerencie propostas comerciais, tratamentos em andamento e conversão clínica.</p>
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

      {/* ─── Cards de Indicadores (Funil) ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>EM ABERTO (ORÇAMENTOS)</span>
            <div className={styles.metricIconBg} style={{ background: '#fef3c7', color: '#b45309' }}>
              <Clock size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{metrics.orcamentosCount}</span>
          <span className={styles.metricSub}>Aguardando aprovação do paciente</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>PLANOS APROVADOS</span>
            <div className={styles.metricIconBg} style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{metrics.aprovadosCount}</span>
          <span className={styles.metricSub}>Em execução ou concluídos</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>FATURAMENTO APROVADO</span>
            <div className={styles.metricIconBg} style={{ background: '#ecfeff', color: '#0891b2' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{formatCurrency(metrics.totalAprovado)}</span>
          <span className={styles.metricSub}>Volume total convertido</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>TAXA DE CONVERSÃO</span>
            <div className={styles.metricIconBg} style={{ background: '#f1f5f9', color: '#475569' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{metrics.taxaConversao}%</span>
          <span className={styles.metricSub}>Propostas fechadas com sucesso</span>
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

          {/* Abas de Status */}
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
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PACIENTE</th>
                <th>TÍTULO DO PLANO</th>
                <th>VALOR TOTAL</th>
                <th>STATUS</th>
                <th>CRIADO EM</th>
                <th style={{ textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => {
                const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.ORCAMENTO
                const StatusIcon = config.icon

                return (
                  <tr key={plan.id} className={styles.row}>
                    <td className={styles.patientCell}>
                      <div className={styles.patientAvatar}>
                        <User size={14} />
                      </div>
                      <div>
                        <span className={styles.patientName}>{plan.patient?.name || 'Paciente'}</span>
                        {plan.patient?.phone && (
                          <span className={styles.patientPhone}>{plan.patient.phone}</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.planTitleCell}>
                      <strong>{plan.title}</strong>
                      {plan.notes && <span className={styles.planNotes}>{plan.notes}</span>}
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
        )}
      </div>

      {/* ─── Modal de Criação ─── */}
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