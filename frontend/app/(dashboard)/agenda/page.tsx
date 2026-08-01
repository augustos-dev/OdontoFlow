'use client'

import { useEffect, useState } from 'react'
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
  isWaitingList?: boolean
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
  ESPERA: 'Fila de Espera',
}

const ROOMS = ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4']

const START_HOUR = 8
const END_HOUR = 18
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const h = (START_HOUR + i).toString().padStart(2, '0')
  return `${h}:00`
})

// 32px a cada 15 min -> 128px por hora
const SLOT_15MIN_HEIGHT = 32

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  // Estado para controlar a consulta em Drag & Drop
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)

  const [now, setNow] = useState<Date>(new Date())
  const [pendingMove, setPendingMove] = useState<{ appt: Appointment; newHour: string; newRoom: string } | null>(null)
  const [timeErrorAlert, setTimeErrorAlert] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  async function loadAppointments(date: string) {
    setLoading(true)
    try {
      const { data } = await api.get(`/appointments?date=${date}&limit=100`)
      setAppointments(data.data)
    } catch (err) {
      console.error(err)
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

  // --- POSICIONAMENTO COM BASE NA DIFERENÇA EM MINUTOS ---
  function getAppointmentStyle(dateTimeStr: string, durationMin: number = 30) {
    const { hours, minutes } = parseTimeComponents(dateTimeStr)
    const minutesFromStart = (hours - START_HOUR) * 60 + minutes

    const top = (minutesFromStart / 15) * SLOT_15MIN_HEIGHT
    const calculatedHeight = (durationMin / 15) * SLOT_15MIN_HEIGHT
    const height = Math.max(calculatedHeight, 44)

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  // --- LINHA TEMPO REAL ---
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)
  const nowHours = now.getHours()
  const nowMins = now.getMinutes()
  const nowMinutesFromStart = (nowHours - START_HOUR) * 60 + nowMins
  const realTimeTop = (nowMinutesFromStart / 15) * SLOT_15MIN_HEIGHT

  // --- LÓGICA DE DRAG & DROP CORRIGIDA ---
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

    // Pega as coordenadas exatas relativas ao container da coluna da sala (roomBody)
    const roomBodyEl = e.currentTarget.closest(`.${styles.roomBody}`)
    if (!roomBodyEl) return

    const rect = roomBodyEl.getBoundingClientRect()
    const offsetY = e.clientY - rect.top

    // 1. Calcula os blocos de 15 min (32px cada)
    const slotIndex = Math.floor(offsetY / SLOT_15MIN_HEIGHT)

    // 2. Converte para minutos e horas a partir do START_HOUR
    const totalMinutes = START_HOUR * 60 + slotIndex * 15

    const newHourNum = Math.floor(totalMinutes / 60)
    const newMinuteNum = totalMinutes % 60

    // Trava para não permitir soltar fora do horário de funcionamento (08:00 - 18:00)
    if (newHourNum < START_HOUR || newHourNum > END_HOUR) return

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
      loadAppointments(selectedDate)
    }
  }

  const activeRooms = ROOMS.filter((r) => getApptsByRoom(r).length > 0)
  const displayRooms = activeRooms.length >= 2 ? activeRooms : ROOMS.slice(0, 2)
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
              <p className={styles.cardSub}>Grade de horários dividida a cada 15 min (08:00 às 18:00)</p>
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

                {/* COLUNAS DAS SALAS */}
                {displayRooms.map((room) => {
                  const roomAppts = getApptsByRoom(room)

                  return (
                    <div key={room} className={styles.roomCol}>
                      <div className={styles.roomHeader}>{room.replace('_', ' ')}</div>

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
                                onClick={() => {}}
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
                                  <span className={styles.apptName}>{appt.patient?.name || 'Paciente não identificado'}</span>
                                </div>
                                <span className={styles.apptBadge}>{STATUS_LABEL[appt.status]}</span>
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
                    <strong>{a.patient.name}</strong>
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
                  <strong>{a.patient.name}</strong>
                  <span>{a.notes || 'Aguardando brecha / Encaixe'}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

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