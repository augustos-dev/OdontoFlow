'use client'

import { useEffect, useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  Receipt,
  CheckCircle2,
  FileText
} from 'lucide-react'
import api from '@/lib/api'
import styles from './financeiro.module.css'

interface Transaction {
  id: string
  type: 'RECEITA' | 'DESPESA'
  amount: string
  paymentMethod: string
  description?: string
  category?: string
  paidAt: string
  appointment?: {
    id: string
    dateTime: string
    patient: { id: string; name: string }
  }
}

interface TreatmentPlanFinance {
  id: string
  title: string
  status: string
  totalAmount: number
  createdAt: string
  patient: {
    id: string
    name: string
  }
}

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDITO: 'Cartão de Crédito',
  DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CONVENIO: 'Convênio',
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  APROVADO: 'Aprovado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  RECUSADO: 'Recusado',
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plans, setPlans] = useState<TreatmentPlanFinance[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'RECEITA' | 'DESPESA'>('all')
  const [activeTab, setActiveTab] = useState<'transacoes' | 'planos'>('transacoes')

  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = now.toISOString().slice(0, 10)

  async function loadData() {
    try {
      setLoading(true)
      const [txRes, reportRes, plansRes] = await Promise.all([
        api.get('/transactions?limit=50&page=1'),
        api.get(`/transactions/report?startDate=${startDate}&endDate=${endDate}`),
        api.get('/treatment-plans').catch(() => ({ data: [] })),
      ])
      setTransactions(txRes.data.data || [])
      setReport(reportRes.data)
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data.data || [])
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  async function handleApprovePlanAndGenerateRevenue(plan: TreatmentPlanFinance) {
  if (!window.confirm(`Deseja aprovar o plano "${plan.title}" e gerar a receita correspondente de ${formatCurrency(plan.totalAmount)} no financeiro?`)) {
    return
  }

  try {
    // 1. Rota correta para trocar o status no backend
    await api.patch(`/treatment-plans/${plan.id}/status`, { 
      status: 'APROVADO' 
    })

    // 2. Lança a receita no caixa
    await api.post('/transactions', {
      type: 'RECEITA',
      amount: Number(plan.totalAmount),
      paymentMethod: 'PIX',
      category: 'Plano de Tratamento',
      description: `Plano: ${plan.title} (${plan.patient.name})`,
      paidAt: new Date().toISOString(),
    })

    alert('Plano aprovado e receita gerada com sucesso no caixa!')
    await loadData() // Recarrega a tabela
  } catch (err: any) {
    console.error('Erro ao processar plano:', err)
    alert(err.response?.data?.message || 'Erro ao processar a aprovação do plano.')
  }
} 

  function formatCurrency(value: number | string) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateRelative(dt: string) {
    const d = new Date(dt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return formatTime(dt)
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-BR')
  }

  const displayedTransactions = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filter)

  return (
    <div className={styles.page}>
      
      {/* ─── Cards de Métricas ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <DollarSign size={20} color="var(--primary)" />
            </div>
          </div>
          <p className={styles.metricLabel}>RECEITA DO DIA</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.todayRevenue ?? 0)}</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <Calendar size={20} color="#0284c7" />
            </div>
          </div>
          <p className={styles.metricLabel}>RECEITA DA SEMANA</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.weekRevenue ?? 0)}</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <TrendingUp size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>RECEITA DO MÊS</p>
          <p className={styles.metricValue}>{formatCurrency(report?.summary.totalReceitas ?? 0)}</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIconBg}>
              <PieChart size={20} color={(report?.summary.lucro ?? 0) >= 0 ? '#16a34a' : '#dc2626'} />
            </div>
          </div>
          <p className={styles.metricLabel}>LUCRO DO MÊS</p>
          <p className={`${styles.metricValue} ${(report?.summary.lucro ?? 0) >= 0 ? styles.lucroPositivo : styles.lucroNegativo}`}>
            {formatCurrency(report?.summary.lucro ?? 0)}
          </p>
        </div>
      </div>

      {/* ─── Navegação de Abas Principais (Transações vs Planos) ─── */}
      <div className={styles.mainNavTabs}>
        <button 
          className={`${styles.mainTab} ${activeTab === 'transacoes' ? styles.mainTabActive : ''}`}
          onClick={() => setActiveTab('transacoes')}
        >
          <Receipt size={16} />
          <span>Caixa & Transações</span>
        </button>
        <button 
          className={`${styles.mainTab} ${activeTab === 'planos' ? styles.mainTabActive : ''}`}
          onClick={() => setActiveTab('planos')}
        >
          <FileText size={16} />
          <span>Planos de Tratamento ({plans.length})</span>
        </button>
      </div>

      {/* ─── CONTEÚDO DA ABA: TRANSAÇÕES ─── */}
      {activeTab === 'transacoes' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWrapper}>
              <Receipt size={18} className={styles.titleIcon} />
              <h2 className={styles.cardTitle}>Transações Recentes</h2>
            </div>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`} onClick={() => setFilter('all')}>Todas</button>
              <button className={`${styles.tab} ${filter === 'RECEITA' ? styles.tabActive : ''}`} onClick={() => setFilter('RECEITA')}>Receitas</button>
              <button className={`${styles.tab} ${filter === 'DESPESA' ? styles.tabActive : ''}`} onClick={() => setFilter('DESPESA')}>Despesas</button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando transações...</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PACIENTE / DESCRIÇÃO</th>
                  <th>CATEGORIA</th>
                  <th>MÉTODO</th>
                  <th>VALOR</th>
                  <th>QUANDO</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                )}
                {displayedTransactions.map((t) => (
                  <tr key={t.id} className={styles.row}>
                    <td className={styles.nameCell}>
                      <div className={styles.typeBadgeWrapper}>
                        {t.type === 'RECEITA' ? (
                          <ArrowUpRight size={16} className={styles.iconReceita} />
                        ) : (
                          <ArrowDownLeft size={16} className={styles.iconDespesa} />
                        )}
                        <span>{t.appointment?.patient.name ?? t.description ?? '—'}</span>
                      </div>
                    </td>
                    <td className={styles.category}>{t.category ?? '—'}</td>
                    <td className={styles.method}>{PAYMENT_LABEL[t.paymentMethod] ?? t.paymentMethod}</td>
                    <td>
                      <span className={`${styles.amount} ${t.type === 'RECEITA' ? styles.receita : styles.despesa}`}>
                        {t.type === 'DESPESA' ? '- ' : '+ '}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className={styles.when}>{formatDateRelative(t.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── CONTEÚDO DA ABA: PLANOS DE TRATAMENTO ATIVOS ─── */}
      {activeTab === 'planos' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWrapper}>
              <FileText size={18} className={styles.titleIcon} />
              <h2 className={styles.cardTitle}>Planos de Tratamento e Faturamento</h2>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Aprove orçamentos para lançar receitas automaticamente no caixa.
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando planos...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className={styles.empty}>Nenhum plano de tratamento cadastrado.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PACIENTE</th>
                  <th>TÍTULO DO PLANO</th>
                  <th>STATUS</th>
                  <th>VALOR TOTAL</th>
                  <th>AÇÃO FINANCEIRA</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isApproved = plan.status === 'APROVADO' || plan.status === 'CONCLUIDO' || plan.status === 'EM_ANDAMENTO'
                  return (
                    <tr key={plan.id} className={styles.row}>
                      <td className={styles.nameCell}>{plan.patient?.name ?? 'Paciente'}</td>
                      <td className={styles.category}>{plan.title}</td>
                      <td>
                        <span className={`${styles.planStatusBadge} ${styles[plan.status.toLowerCase()] || ''}`}>
                          {PLAN_STATUS_LABEL[plan.status] ?? plan.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(plan.totalAmount)}
                      </td>
                      <td>
                        {isApproved ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
                            <CheckCircle2 size={16} /> Integrado ao Caixa
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApprovePlanAndGenerateRevenue(plan)}
                            className={styles.btnApprovePlan}
                          >
                            Aprovar & Gerar Receita
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  )
}