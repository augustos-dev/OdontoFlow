// app/(dashboard)/agenda/page.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import styles from './agenda.module.css'
import NovoAgendamentoModal from '@/app/components/NovoAgendamentoModal'

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  room: string
  type: string
  notes?: string
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

const ROOMS = ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4']
const HOURS = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`)

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)  // ← estado do modal

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
    return appointments.filter((a) => a.room === room)
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

  const activeRooms = ROOMS.filter((r) => getApptsByRoom(r).length > 0)
  const displayRooms = activeRooms.length >= 2 ? activeRooms : ROOMS.slice(0, 2)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.dateNav}>
          <button className={styles.dateBtn} onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() - 1)
            setSelectedDate(d.toISOString().slice(0, 10))
          }}>‹</button>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className={styles.dateBtn} onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            setSelectedDate(d.toISOString().slice(0, 10))
          }}>›</button>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.dotConfirmado} /> Confirmado</span>
          <span className={styles.legendItem}><span className={styles.dotEmAtendimento} /> Em Atend.</span>
          <span className={styles.legendItem}><span className={styles.dotFinalizado} /> Finalizado</span>
        </div>

        
      </div>

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
                <div key={h} className={styles.timeSlot}>{h}</div>
              ))}
            </div>

            {displayRooms.map((room) => (
              <div key={room} className={styles.roomCol}>
                <div className={styles.roomHeader}>{room.replace('_', ' ')}</div>
                <div className={styles.roomBody}>
                  {HOURS.map((h) => {
                    const appt = getApptsByRoom(room).find(
                      (a) => formatTime(a.dateTime).startsWith(h.slice(0, 2))
                    )
                    return (
                      <div key={h} className={styles.slot}>
                        {appt && (
                          <div className={`${styles.apptCard} ${getStatusClass(appt.status)}`}>
                            <div className={styles.apptName}>{appt.patient.name}</div>
                            <div className={styles.apptProcedure}>{appt.notes ?? appt.type}</div>
                            <span className={styles.apptBadge}>{STATUS_LABEL[appt.status]}</span>
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
    </div>
  )
}