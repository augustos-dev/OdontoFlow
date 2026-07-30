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
const HOURS = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`)

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [currentHour, setCurrentHour] = useState<string>('')

  // Estados para o Modal de Alerta ao trocar Horário/Sala
  const [pendingMove, setPendingMove] = useState<{ appt: Appointment; newHour: string; newRoom: string } | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()
    setCurrentHour(`${hour.toString().padStart(2, '0')}:00`)
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

  // Executa a troca real de horário/sala após o usuário confirmar no Modal
  async function confirmMoveAppointment() {
    if (!pendingMove) return
    const { appt, newHour, newRoom } = pendingMove

    // Monta o novo ISO string mantendo o dia e trocando hora/minutos
    const [hours, minutes] = newHour.split(':')
    const updatedDate = new Date(selectedDate + 'T00:00:00') // evita offset de timezone
    updatedDate.setHours(parseInt(hours), parseInt(minutes))

    const newISOString = updatedDate.toISOString()

    // 1. ATUALIZAÇÃO OTIMISTA (Muda a posição na UI na hora!)
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

    setPendingMove(null) // Fecha o modal imediatamente

    // 2. DISPARA PARA O BACKEND
    try {
      await api.patch(`/appointments/${appt.id}`, {
        dateTime: newISOString,
        room: newRoom,
        status: appt.status === 'ESPERA' ? 'AGENDADO' : appt.status,
      })
    } catch (err) {
      console.error('Erro ao remarcar agendamento:', err)
      // Se der erro na API, recarrega o estado real do banco para reverter
      loadAppointments(selectedDate)
    }
  }

  // Eventos de Drag & Drop para arrastar agendamento para novo horário/sala
  function handleDragStart(e: React.DragEvent, appt: Appointment) {
    e.dataTransfer.setData('apptId', appt.id)
  }

  function handleDrop(e: React.DragEvent, targetHour: string, targetRoom: string) {
    e.preventDefault()
    const apptId = e.dataTransfer.getData('apptId')
    const appt = appointments.find((a) => a.id === apptId)

    if (appt) {
      // Dispara o Modal de aviso pedindo confirmação
      setPendingMove({ appt, newHour: targetHour, newRoom: targetRoom })
    }
  }

  const activeRooms = ROOMS.filter((r) => getApptsByRoom(r).length > 0)
  const displayRooms = activeRooms.length >= 2 ? activeRooms : ROOMS.slice(0, 2)

  // Separar Agendamentos da Fila de Espera / Encaixe
  const waitingList = appointments.filter((a) => a.status === 'ESPERA' || a.isWaitingList)
  const regularAppointments = appointments.filter((a) => a.status !== 'ESPERA' && !a.isWaitingList)

  return (
    <div className={styles.page}>
      {/* BARRA SUPERIOR DE NAVEGAÇÃO E LEGENDA */}
      <div className={styles.toolbar}>
        <div className={styles.dateNav}>
          <button
            className={styles.dateBtn}
            onClick={() => {
              const d = new Date(selectedDate)
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
              const d = new Date(selectedDate)
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

      {/* LAYOUT PRINCIPAL */}
      <div className={styles.mainLayout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Agenda do Dia</h2>
              <p className={styles.cardSub}>Horários de 08:00 às 18:00</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Carregando agenda...</div>
          ) : (
            <div className={styles.grid}>
              <div className={styles.timeCol}>
                <div className={styles.timeColHeader} />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className={`${styles.timeSlot} ${h === currentHour ? styles.currentTimeSlot : ''}`}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {displayRooms.map((room) => (
                <div key={room} className={styles.roomCol}>
                  <div className={styles.roomHeader}>{room.replace('_', ' ')}</div>
                  <div className={styles.roomBody}>
                    {HOURS.map((h) => {
                      const appt = getApptsByRoom(room).find((a) =>
                        formatTime(a.dateTime).startsWith(h.slice(0, 2))
                      )
                      const isCurrentTime = h === currentHour

                      return (
                        <div
                          key={h}
                          className={`${styles.slot} ${isCurrentTime ? styles.currentSlotLine : ''}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, h, room)}
                        >
                          {appt && (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, appt)}
                              className={`${styles.apptCard} ${getStatusClass(appt.status)}`}
                              onClick={() => setSelectedAppt(appt)}
                              style={{ cursor: 'grab' }}
                            >
                              <div className={styles.apptName}>{appt.patient.name}</div>
                              <div className={styles.apptProcedure}>
                                {appt.notes ?? appt.type}
                              </div>
                              <span className={styles.apptBadge}>
                                {STATUS_LABEL[appt.status]}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR DA RECEPÇÃO */}
        <aside className={styles.sidePanel}>
          <h3 className={styles.sideTitle}>Resumo da Recepção</h3>

          {/* 1. PRÓXIMOS PACIENTES */}
          <div className={styles.waitingSection}>
            <span className={styles.sectionLabel}>Próximos a Atender</span>
            {regularAppointments.filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO').length === 0 ? (
              <p className={styles.emptyText}>Nenhum agendamento pendente.</p>
            ) : (
              regularAppointments
                .filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO')
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id} className={styles.miniCard} onClick={() => setSelectedAppt(a)}>
                    <strong>{a.patient.name}</strong>
                    <span>{formatTime(a.dateTime)} • {a.room.replace('_', ' ')}</span>
                  </div>
                ))
            )}
          </div>

          {/* 2. FILA DE ESPERA E ENCAIXES */}
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

      {/* MODAL DE AVISO DE ALTERAÇÃO DE HORÁRIO/SALA */}
      {pendingMove && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>!</div>
            <h3 className={styles.confirmTitle}>Alterar agendamento</h3>
            <p className={styles.confirmText}>
              Tem certeza que deseja mover <strong>{pendingMove.appt.patient.name}</strong> para as{' '}
              <strong>{pendingMove.newHour}</strong> na <strong>{pendingMove.newRoom.replace('_', ' ')}</strong>?
              <br />
              Se já tiver sido enviado lembrete, a alteração pode requerer reaviso ao paciente.
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

      {/* MODAL DE DETALHES DO AGENDAMENTO */}
      <DetalhesAgendamentoModal
        appointment={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => loadAppointments(selectedDate)}
      />
    </div>
  )
}