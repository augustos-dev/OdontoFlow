'use client'

import { useEffect, useState } from 'react'
import { 
  Crown, 
  Sparkles, 
  X, 
  Plus, 
  Clock, 
  UserPlus, 
  Loader2,
  CalendarCheck
} from 'lucide-react'
import api from '@/lib/api'
import styles from './agenda.module.css'
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'
import { useModal } from '@/app/components/ModalContext'

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

interface PatientOption {
  id: string
  name: string
  phone?: string
}

interface DentistOption {
  id: string
  name: string
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
  const { openNovoAgendamento } = useModal()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  // Planos & Limites
  const [userPlan, setUserPlan] = useState<UserPlan>('PREMIUM')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [blockedPlanFeature, setBlockedPlanFeature] = useState('')

  // Configuração de Salas
  const [roomsCount, setRoomsCount] = useState<number>(2)
  const [selectedSingleRoom, setSelectedSingleRoom] = useState<string>('ALL')

  // Drag & Drop
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)
  const [now, setNow] = useState<Date>(new Date())
  const [pendingMove, setPendingMove] = useState<{ appt: Appointment; newHour: string; newRoom: string } | null>(null)
  const [timeErrorAlert, setTimeErrorAlert] = useState<string | null>(null)

  // Modal de Fila de Espera / Encaixe
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState(false)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [dentists, setDentists] = useState<DentistOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedDentistId, setSelectedDentistId] = useState('')
  const [waitingNotes, setWaitingNotes] = useState('')
  const [savingWaiting, setSavingWaiting] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  async function loadAuxiliaryData() {
    try {
      const [patientsRes, usersRes] = await Promise.all([
        api.get('/patients?limit=100').catch(() => ({ data: [] })),
        api.get('/users?role=DENTIST').catch(() => ({ data: [] }))
      ])

      const pList = Array.isArray(patientsRes.data) ? patientsRes.data : patientsRes.data?.data || []
      const dList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []

      setPatients(pList)
      setDentists(dList)
      if (pList.length > 0) setSelectedPatientId(pList[0].id)
      if (dList.length > 0) setSelectedDentistId(dList[0].id)
    } catch (e) {
      console.error('Erro ao carregar dados auxiliares:', e)
    }
  }

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
    loadAuxiliaryData()
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
      AGENDADO: styles.agendado,
      CONFIRMADO: styles.confirmado,
      EM_ATENDIMENTO: styles.emAtendimento,
      FINALIZADO: styles.finalizado,
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
    const height = Math.max(calculatedHeight, 26)

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  function handleRoomsCountChange(newCount: number) {
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

  const visibleRooms = selectedSingleRoom !== 'ALL'
    ? [selectedSingleRoom]
    : ALL_ROOMS.slice(0, roomsCount)

  const isToday = selectedDate === new Date().toISOString().slice(0, 10)
  const nowHours = now.getHours()
  const nowMins = now.getMinutes()
  const nowMinutesFromStart = (nowHours - START_HOUR) * 60 + nowMins
  const realTimeTop = (nowMinutesFromStart / 15) * SLOT_15MIN_HEIGHT

  const dateObj = new Date(selectedDate + 'T00:00:00')
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
  const todayFormatted = weekday.charAt(0).toUpperCase() + weekday.slice(1)

  function handleAddInSlot(hour: string, room: string) {
    openNovoAgendamento()
  }

  async function handleCreateWaitingAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatientId || !selectedDentistId) return

    setSavingWaiting(true)
    try {
      await api.post('/appointments', {
        patientId: selectedPatientId,
        dentistId: selectedDentistId,
        dateTime: `${selectedDate}T08:00:00.000Z`,
        room: visibleRooms[0] || 'SALA_1',
        durationMin: 30,
        status: 'ESPERA',
        isWaitingList: true,
        notes: waitingNotes || 'Aguardando encaixe na recepção',
      })

      setIsWaitingModalOpen(false)
      setWaitingNotes('')
      loadAppointments(selectedDate)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao adicionar na fila de espera.')
    } finally {
      setSavingWaiting(false)
    }
  }

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
      {/* ─── TOOLBAR & LEGENDA ─── */}
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

        {/* Seletor de Salas e Dropdown */}
        <div className={styles.filterGroup}>
          <div className={styles.roomsSelector}>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(1)}
              className={`${styles.roomCountBtn} ${roomsCount === 1 ? styles.roomCountBtnActive : ''}`}
            >
              1 Sala
            </button>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(2)}
              className={`${styles.roomCountBtn} ${roomsCount === 2 ? styles.roomCountBtnActive : ''}`}
            >
              2 Salas (Padrão)
            </button>
            <button
              type="button"
              onClick={() => handleRoomsCountChange(4)}
              className={`${styles.roomCountBtn} ${roomsCount === 4 ? styles.roomCountBtnActive : ''}`}
            >
              <span>4 Salas</span>
              <Crown size={12} className={styles.crownIcon} />
            </button>
          </div>

          <select
            value={selectedSingleRoom}
            onChange={(e) => setSelectedSingleRoom(e.target.value)}
            className={styles.roomSelect}
          >
            <option value="ALL">Visualizar Todas</option>
            {ALL_ROOMS.map((r) => (
              <option key={r} value={r}>
                Apenas {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Legendas de Status Completas */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dotAgendado} /> Agendado
          </span>
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

      {/* ─── GRID CENTRAL + SIDEBAR ─── */}
      <div className={styles.mainLayout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Grade de Atendimento do Dia</h2>
              <p className={styles.cardSub}>
                Exibindo <strong>{visibleRooms.length} {visibleRooms.length === 1 ? 'sala ativa' : 'salas ativas simultâneas'}</strong> • Intervalos a cada 15 min (08:00 às 18:00)
              </p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando agenda clínica...</span>
            </div>
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
                                title={`Agendar às ${h} na ${room.replace('_', ' ')}`}
                                type="button"
                                onClick={() => handleAddInSlot(h, room)}
                              >
                                <Plus size={14} />
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

        {/* ─── SIDEBAR DA RECEPÇÃO ─── */}
        <aside className={styles.sidePanel}>
          <div className={styles.sideHeaderContainer}>
            <h3 className={styles.sideTitle}>Recepção</h3>
            <span className={styles.todayIndicator}>{todayFormatted}</span>
          </div>

          <div className={styles.waitingSection}>
            <span className={styles.sectionLabel}>Próximos a Atender</span>
            {regularAppointments.filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO' || a.status === 'EM_ATENDIMENTO').length === 0 ? (
              <div className={styles.emptySidebarState}>
                <CalendarCheck size={20} className={styles.emptyIcon} />
                <p className={styles.emptyText}>Sem consultas pendentes para hoje.</p>
              </div>
            ) : (
              regularAppointments
                .filter((a) => a.status === 'CONFIRMADO' || a.status === 'AGENDADO' || a.status === 'EM_ATENDIMENTO')
                .slice(0, 4)
                .map((a) => (
                  <div key={a.id} className={styles.miniCard} onClick={() => setSelectedAppt(a)}>
                    <div className={styles.miniCardTop}>
                      <strong>{a.patient?.name}</strong>
                      <span className={`${styles.miniCardBadge} ${getStatusClass(a.status)}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <span className={styles.miniCardSub}>
                      <Clock size={11} /> {formatTime(a.dateTime)} • {a.room.replace('_', ' ')}
                    </span>
                  </div>
                ))
            )}
          </div>

          <div className={styles.sideSection}>
            <div className={styles.sideHeaderRow}>
              <span className={styles.sectionLabel}>Fila de Espera / Encaixe ({waitingList.length})</span>
              <button 
                type="button" 
                onClick={() => setIsWaitingModalOpen(true)}
                className={styles.btnAddWaiting}
                title="Adicionar paciente no encaixe"
              >
                <Plus size={12} /> Encaixe
              </button>
            </div>

            {waitingList.length === 0 ? (
              <div className={styles.emptySidebarState}>
                <p className={styles.emptyText}>Nenhum paciente aguardando vaga.</p>
              </div>
            ) : (
              waitingList.map((a) => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, a)}
                  className={styles.waitingCard}
                  onClick={() => setSelectedAppt(a)}
                  title="Arraste para a grade para agendar"
                >
                  <div className={styles.waitingCardHeader}>
                    <strong>{a.patient?.name}</strong>
                    <span className={styles.dragPill}>Arraste</span>
                  </div>
                  <span>{a.notes || 'Aguardando brecha de horário'}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* ─── MODAL: FILA DE ESPERA / ENCAIXE ─── */}
      {isWaitingModalOpen && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox} style={{ maxWidth: '440px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="var(--primary-color, #06b6d4)" />
                <h3 className={styles.confirmTitle} style={{ margin: 0, fontSize: '16px' }}>Adicionar à Fila de Espera</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsWaitingModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWaitingAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Selecione o Paciente*
                </label>
                <select 
                  value={selectedPatientId} 
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className={styles.modalSelect}
                  required
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.phone ? `(${p.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Dentista Solicitado*
                </label>
                <select 
                  value={selectedDentistId} 
                  onChange={(e) => setSelectedDentistId(e.target.value)}
                  className={styles.modalSelect}
                  required
                >
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Observações de Encaixe / Preferência
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Pode vir após as 14h se houver cancelamento" 
                  value={waitingNotes}
                  onChange={(e) => setWaitingNotes(e.target.value)}
                  className={styles.modalInput}
                />
              </div>

              <div className={styles.confirmActions} style={{ marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsWaitingModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingWaiting} className={styles.btnPrimaryModal}>
                  {savingWaiting ? <Loader2 size={15} className={styles.spinner} /> : <Plus size={15} />}
                  <span>Adicionar na Fila</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: UPGRADE ENTERPRISE ─── */}
      {showUpgradeModal && (
        <div className={styles.confirmOverlay} onClick={() => setShowUpgradeModal(false)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: '#ecfeff', color: '#0891b2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Sparkles size={24} />
            </div>
            <h3 className={styles.confirmTitle} style={{ fontSize: '18px' }}>Desbloqueie o Modo Multi-Salas</h3>
            <p className={styles.confirmText} style={{ fontSize: '13px', color: '#475569', margin: '8px 0 16px' }}>
              {blockedPlanFeature}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'left', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Plano Enterprise:</div>
              <div style={{ color: '#64748b' }}>✦ Visualização simultânea de 4+ salas e cadeiras.</div>
              <div style={{ color: '#64748b' }}>✦ Baixa dupla na recepção com trava de idempotência.</div>
              <div style={{ color: '#64748b' }}>✦ Relatórios de ocupação e suporte prioritário.</div>
            </div>
            <div className={styles.confirmActions} style={{ justifyContent: 'center', gap: '10px' }}>
              <button className={styles.btnCancel} onClick={() => setShowUpgradeModal(false)}>
                Agora não
              </button>
              <button 
                className={styles.btnPrimaryModal} 
                onClick={() => {
                  setShowUpgradeModal(false)
                  alert('Redirecionando para contratação de expansão...')
                }}
              >
                Fazer Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: HORÁRIO PASSADO ─── */}
      {timeErrorAlert && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.errorIcon}>!</div>
            <h3 className={styles.confirmTitle}>Horário Indisponível</h3>
            <p className={styles.confirmText}>{timeErrorAlert}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnPrimaryModal} onClick={() => setTimeErrorAlert(null)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRMAÇÃO DE TROCA ─── */}
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
              <button className={styles.btnPrimaryModal} onClick={confirmMoveAppointment}>
                Confirmar Mudança
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