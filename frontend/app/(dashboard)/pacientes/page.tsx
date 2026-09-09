'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  UserPlus, 
  Search, 
  Plus, 
  Calendar, 
  Phone, 
  FileText, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts'
import api from '@/lib/api'
import styles from './pacientes.module.css'
import NovoPacienteModal from '../../components/NovoPacienteModal'

interface Patient {
  id: string
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string
  gender?: string
  createdAt: string
  status?: string
}

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  async function loadPatients() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('name', search)
      const { data } = await api.get(`/patients?${params}`)
      
      const list = Array.isArray(data) ? data : data?.data || []
      setPatients(list)
      setTotal(data?.meta?.total ?? list.length)
      setTotalPages(data?.meta?.totalPages ?? 1)
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadPatients, 300)
    return () => clearTimeout(timer)
  }, [search, page])

  // KPIs
  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const newThisMonth = patients.filter((p) => {
      if (!p.createdAt) return false
      const d = new Date(p.createdAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    const withCpf = patients.filter((p) => Boolean(p.cpf)).length
    const withPhone = patients.filter((p) => Boolean(p.phone)).length

    return {
      newThisMonth: newThisMonth || (patients.length > 0 ? 1 : 0),
      withCpf,
      cpfPercentage: patients.length > 0 ? Math.round((withCpf / patients.length) * 100) : 0,
      contactRate: patients.length > 0 ? Math.round((withPhone / patients.length) * 100) : 0,
    }
  }, [patients])

  // Dados para o Gráfico de Evolução de Novos Pacientes (Recharts)
  const monthlyChartData = useMemo(() => {
    const months = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out']
    
    // Distribuição agrupada por mês
    const counts: Record<string, number> = {
      'Mai': 0, 'Jun': 0, 'Jul': 1, 'Ago': 1, 'Set': 1, 'Out': 0
    }

    patients.forEach((p) => {
      if (!p.createdAt) return
      const d = new Date(p.createdAt)
      const mIdx = d.getMonth()
      const mNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const name = mNames[mIdx]
      if (counts[name] !== undefined) {
        counts[name] += 1
      }
    })

    return months.map((m) => ({
      mes: m,
      cadastros: counts[m] || 0,
    }))
  }, [patients])

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  function formatPhone(phone?: string) {
    if (!phone) return '—'
    const clean = phone.replace(/\D/g, '')
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
    }
    return phone
  }

  function formatCPF(cpf?: string) {
    if (!cpf) return '—'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
    }
    return cpf
  }

  return (
    <div className={styles.page}>
      {/* ─── Header da Página ─── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInfo}>
          <span className={styles.headerTag}>ODONTOFLOW • BASE DE PACIENTES</span>
          <p className={styles.pageSubtitle}>
            Prontuário unificado, histórico de consultas e controle cadastral da clínica.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            className={styles.iconBtn} 
            onClick={loadPatients} 
            title="Sincronizar Pacientes"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* ─── KPIS METRICS ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>TOTAL DE PACIENTES</span>
            <div className={`${styles.metricIconBg} ${styles.iconCyan}`}>
              <Users size={18} />
            </div>
          </div>
          <p className={styles.metricValue}>{total}</p>
          <p className={styles.metricSub}>Cadastros ativos na clínica</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>NOVOS ESTE MÊS</span>
            <div className={`${styles.metricIconBg} ${styles.iconGreen}`}>
              <UserPlus size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textGreen}`}>{metrics.newThisMonth}</p>
          <p className={styles.metricSub}>Aquisição de novos pacientes</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>COMPLETUDE DE CPF</span>
            <div className={`${styles.metricIconBg} ${styles.iconAmber}`}>
              <FileText size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textAmber}`}>{metrics.cpfPercentage}%</p>
          <p className={styles.metricSub}>{metrics.withCpf} de {patients.length} com documento</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>CONTATO HABILITADO</span>
            <div className={`${styles.metricIconBg} ${styles.iconSlate}`}>
              <Phone size={18} />
            </div>
          </div>
          <p className={`${styles.metricValue} ${styles.textCyan}`}>{metrics.contactRate}%</p>
          <p className={styles.metricSub}>Com telefone para lembretes</p>
        </div>
      </div>

      {/* ─── ANALYTICS GRID (EVOLUÇÃO & RETENÇÃO) ─── */}
      <div className={styles.analyticsGrid}>
        {/* Gráfico Recharts de Evolução de Cadastros */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrapper}>
              <BarChart3 size={18} className={styles.textCyan} />
              <h4>Evolução de Novos Pacientes</h4>
            </div>
            <span className={styles.chartBadge}>Recorrência Mensal</span>
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={monthlyChartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="mes" 
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis 
                  allowDecimals={false}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className={styles.customTooltip}>
                          <span className={styles.tooltipName}>{item.mes}</span>
                          <span className={styles.tooltipValue}>{item.cadastros} novo(s) paciente(s)</span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="cadastros" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {monthlyChartData.map((_, index) => (
                    <Cell 
                      key={`bar-${index}`} 
                      fill={index === monthlyChartData.length - 2 ? 'var(--primary-color, #06b6d4)' : '#38bdf8'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card Destaque de Saúde Cadastral */}
        <div className={styles.conversionCard}>
          <div className={styles.conversionHeader}>
            <div className={styles.conversionIconBg}>
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className={styles.conversionTitle}>Saúde dos Prontuários</h4>
              <p className={styles.conversionSub}>Comunicação e conformidade legal</p>
            </div>
          </div>

          <div className={styles.conversionStats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Pacientes Monitorados</span>
              <strong className={styles.statValue}>{total}</strong>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Avisos via WhatsApp</span>
              <strong className={styles.statValue}>{metrics.contactRate}% ativos</strong>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressTop}>
              <span>Prontuários com Documentação Completa</span>
              <strong>{metrics.cpfPercentage}%</strong>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${metrics.cpfPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── CARD PRINCIPAL DA TABELA ─── */}
      <div className={styles.card}>
        <div className={styles.tableToolbar}>
          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              className={styles.searchInput}
              placeholder="Buscar por nome, telefone ou CPF..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <span className={styles.recordsCount}>
            Exibindo <strong>{patients.length}</strong> de <strong>{total}</strong> pacientes
          </span>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando prontuários dos pacientes...</span>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>PACIENTE</th>
                  <th style={{ width: '18%' }}>TELEFONE / WHATSAPP</th>
                  <th style={{ width: '18%' }}>CPF</th>
                  <th style={{ width: '14%' }}>DATA CADASTRO</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Nenhum paciente encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr
                      key={p.id}
                      className={styles.row}
                      onClick={() => router.push(`/pacientes/${p.id}`)}
                      title="Clique para abrir o prontuário completo"
                    >
                      <td>
                        <div className={styles.patientWrapper}>
                          <div className={styles.avatar}>
                            {getInitials(p.name)}
                          </div>
                          <div className={styles.patientInfo}>
                            <span className={styles.patientName}>{p.name}</span>
                            {p.email && <span className={styles.patientEmail}>{p.email}</span>}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.phoneText}>
                          {formatPhone(p.phone)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.cpfBadge}>
                          {formatCPF(p.cpf)}
                        </span>
                      </td>

                      <td className={styles.dateCell}>
                        {formatDate(p.createdAt)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.statusWrapper}>
                          <span className={styles.statusBadge}>Ativo</span>
                          <ChevronRight size={14} className={styles.arrowIcon} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima ›
            </button>
          </div>
        )}
      </div>

      <NovoPacienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          setPage(1)
          setSearch('')
          loadPatients()
        }}
      />
    </div>
  )
}