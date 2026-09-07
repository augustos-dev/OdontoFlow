'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Loader2,
  CalendarX2,
  ArrowRight,
  PlusCircle,
  Package, // 👈 Substitua PackageAlert por Package
  Award
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import api from '@/lib/api'
import styles from './dashboardAdmin.module.css'

interface DashboardSummary {
  patients: { total: number; newThisMonth: number }
  appointments: { today: number; thisWeek: number; thisMonth: number }
  financial: { todayRevenue: number; monthRevenue: number; monthExpenses: number; monthProfit: number }
  inventory: { lowStockCount: number; expiringCount: number }
}

interface RevenueChartItem {
  date: string
  receitas: number
  despesas: number
  lucro: number
}

interface UpcomingAppointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  type: string
  room: string
  patient?: { id?: string; name: string; phone: string }
  dentist?: { id?: string; name: string }
}

interface TopDentist {
  dentistId: string
  name: string
  cro?: string
  appointmentsCount: number
}

export function DashboardAdmin() {
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<RevenueChartItem[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([])
  const [topDentists, setTopDentists] = useState<TopDentist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true)
        const [summaryRes, chartRes, upcomingRes, dentistsRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/revenue-chart').catch(() => ({ data: [] })),
          api.get('/dashboard/upcoming-appointments').catch(() => ({ data: [] })),
          api.get('/dashboard/top-dentists').catch(() => ({ data: [] })),
        ])

        setSummary(summaryRes.data)
        setChartData(Array.isArray(chartRes.data) ? chartRes.data : [])
        setUpcoming(Array.isArray(upcomingRes.data) ? upcomingRes.data : [])
        setTopDentists(Array.isArray(dentistsRes.data) ? dentistsRes.data : [])
      } catch (err) {
        console.error('Erro ao carregar dados do admin:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  function formatCurrency(v: number = 0) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const normalizedChartData = useMemo(() => {
    const daysMap = new Map<string, number>()
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      daysMap.set(dateKey, 0)
    }

    chartData.forEach((item) => {
      const key = item.date.slice(0, 10)
      if (daysMap.has(key)) {
        daysMap.set(key, Number(item.receitas || 0))
      }
    })

    return Array.from(daysMap.entries()).map(([date, receitas]) => {
      const [, m, d] = date.split('-')
      return {
        date,
        formattedDate: `${d}/${m}`,
        receitas,
      }
    })
  }, [chartData])

  const maxDentistAppointments = useMemo(() => {
    return Math.max(...topDentists.map((d) => d.appointmentsCount), 1)
  }, [topDentists])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className={styles.spinner} />
        <span>Carregando visão executiva...</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ─── Header Executivo ─── */}
      <div className={styles.header}>
        <div>
          <span className={styles.headerTag}>ODONTOFLOW • GESTÃO EXECUTIVA</span>
          <h1 className={styles.title}>Visão Geral da Clínica</h1>
        </div>
        <div className={styles.currentMonthBadge}>
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
      </div>

      {/* ─── KPIs Grid ─── */}
      <div className={styles.kpiGrid}>
        <div 
          className={styles.kpiCard}
          onClick={() => router.push('/pacientes')}
          title="Ver pacientes"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>PACIENTES ATIVOS</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconCyan}`}>
              <Users size={16} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{summary?.patients.total ?? 0}</span>
            <span className={styles.trendBadgePositive}>
              ↑ +{summary?.patients.newThisMonth ?? 0} no mês
            </span>
          </div>
        </div>

        <div 
          className={styles.kpiCard}
          onClick={() => router.push('/agenda')}
          title="Ver agenda"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>ATENDIMENTOS NO MÊS</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconSky}`}>
              <Calendar size={16} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{summary?.appointments.thisMonth ?? 0}</span>
            <span className={styles.kpiSubText}>
              {summary?.appointments.today ?? 0} hoje • {summary?.appointments.thisWeek ?? 0} na semana
            </span>
          </div>
        </div>

        <div 
          className={styles.kpiCard}
          onClick={() => router.push('/financeiro')}
          title="Ver receitas"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>FATURAMENTO MENSAL</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconEmerald}`}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{formatCurrency(summary?.financial.monthRevenue)}</span>
            <span className={styles.trendBadgeNeutral}>
              Hoje: {formatCurrency(summary?.financial.todayRevenue)}
            </span>
          </div>
        </div>

        <div 
          className={styles.kpiCard}
          onClick={() => router.push('/financeiro')}
          title="Ver fluxo de caixa"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>LUCRO LÍQUIDO</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconGreen}`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={styles.kpiBody}>
            <span className={`${styles.kpiValue} ${(summary?.financial.monthProfit ?? 0) >= 0 ? styles.profitPositive : styles.profitNegative}`}>
              {formatCurrency(summary?.financial.monthProfit)}
            </span>
            <span className={styles.kpiSubText}>
              Despesas: {formatCurrency(summary?.financial.monthExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Grid Central ─── */}
      <div className={styles.middleGrid}>
        {/* Gráfico Recharts com Margens Balanceadas */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.titleRow}>
                <h3 className={styles.cardTitle}>Fluxo de Receita Diária</h3>
                <span className={styles.unitPill}>R$ Reais</span>
              </div>
              <p className={styles.cardSubtitle}>Evolução dos últimos 7 dias faturados</p>
            </div>
            <button 
              className={styles.actionPillButton}
              onClick={() => router.push('/financeiro')}
            >
              Relatório Completo <ArrowRight size={12} />
            </button>
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={normalizedChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  width={42}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className={styles.chartTooltip}>
                          <span className={styles.tooltipHeader}>{data.formattedDate}</span>
                          <span className={styles.tooltipAmount}>{formatCurrency(data.receitas)}</span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coluna Operacional Lateral */}
        <div className={styles.sideCardsColumn}>
          {/* Card: Estoque */}
          <div 
            className={`${styles.statusCard} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.statusCardAlert : ''}`}
            onClick={() => router.push('/estoque')}
          >
            <div className={styles.statusCardHeader}>
              <div className={styles.statusTitleGroup}>
                {/* 👈 Troque <PackageAlert ... /> por <Package ... /> */}
                <Package size={16} className={(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.textRed : styles.textCyan} />
                <span className={styles.statusCardTitle}>Estoque Clínico</span>
              </div>
              <ArrowRight size={14} className={styles.arrowIcon} />
            </div>

            <div className={styles.statusMetricsGrid}>
              <div className={styles.metricBlock}>
                <span className={styles.metricLabel}>Insumos Críticos</span>
                <span className={`${styles.metricValue} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.textRed : styles.textSlate}`}>
                  {summary?.inventory.lowStockCount ?? 0} itens
                </span>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.metricBlock}>
                <span className={styles.metricLabel}>A Vencer (30d)</span>
                <span className={styles.metricValue}>{summary?.inventory.expiringCount ?? 0} itens</span>
              </div>
            </div>
          </div>

          {/* Card: Produtividade */}
          <div 
            className={styles.statusCard}
            onClick={() => router.push('/agenda')}
          >
            <div className={styles.statusCardHeader}>
              <div className={styles.statusTitleGroup}>
                <Activity size={16} className={styles.textSky} />
                <span className={styles.statusCardTitle}>Produtividade Clínica</span>
              </div>
              <ArrowRight size={14} className={styles.arrowIcon} />
            </div>

            <div className={styles.statusMetricsGrid}>
              <div className={styles.metricBlock}>
                <span className={styles.metricLabel}>Média Diária</span>
                <span className={styles.metricValue}>
                  {summary?.appointments.thisMonth ? (summary.appointments.thisMonth / 22).toFixed(1) : '0.0'} pac/dia
                </span>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.metricBlock}>
                <span className={styles.metricLabel}>Ocupação Estimada</span>
                <span className={styles.metricValueHighlight}>88%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid Inferior ─── */}
      <div className={styles.bottomGrid}>
        {/* Próximos Atendimentos */}
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Próximos Atendimentos Confirmados</h3>
              <p className={styles.cardSubtitle}>Fila de recepção e atendimentos imediatos</p>
            </div>
            <button 
              className={styles.textLinkButton}
              onClick={() => router.push('/agenda')}
            >
              Abrir Agenda Completa
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIconCircle}>
                <CalendarX2 size={24} />
              </div>
              <span className={styles.emptyTitle}>Nenhum atendimento agendado para hoje</span>
              <p className={styles.emptySubtitle}>Agende novas consultas diretamente pela tela de agenda.</p>
              <button 
                className={styles.emptyActionButton}
                onClick={() => router.push('/agenda')}
              >
                <PlusCircle size={14} /> Novo Agendamento
              </button>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>HORÁRIO</th>
                    <th>PACIENTE</th>
                    <th>DENTISTA</th>
                    <th>SALA</th>
                    <th>TIPO</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 5).map((appt) => (
                    <tr 
                      key={appt.id}
                      className={styles.tableRow}
                      onClick={() => router.push('/agenda')}
                    >
                      <td className={styles.timeText}>{formatTime(appt.dateTime)}</td>
                      <td className={styles.patientName}>{appt.patient?.name ?? 'Paciente'}</td>
                      <td className={styles.dentistText}>{appt.dentist?.name ?? 'Dentista'}</td>
                      <td>{appt.room?.replace('_', ' ') ?? 'Sala 1'}</td>
                      <td>
                        <span className={styles.typeBadge}>{appt.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ranking de Dentistas */}
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Top Dentistas do Mês</h3>
              <p className={styles.cardSubtitle}>Produtividade por atendimentos concluídos</p>
            </div>
          </div>

          {topDentists.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIconCircle}>
                <Award size={24} />
              </div>
              <span className={styles.emptyTitle}>Sem histórico de atendimentos</span>
              <p className={styles.emptySubtitle}>Os profissionais com procedimentos finalizados aparecerão listados aqui.</p>
            </div>
          ) : (
            <div className={styles.rankingList}>
              {topDentists.map((d, index) => {
                const percentage = Math.round((d.appointmentsCount / maxDentistAppointments) * 100)
                return (
                  <div key={d.dentistId} className={styles.rankingItem}>
                    <div className={styles.rankingTopRow}>
                      <span className={styles.rankingNumber}>#{index + 1}</span>
                      <div className={styles.rankingDoctorDetails}>
                        <span className={styles.rankingDoctorName}>{d.name}</span>
                        {d.cro && <span className={styles.rankingDoctorCro}>CRO: {d.cro}</span>}
                      </div>
                      <span className={styles.rankingCount}>
                        <strong>{d.appointmentsCount}</strong> consultas
                      </span>
                    </div>

                    <div className={styles.progressBarBg}>
                      <div 
                        className={styles.progressBarFill} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}