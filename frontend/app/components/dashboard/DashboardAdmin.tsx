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
  ArrowRight
} from 'lucide-react'
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
  patient?: { name: string; phone: string }
  dentist?: { name: string }
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

  // Normaliza os dados dos últimos 7 dias para o gráfico preencher a tela de ponta a ponta
  const normalizedChartData = useMemo(() => {
    const daysMap = new Map<string, number>()
    
    // Inicializa os últimos 7 dias
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      daysMap.set(dateKey, 0)
    }

    // Preenche com os dados reais retornados da API
    chartData.forEach((item) => {
      const key = item.date.slice(0, 10)
      if (daysMap.has(key)) {
        daysMap.set(key, Number(item.receitas || 0))
      }
    })

    return Array.from(daysMap.entries()).map(([date, receitas]) => ({
      date,
      receitas,
    }))
  }, [chartData])

  // Geração da curva SVG suavizada
  const { svgPath, svgArea } = useMemo(() => {
    if (normalizedChartData.length === 0) return { svgPath: '', svgArea: '' }
    
    const max = Math.max(...normalizedChartData.map((d) => d.receitas), 100) * 1.2
    const width = 500
    const height = 130
    const paddingBottom = 15

    const points = normalizedChartData.map((d, i, arr) => {
      const x = (i / (arr.length - 1 || 1)) * width
      const y = height - paddingBottom - (d.receitas / max) * (height - paddingBottom - 10)
      return { x, y }
    })

    if (points.length === 1) {
      return {
        svgPath: `M 0,${points[0].y} L ${width},${points[0].y}`,
        svgArea: `M 0,${points[0].y} L ${width},${points[0].y} L ${width},${height} L 0,${height} Z`,
      }
    }

    // Curva Bezier
    let path = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = (current.x + next.x) / 2
      path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`
    }

    const area = `${path} L ${width},${height} L 0,${height} Z`

    return { svgPath: path, svgArea: area }
  }, [normalizedChartData])

  // Maior quantidade de atendimentos no ranking para cálculo de % da barra
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
      {/* ─── Header de Visão Executiva ─── */}
      <div className={styles.header}>
        <div>
          <span className={styles.headerTag}>ODONTOFLOW • GESTÃO EXECUTIVA</span>
          <h1 className={styles.title}>Visão Geral da Clínica</h1>
        </div>
        <div className={styles.currentMonthBadge}>
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
      </div>

      {/* ─── 4 KPIs Executivos do Topo com Cores de Destaque ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>PACIENTES ATIVOS</span>
            <div className={`${styles.iconCircle} ${styles.iconPacientes}`}>
              <Users size={16} />
            </div>
          </div>
          <span className={styles.kpiValue}>{summary?.patients.total ?? 0}</span>
          <span className={styles.kpiTrendPositive}>
            ↑ +{summary?.patients.newThisMonth ?? 0} novos este mês
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>ATENDIMENTOS NO MÊS</span>
            <div className={`${styles.iconCircle} ${styles.iconAgenda}`}>
              <Calendar size={16} />
            </div>
          </div>
          <span className={styles.kpiValue}>{summary?.appointments.thisMonth ?? 0}</span>
          <span className={styles.kpiSub}>
            {summary?.appointments.today ?? 0} hoje • {summary?.appointments.thisWeek ?? 0} esta semana
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>FATURAMENTO MENSAL</span>
            <div className={`${styles.iconCircle} ${styles.iconReceita}`}>
              <DollarSign size={16} />
            </div>
          </div>
          <span className={styles.kpiValue}>{formatCurrency(summary?.financial.monthRevenue)}</span>
          <span className={styles.kpiTrendPositive}>
            Hoje: {formatCurrency(summary?.financial.todayRevenue)}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>LUCRO LÍQUIDO</span>
            <div className={`${styles.iconCircle} ${styles.iconLucro}`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <span className={`${styles.kpiValue} ${(summary?.financial.monthProfit ?? 0) >= 0 ? styles.profitGreen : styles.profitRed}`}>
            {formatCurrency(summary?.financial.monthProfit)}
          </span>
          <span className={styles.kpiSub}>
            Despesas: {formatCurrency(summary?.financial.monthExpenses)}
          </span>
        </div>
      </div>

      {/* ─── Grid Central: Gráfico de Receita & Cards Operacionais ─── */}
      <div className={styles.middleGrid}>
        {/* Curva de Receitas & Fluxo */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Fluxo de Receita Diária</span>
              <p className={styles.cardSubtitle}>Evolução dos últimos 7 dias</p>
            </div>
            <span className={styles.cardBadge}>Tempo Real</span>
          </div>

          <div className={styles.chartWrapper}>
            <svg viewBox="0 0 500 130" className={styles.svgChart} preserveAspectRatio="none">
              <defs>
                <linearGradient id="adminChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines horizontais sutis */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2="500" y2="65" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" strokeDasharray="3 3" />

              {svgArea && <path d={svgArea} fill="url(#adminChartGradient)" />}
              {svgPath && <path d={svgPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />}
            </svg>
          </div>

          <div className={styles.chartFooter}>
            {normalizedChartData.map((item, idx) => {
              const [y, m, d] = item.date.split('-')
              return (
                <div key={idx} className={styles.chartColLabel}>
                  <span className={styles.chartDateLabel}>{`${d}/${m}`}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status de Estoque & Produtividade */}
        <div className={styles.cardsPairColumn}>
          <div 
            className={`${styles.miniCard} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.miniCardAlert : ''}`}
            onClick={() => router.push('/estoque')}
          >
            <div className={styles.miniCardHeader}>
              <div className={styles.headerLeft}>
                <div className={`${styles.unitDot} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.unitDotRed : styles.unitDotGreen}`} />
                <span className={styles.unitTitle}>Status de Estoque Clínico</span>
              </div>
              <ArrowRight size={14} className={styles.miniCardArrow} />
            </div>
            
            <div className={styles.unitMetrics}>
              <div>
                <span className={styles.unitLabel}>Insumos Críticos</span>
                <span className={`${styles.unitValue} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.alertRed : ''}`}>
                  {summary?.inventory.lowStockCount ?? 0} {summary?.inventory.lowStockCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div>
                <span className={styles.unitLabel}>A Vencer (30d)</span>
                <span className={styles.unitValue}>{summary?.inventory.expiringCount ?? 0} itens</span>
              </div>
            </div>
          </div>

          <div className={styles.miniCard}>
            <div className={styles.miniCardHeader}>
              <div className={styles.headerLeft}>
                <Activity size={14} className={styles.unitIconBlue} />
                <span className={styles.unitTitle}>Produtividade Clínica</span>
              </div>
            </div>
            
            <div className={styles.unitMetrics}>
              <div>
                <span className={styles.unitLabel}>Média Diária</span>
                <span className={styles.unitValue}>
                  {summary?.appointments.thisMonth ? (summary.appointments.thisMonth / 22).toFixed(1) : '0.0'} pac/dia
                </span>
              </div>
              <div>
                <span className={styles.unitLabel}>Taxa de Ocupação</span>
                <span className={styles.unitValue}>88%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid Inferior: Próximos Atendimentos & Ranking de Dentistas ─── */}
      <div className={styles.bottomGrid}>
        {/* Próximos Atendimentos Confirmados */}
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Próximos Atendimentos Confirmados</span>
          </div>

          {upcoming.length === 0 ? (
            <div className={styles.emptyTableState}>
              <CalendarX2 size={32} className={styles.emptyTableIcon} />
              <p className={styles.emptyTableText}>Nenhum agendamento pendente para as próximas horas.</p>
            </div>
          ) : (
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
                  <tr key={appt.id}>
                    <td className={styles.timeCell}>{formatTime(appt.dateTime)}</td>
                    <td className={styles.boldCell}>{appt.patient?.name ?? 'Paciente'}</td>
                    <td>{appt.dentist?.name ?? 'Dentista'}</td>
                    <td>{appt.room?.replace('_', ' ') ?? 'Sala 1'}</td>
                    <td>
                      <span className={styles.pillBadge}>{appt.type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ranking de Dentistas com Barras de Progresso */}
        <div className={styles.dentistRankingCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Top Dentistas do Mês</span>
          </div>

          <div className={styles.rankingList}>
            {topDentists.length === 0 ? (
              <div className={styles.emptyTableState}>
                <p className={styles.emptyTableText}>Nenhum atendimento finalizado registrado neste mês.</p>
              </div>
            ) : (
              topDentists.map((d, index) => {
                const percentage = Math.round((d.appointmentsCount / maxDentistAppointments) * 100)
                return (
                  <div key={d.dentistId} className={styles.rankingRow}>
                    <div className={styles.rankTop}>
                      <div className={styles.rankBadge}>#{index + 1}</div>
                      <div className={styles.dentistInfo}>
                        <span className={styles.dentistName}>{d.name}</span>
                        {d.cro && <span className={styles.dentistCro}>CRO: {d.cro}</span>}
                      </div>
                      <div className={styles.dentistScore}>
                        <strong>{d.appointmentsCount}</strong>
                        <span>{d.appointmentsCount === 1 ? 'consulta' : 'consultas'}</span>
                      </div>
                    </div>

                    {/* Barra de Progresso Relativa */}
                    <div className={styles.progressTrack}>
                      <div 
                        className={styles.progressBar} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}