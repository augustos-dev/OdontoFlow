'use client'

import { useEffect, useState } from 'react'
import { Crown, Sparkles, X } from 'lucide-react'
import api from '@/lib/api'
import styles from './agenda.module.css'
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  room: string
  type: string
  notes?: string
  procedureId?: string
  procedure?: {
    id: string
    name: string
    basePrice?: number
  }
  isWaitingList?: boolean
  patient: { id: string; name: string; phone: string }
  dentist: { id: string; name: string }
}

type UserPlan = 'BASIC' | 'PREMIUM' | 'ENTERPRISE'

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ATENDIMENTO: 'Em Atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  FALTOU: 'Faltou',
  ESPERA: 'Fila de Espera',
}

const ALL_ROOMS = ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4']

const START_HOUR = 8
const END_HOUR = 18
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const h = (START_HOUR + i).toString().padStart(2, '0')
  return `${h}:00`
})

const SLOT_15MIN_HEIGHT = 40

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  // 🟢 PLANO DO CLIENTE (Mock/API - Alterne para testar: 'BASIC' | 'PREMIUM' | 'ENTERPRISE')
  const [userPlan, setUserPlan] = useState<UserPlan>('PREMIUM')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [blockedPlanFeature, setBlockedPlanFeature] = useState('')

  // 🟢 CONFIGURAÇÃO DE QUANTIDADE DE SALAS (Padrão 2 salas)
  const [roomsCount, setRoomsCount] = useState<number>(2)
  const [selectedSingleRoom, setSelectedSingleRoom] = useState<string>('ALL')

  // Drag & Drop
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)
  const [now, setNow] = useState<Date>(new Date())
  const [pendingMove, setPendingMove] = useState<{ appt: Appointment; newHour: string; newRoom: string } | null>(null)
  const [timeErrorAlert, setTimeErrorAlert] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Carrega agendamentos e valida plano do usuário
  async function loadAppointments(date: string) {
    setLoading(true)
    try {
      const [apptRes, meRes] = await Promise.allSettled([
        api.get(`/appointments?date=${date}&limit=100`),
        api.get('/api/auth/me'),
      ])

      if (apptRes.status === 'fulfilled') {
        setAppointments(apptRes.value.data?.data || apptRes.value.data || [])
      }

      if (meRes.status === 'fulfilled') {
        const plan = meRes.value.data?.tenant?.plan || 'PREMIUM'
        setUserPlan(plan)
      }
    } catch (err) {
      console.error('Erro ao carregar dados da agenda:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments(selectedDate)
  }, [selectedDate])

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function parseTimeComponents(dateTimeStr: string) {
    const dt = new Date(dateTimeStr)
    return {
      hours: dt.getHours(),
      minutes: dt.getMinutes(),
    }
  }

  function getApptsByRoom(room: string) {
    return appointments.filter((a) => a.room === room && !a.isWaitingList && a.status !== 'ESPERA')
  }

  function getStatusClass(status: string) {
    const map: Record<string, string> = {
      CONFIRMADO: styles.confirmado,
      EM_ATENDIMENTO: styles.emAtendimento,
      FINALIZADO: styles.finalizado,
      AGENDADO: styles.agendado,
      CANCELADO: styles.cancelado,
      FALTOU: styles.cancelado,
      ESPERA: styles.espera,
    }
    return map[status] ?? styles.agendado
  }

  function getAppointmentStyle(dateTimeStr: string, durationMin: number = 15) {
    const { hours, minutes } = parseTimeComponents(dateTimeStr)
    const minutesFromStart = (hours - START_HOUR) * 60 + minutes
    const top = (minutesFromStart / 15) * SLOT_15MIN_HEIGHT
    const calculatedHeight = (durationMin / 15) * SLOT_15MIN_HEIGHT - 2
    const height = Math.max(calculatedHeight, 24)

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  // 🟢 VALIDADOR DE TROCA DE QUANTIDADE DE SALAS COM TRAVA PLG
  function handleRoomsCountChange(newCount: number) {
    // Regra: Básico suporta 1 sala. Premium suporta até 2. Enterprise suporta 3 ou 4.
    if (newCount > 1 && userPlan === 'BASIC') {
      setBlockedPlanFeature('Visualização simultânea de 2 ou mais salas disponível a partir do Plano Premium.')
      setShowUpgradeModal(true)
      return
    }

    if (newCount > 2 && userPlan !== 'ENTERPRISE') {
      setBlockedPlanFeature('Visualização simultânea de 3, 4 ou mais cadeiras é exclusiva do Plano Enterprise.')
      setShowUpgradeModal(true)
      return
    }

    setRoomsCount(newCount)
    setSelectedSingleRoom('ALL')
  }

  // Determina quais salas serão renderizadas na grade
  const visibleRooms = selectedSingleRoom !== 'ALL'
    ? [selectedSingleRoom]
    : ALL_ROOMS.slice(0, roomsCount)

  // Linha de tempo real
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)
  const nowHours = now.getHours()
  const nowMins = now.getMinutes()
  const nowMinutesFromStart = (nowHours - START_HOUR) * 60 + nowMins
  const realTimeTop = (nowMinutesFromStart / 15) * SLOT_15MIN_HEIGHT

  // Drag & Drop
  function handleDragStart(e: React.DragEvent, appt: Appointment) {
    setDraggedAppt(appt)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, room: string) {
    e.preventDefault()
    if (!draggedAppt) return

    const roomBodyEl = e.currentTarget.closest(`.${styles.roomBody}`)
    if (!roomBodyEl) return

    const rect = roomBodyEl.getBoundingClientRect()
    const offsetY = e.clientY - rect.top

    const slotIndex = Math.floor(offsetY / SLOT_15MIN_HEIGHT)
    const totalMinutes = START_HOUR * 60 + slotIndex * 15

    const newHourNum = Math.floor(totalMinutes / 60)
    const newMinuteNum = totalMinutes % 60

    if (newHourNum < START_HOUR || newHourNum > END_HOUR) return

    if (isToday) {
      const dropTimeInMinutes = newHourNum * 60 + newMinuteNum
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes()

      if (dropTimeInMinutes < currentTimeInMinutes) {
        setTimeErrorAlert('Não é possível mover um agendamento para um horário que já passou.')
        setDraggedAppt(null)
        return
      }
    }

    const formattedHour = String(newHourNum).padStart(2, '0')
    const formattedMinute = String(newMinuteNum).padStart(2, '0')
    const timeString = `${formattedHour}:${formattedMinute}`

    setPendingMove({
      appt: draggedAppt,
      newRoom: room,
      newHour: timeString,
    })

    setDraggedAppt(null)
  }

  async function confirmMoveAppointment() {
    if (!pendingMove) return
    const { appt, newHour, newRoom } = pendingMove

    const previousAppointments = [...appointments]
    const [hours, minutes] = newHour.split(':')
    const [year, month, day] = selectedDate.split('-').map(Number)

    const updatedDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes || '0'))
    const newISOString = updatedDate.toISOString()

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appt.id
          ? {
              ...a,
              dateTime: newISOString,
              room: newRoom,
              status: a.status === 'ESPERA' ? 'AGENDADO' : a.status,
              isWaitingList: false,
            }
          : a
      )
    )

    setPendingMove(null)

    try {
      await api.put(`/appointments/${appt.id}`, {
        dateTime: newISOString,
        room: newRoom,
        status: appt.status === 'ESPERA' ? 'AGENDADO' : appt.status,
      })
    } catch (err) {
      console.error('Erro ao remarcar agendamento:', err)
      setAppointments(previousAppointments)
      setTimeErrorAlert('Sem conexão com o servidor. A alteração foi desfeita.')
    }
  }

  const waitingList = appointments.filter((a) => a.status === 'ESPERA' || a.isWaitingList)
  const regularAppointments = appointments.filter((a) => a.status !== 'ESPERA' && !a.isWaitingList)

  return (
    <div className={styles.page}>
      {/* NAVBAR */}
      <div className={styles.toolbar}>
        <div className={styles.dateNav}>
          <button
            className={styles.dateBtn}
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00')
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().slice(0, 10))
            }}
          >
            ‹
          </button>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className={styles.dateBtn}
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00')
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().slice(0, 10))
            }}
          >
            ›
          </button>
        </div>

        {/* 🟢 SELETOR DE QUANTIDADE DE SALAS & FILTROS COM TRAVA DE PLANO */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          
          {/* Seletor de Quantidade de Telas/Salas */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(1)}
              style={{
                border: 'none',
                background: roomsCount === 1 ? '#ffffff' : 'transparent',
                color: roomsCount === 1 ? '#0f172a' : '#64748b',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: roomsCount === 1 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              1 Sala
            </button>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(2)}
              style={{
                border: 'none',
                background: roomsCount === 2 ? '#ffffff' : 'transparent',
                color: roomsCount === 2 ? '#0f172a' : '#64748b',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: roomsCount === 2 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              2 Salas (Padrão)
            </button>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(4)}
              style={{
                border: 'none',
                background: roomsCount === 4 ? '#ffffff' : 'transparent',
                color: roomsCount === 4 ? '#0284c7' : '#64748b',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: roomsCount === 4 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <span>4 Salas</span>
              <Crown size={12} color="#0284c7" />
            </button>
          </div>

          {/* Filtro de Foco em Sala Específica */}
          <select
            value={selectedSingleRoom}
            onChange={(e) => setSelectedSingleRoom(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Visualizar Grid</option>
            {ALL_ROOMS.map((r) => (
              <option key={r} value={r}>
                Apenas {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dotConfirmado} /> Confirmado
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dotEmAtendimento} /> Em Atend.
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dotFinalizado} /> Finalizado
          </span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Agenda do Dia</h2>
              <p className={styles.cardSub}>
                Exibindo <strong>{visibleRooms.length} {visibleRooms.length === 1 ? 'sala' : 'salas simultâneas'}</strong> • Grade a cada 15 min (08:00 às 18:00)
              </p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Carregando agenda...</div>
          ) : (
            <div className={styles.gridContainer}>
              <div className={styles.grid}>

                {/* COLUNA DOS HORÁRIOS */}
                <div className={styles.timeCol}>
                  <div className={styles.timeColHeader} />
                  <div className={styles.timeColBody}>
                    {HOURS.map((h) => (
                      <div key={h} className={styles.timeSlot}>
                        {h}
                      </div>
                    ))}

                    {isToday && nowHours >= START_HOUR && nowHours <= END_HOUR && (
                      <span
                        className={styles.realTimeBadge}
                        style={{ top: `${realTimeTop}px` }}
                      >
                        {formatTime(now.toISOString())}
                      </span>
                    )}
                  </div>
                </div>

                {/* COLUNAS DAS SALAS RENDERIZADAS DINAMICAMENTE */}
                {visibleRooms.map((room) => {
                  const roomAppts = getApptsByRoom(room)

                  return (
                    <div key={room} className={styles.roomCol}>
                      <div className={styles.roomHeader}>
                        {room.replace('_', ' ')}
                      </div>

                      <div 
                        className={styles.roomBody}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, room)}
                      >
                        {HOURS.map((h) => (
                          <div key={h} className={styles.hourSlot}>
                            <div className={styles.vagoContent}>
                              <button
                                className={styles.btnAddVago}
                                title={`Agendar para ${h} na ${room.replace('_', ' ')}`}
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* LINHA DE TEMPO REAL */}
                        {isToday && nowHours >= START_HOUR && nowHours <= END_HOUR && (
                          <div
                            className={styles.realTimeLine}
                            style={{ top: `${realTimeTop}px` }}
                          />
                        )}

                        {/* CARDS POSICIONADOS */}
                        {roomAppts.map((appt) => {
                          const cardStyle = getAppointmentStyle(appt.dateTime, appt.durationMin)

                          return (
                            <div
                              key={appt.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, appt)}
                              className={`${styles.apptCard} ${getStatusClass(appt.status)}`}
                              onClick={() => setSelectedAppt(appt)}
                              style={{
                                top: cardStyle.top,
                                height: cardStyle.height,
                              }}
                            >
                              <div className={styles.apptHeaderRow}>
                                <div className={styles.apptMainInfo}>
                                  <span className={styles.apptTime}>{formatTime(appt.dateTime)}</span>
                                  <span className={styles.apptName}>{appt.patient?.name || 'Paciente'}</span>
                                </div>
                                <span className={styles.apptBadge}>{STATUS_LABEL[appt.status] || appt.status}</span>
                              </div>
                            </div>
                          )
                        })}

                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR DA RECEPÇÃO */}
        <aside className={styles.sidePanel}>
          <h3 className={styles.sideTitle}>Resumo da Recepção</h3>

          <div className={styles.waitingSection}>
            <span className={styles.sectionLabel}>Próximos a Atender</span>
            {regularAppointments.filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO').length === 0 ? (
              <p className={styles.emptyText}>Nenhum agendamento pendente.</p>
            ) : (
              regularAppointments
                .filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO')
                .slice(0, 4)
                .map((a) => (
                  <div key={a.id} className={styles.miniCard} onClick={() => setSelectedAppt(a)}>
                    <strong>{a.patient?.name}</strong>
                    <span>{formatTime(a.dateTime)} • {a.room.replace('_', ' ')}</span>
                  </div>
                ))
            )}
          </div>

          <div className={styles.sideSection}>
            <div className={styles.sideHeaderRow}>
              <span className={styles.sectionLabel}>Fila de Espera / Encaixe ({waitingList.length})</span>
            </div>

            {waitingList.length === 0 ? (
              <p className={styles.emptyText}>Nenhum paciente no encaixe.</p>
            ) : (
              waitingList.map((a) => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, a)}
                  className={styles.waitingCard}
                  onClick={() => setSelectedAppt(a)}
                >
                  <strong>{a.patient?.name}</strong>
                  <span>{a.notes || 'Aguardando brecha / Encaixe'}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* MODAL DE UPGRADE ENTERPRISE (PLG) */}
      {showUpgradeModal && (
        <div className={styles.confirmOverlay} onClick={() => setShowUpgradeModal(false)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: '#e0f2fe', color: '#0284c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Sparkles size={24} />
            </div>
            <h3 className={styles.confirmTitle} style={{ fontSize: '18px' }}>Desbloqueie o Modo Multi-Salas</h3>
            <p className={styles.confirmText} style={{ fontSize: '13px', color: '#475569', margin: '8px 0 16px' }}>
              {blockedPlanFeature}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'left', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Plano Enterprise (R$ 319,99/mês):</div>
              <div style={{ color: '#64748b' }}>✦ Visualização simultânea de 4+ salas e cadeiras.</div>
              <div style={{ color: '#64748b' }}>✦ Baixa dupla na recepção com trava de idempotência.</div>
              <div style={{ color: '#64748b' }}>✦ Relatórios de consumo e suporte prioritário.</div>
            </div>
            <div className={styles.confirmActions} style={{ justifyContent: 'center', gap: '10px' }}>
              <button className={styles.btnCancel} onClick={() => setShowUpgradeModal(false)}>
                Agora não
              </button>
              <button 
                className={styles.btnConfirm} 
                onClick={() => {
                  setShowUpgradeModal(false)
                  alert('Redirecionando para upgrade de plano...')
                }}
              >
                Fazer Upgrade Enterprise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO */}
      {timeErrorAlert && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.errorIcon}>!</div>
            <h3 className={styles.confirmTitle}>Horário Indisponível</h3>
            <p className={styles.confirmText}>{timeErrorAlert}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnConfirm} onClick={() => setTimeErrorAlert(null)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE TROCA */}
      {pendingMove && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>!</div>
            <h3 className={styles.confirmTitle}>Alterar agendamento</h3>
            <p className={styles.confirmText}>
              Tem certeza que deseja mover <strong>{pendingMove.appt.patient?.name || 'Paciente'}</strong> para as{' '}
              <strong>{pendingMove.newHour}</strong> na <strong>{pendingMove.newRoom.replace('_', ' ')}</strong>?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setPendingMove(null)}>
                Cancelar
              </button>
              <button className={styles.btnConfirm} onClick={confirmMoveAppointment}>
                Alterar agendamento
              </button>
            </div>
          </div>
        </div>
      )}

      <DetalhesAgendamentoModal
        appointment={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => loadAppointments(selectedDate)}
      />
    </div>
  )
}