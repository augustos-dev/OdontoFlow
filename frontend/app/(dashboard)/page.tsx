'use client'

import { useEffect, useState } from 'react'
import { 
  Stethoscope, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  Calendar as CalendarIcon 
} from 'lucide-react'
import api from '@/lib/api'
import styles from './page.module.css'
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'

interface Summary {
  patients: { total: number; newThisMonth: number }
  appointments: { today: number; thisWeek: number; thisMonth: number; byStatus: Record<string, number> }
  financial: { todayRevenue: number; weekRevenue: number; monthRevenue: number; monthExpenses: number; monthProfit: number }
  inventory: { lowStockCount: number; expiringCount: number }
}

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  room: string
  type: string
  notes?: string
  cancellationReason?: string
  transaction?: null
  patient: { id: string; name: string; phone: string }
  dentist: { id: string; name: string }
}

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ATENDIMENTO: 'Em Atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  FALTOU: 'Faltou',
  ESPERA: 'Espera',
}

const STATUS_CLASS: Record<string, string> = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  EM_ATENDIMENTO: 'emAtendimento',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado',
  FALTOU: 'cancelado',
  ESPERA: 'espera',
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [waiting, setWaiting] = useState<Appointment[]>([])
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  async function load() {
    try {
      const [summaryRes, upcomingRes, todayRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/upcoming-appointments'),
        api.get(`/appointments?date=${today}&limit=50`),
      ])
      setSummary(summaryRes.data)
      setUpcoming(upcomingRes.data)
      
      const allToday = todayRes.data.data || []
      setTodayAppts(allToday)
      setWaiting(allToday.filter((a: Appointment) => a.status === 'ESPERA'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [today])

  const byRoom: Record<string, Appointment[]> = {}
  for (const appt of upcoming) {
    if (!byRoom[appt.room]) byRoom[appt.room] = []
    byRoom[appt.room].push(appt)
  }

  const rooms = ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4'].filter((r) => byRoom[r]?.length)

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Agendamentos ativos para o resumo operacional (Confirmados, Agendados e Em Atendimento)
  const activeAppointments = todayAppts.filter(
    (a) => a.status === 'EM_ATENDIMENTO' || a.status === 'CONFIRMADO' || a.status === 'AGENDADO'
  )

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando informações...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ─── Cards de métricas ─── */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBg}>
              <Stethoscope size={20} color="var(--primary)" />
            </div>
          </div>
          <p className={styles.metricLabel}>ATENDIMENTOS HOJE</p>
          <p className={styles.metricValue}>{summary?.appointments.today ?? 0}</p>
          <p className={styles.metricSub}>agendamentos no dia</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBg}>
              <Clock size={20} color="#0284c7" />
            </div>
          </div>
          <p className={styles.metricLabel}>FILA DE ESPERA</p>
          <p className={styles.metricValue}>{waiting.length}</p>
          <p className={styles.metricSub}>Pacientes aguardando</p>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBg}>
              <TrendingUp size={20} color="#16a34a" />
            </div>
          </div>
          <p className={styles.metricLabel}>RECEITA DO DIA</p>
          <p className={`${styles.metricValue} ${styles.metricValueLarge}`}>
            {formatCurrency(summary?.financial.todayRevenue ?? 0)}
          </p>
          <p className={styles.metricSub}>receita de hoje</p>
        </div>

        <div className={`${styles.metricCard} ${(summary?.inventory.lowStockCount ?? 0) > 0 ? styles.metricCardAlert : ''}`}>
          <div className={styles.metricIconHeader}>
            <div className={styles.metricIconBgAlert}>
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            {(summary?.inventory.lowStockCount ?? 0) > 0 && (
              <span className={styles.alertBadge}>ATENÇÃO</span>
            )}
          </div>
          <p className={styles.metricLabel}>INSUMOS CRÍTICOS</p>
          <p className={styles.metricValue}>{summary?.inventory.lowStockCount ?? 0}</p>
          <p className={styles.metricSub}>Reposição necessária</p>
        </div>
      </div>

      {/* ─── Agenda + Resumo da Recepção ─── */}
      <div className={styles.mainGrid}>
        <div className={styles.agendaCard}>
          <div className={styles.agendaHeader}>
            <div>
              <h2 className={styles.agendaTitle}>Agenda do Dia</h2>
              <p className={styles.agendaSub}>Clique em um agendamento para ver detalhes</p>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}><span className={styles.dotConfirmado} /> Confirmado</span>
              <span className={styles.legendItem}><span className={styles.dotEmAtendimento} /> Em Atend.</span>
              <span className={styles.legendItem}><span className={styles.dotFinalizado} /> Finalizado</span>
            </div>
          </div>

          <div className={styles.roomsGrid} style={{ gridTemplateColumns: `repeat(${Math.max(rooms.length, 2)}, 1fr)` }}>
            {(rooms.length ? rooms : ['SALA_1', 'SALA_2']).map((room) => (
              <div key={room} className={styles.roomCol}>
                <div className={styles.roomHeader}>{room.replace('_', ' ')}</div>
                <div className={styles.roomSlots}>
                  {(byRoom[room] ?? []).map((appt) => (
                    <div
                      key={appt.id}
                      className={`${styles.apptCard} ${styles[STATUS_CLASS[appt.status] ?? 'agendado']}`}
                      onClick={() => setSelectedAppt(appt)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.apptTime}>
                        <Clock size={12} />
                        <span>{formatTime(appt.dateTime)}</span>
                      </div>
                      <div className={styles.apptName}>{appt.patient.name}</div>
                      <div className={styles.apptNote}>{appt.notes ?? appt.dentist.name}</div>
                      <span className={styles.apptStatus}>{STATUS_LABEL[appt.status]}</span>
                    </div>
                  ))}
                  {!byRoom[room]?.length && (
                    <div className={styles.emptySlot}>
                      <CalendarIcon size={20} className={styles.emptyIcon} />
                      <span>Sem agendamentos</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── PAINEL LATERAL: RESUMO DA RECEPÇÃO ─── */}
        <div className={styles.sidePanel}>
          
          {/* BLOCO 1: EM ATENDIMENTO / PRÓXIMOS */}
          <div className={styles.waitingCard}>
            <div className={styles.waitingHeader}>
              <div>
                <h2 className={styles.waitingTitle}>Resumo da Recepção</h2>
                <p className={styles.waitingSub}>Próximos a atender</p>
              </div>
            </div>
            <div className={styles.waitingList}>
              {activeAppointments.length === 0 ? (
                <p className={styles.emptyWaiting}>Nenhum atendimento pendente hoje.</p>
              ) : (
                activeAppointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    className={styles.waitingItem}
                    onClick={() => setSelectedAppt(appt)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.waitingAvatar}>
                      {appt.patient.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div className={styles.waitingInfo}>
                      <div className={styles.waitingName}>{appt.patient.name}</div>
                      <div className={styles.waitingTime}>
                        <Clock size={12} />
                        <span>{formatTime(appt.dateTime)} • {appt.room.replace('_', ' ')}</span>
                      </div>
                      <div className={styles.waitingNote}>{appt.notes ?? appt.type}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BLOCO 2: FILA DE ESPERA / ENCAIXE */}
          <div className={styles.waitingCard}>
            <div className={styles.waitingHeader}>
              <div>
                <h2 className={styles.waitingTitle}>Fila de Espera</h2>
                <p className={styles.waitingSub}>Encaixe / Aguardando</p>
              </div>
              <span className={styles.waitingCount}>{waiting.length}</span>
            </div>
            <div className={styles.waitingList}>
              {waiting.length === 0 ? (
                <p className={styles.emptyWaiting}>Nenhum paciente na fila</p>
              ) : (
                waiting.map((appt, i) => (
                  <div
                    key={appt.id}
                    className={styles.waitingItem}
                    onClick={() => setSelectedAppt(appt)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.waitingAvatar}>
                      {appt.patient.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div className={styles.waitingInfo}>
                      <div className={styles.waitingName}>{appt.patient.name}</div>
                      <div className={styles.waitingTime}>
                        <Clock size={12} />
                        <span>{formatTime(appt.dateTime)}</span>
                      </div>
                      <div className={styles.waitingNote}>{appt.notes ?? 'Aguardando consulta'}</div>
                    </div>
                    <span className={styles.waitingPos}>#{i + 1}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Modal de detalhes ─── */}
      <DetalhesAgendamentoModal
        appointment={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => {
          setSelectedAppt(null)
          load()
        }}
      />
    </div>
  )
}