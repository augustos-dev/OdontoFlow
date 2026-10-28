'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { 
  Crown, 
  Sparkles, 
  X, 
  Plus, 
  Clock, 
  UserPlus, 
  Loader2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react'
import api from '@/lib/api'
import styles from './agenda.module.css'
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'
import { useModal } from '@/app/components/ModalContext'
import { usePlanAccess } from '@/src/hooks/usePlanAccess'

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  room: string
  type?: string
  notes?: string
  procedureId?: string
  procedure?: {
    id: string
    name: string
    basePrice?: number
  }
  isWaitingList?: boolean
  patient: { id: string; name: string; phone?: string }
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

interface ClinicBranding {
  clinicName: string
  clinicAddress: string
  primaryColor: string
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

export default function AgendaPage() {
  const { openNovoAgendamento } = useModal()
  const { canMultiRooms, isBasic } = usePlanAccess()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const [loggedUserName, setLoggedUserName] = useState<string>('')
  const [branding, setBranding] = useState<ClinicBranding>({
    clinicName: 'Clarium Clinic',
    clinicAddress: '',
    primaryColor: '#0082c9',
  })

  const [userPlan, setUserPlan] = useState<UserPlan>('PREMIUM')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [blockedPlanFeature, setBlockedPlanFeature] = useState('')

  const [selectedSingleRoom, setSelectedSingleRoom] = useState<string>('ALL')
  const [roomsCount, setRoomsCount] = useState<number>(() => (isBasic ? 1 : 2))

  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null)
  const [now, setNow] = useState<Date>(new Date())
  const [pendingMove, setPendingMove] = useState<{ appt: Appointment; newHour: string; newRoom: string } | null>(null)
  const [timeErrorAlert, setTimeErrorAlert] = useState<string | null>(null)

  // Controle de expansão da tarde (13h-18h)
  const [forceExpandAfternoon, setForceExpandAfternoon] = useState(false)

  // Modais de Recepção & Espera
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState(false)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [dentists, setDentists] = useState<DentistOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedDentistId, setSelectedDentistId] = useState('')
  const [waitingNotes, setWaitingNotes] = useState('')
  const [savingWaiting, setSavingWaiting] = useState(false)

  const hiddenDateInputRef = useRef<HTMLInputElement>(null)
  const hasLoadedAuxRef = useRef(false)

  // Atualização de minuto a minuto do relógio de tempo real
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (isBasic && roomsCount > 1) {
      setRoomsCount(1)
    }
  }, [isBasic, roomsCount])

  // Carga dos pacientes e dentistas da clínica
  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [patientsRes, usersRes, clinicsRes] = await Promise.all([
        api.get('/patients?limit=100').catch(() => ({ data: [] })),
        api.get('/users?role=DENTIST&isActive=true').catch(() => ({ data: [] })),
        api.get('/clinics').catch(() => ({ data: [] })),
      ])

      const pList = Array.isArray(patientsRes.data) ? patientsRes.data : patientsRes.data?.data || []
      const dList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []

      setPatients(pList)
      setDentists(dList)
      if (pList.length > 0) setSelectedPatientId(pList[0].id)
      if (dList.length > 0) setSelectedDentistId(dList[0].id)

      const cList = Array.isArray(clinicsRes.data) ? clinicsRes.data : clinicsRes.data?.data || []
      if (cList.length > 0) {
        const activeClinic = cList[0]
        setBranding((prev) => ({
          clinicName: activeClinic.name || prev.clinicName,
          clinicAddress: activeClinic.address || prev.clinicAddress,
          primaryColor: activeClinic.primaryColor || prev.primaryColor,
        }))
      }
    } catch (e) {
      console.error('Erro ao carregar dados auxiliares:', e)
    }
  }, [])

  // Carrega agendamentos reais do dia
  const loadAppointments = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [apptRes, meRes] = await Promise.allSettled([
        api.get(`/appointments?date=${date}&limit=100`),
        api.get('/auth/me').catch(() => api.get('/api/auth/me')),
      ])

      if (apptRes.status === 'fulfilled') {
        const raw = apptRes.value.data?.data || apptRes.value.data || []
        setAppointments(Array.isArray(raw) ? raw : [])
      }

      if (meRes.status === 'fulfilled') {
        const meData = meRes.value.data?.user || meRes.value.data?.data || meRes.value.data
        const plan = meData?.tenant?.plan || meData?.plan || 'PREMIUM'
        setUserPlan(plan)

        if (meData?.name) setLoggedUserName(meData.name)
        if (meData?.tenant?.name || meData?.clinic?.name) {
          setBranding((prev) => ({
            clinicName: meData.clinic?.name || meData.tenant?.name || prev.clinicName,
            clinicAddress: meData.clinic?.address || prev.clinicAddress,
            primaryColor: prev.primaryColor,
          }))
        }
      }
    } catch (err) {
      console.error('Erro ao buscar agenda:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAppointments(selectedDate)
    if (!hasLoadedAuxRef.current) {
      hasLoadedAuxRef.current = true
      loadAuxiliaryData()
    }
  }, [selectedDate, loadAppointments, loadAuxiliaryData])

  function handleRoomsCountChange(newCount: number) {
    if (newCount > 1 && isBasic) {
      setBlockedPlanFeature('Visualização simultânea de 2 ou mais salas disponível a partir do Plano Premium.')
      setShowUpgradeModal(true)
      return
    }

    if (newCount > 2 && !canMultiRooms) {
      setBlockedPlanFeature('Visualização simultânea de 3, 4 ou mais cadeiras é exclusiva do Plano Enterprise.')
      setShowUpgradeModal(true)
      return
    }

    setRoomsCount(newCount)
    setSelectedSingleRoom('ALL')
  }

  // Salas ativas
  const visibleRooms: string[] = useMemo(() => {
    if (selectedSingleRoom && selectedSingleRoom !== 'ALL') {
      return [selectedSingleRoom]
    }
    return ALL_ROOMS.slice(0, roomsCount) || ['SALA_1', 'SALA_2']
  }, [selectedSingleRoom, roomsCount])

  // Tratamento de datas
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)
  const nowHours = now.getHours()
  const nowMins = now.getMinutes()

  const dateObj = new Date(selectedDate + 'T12:00:00')
  const formattedFullDate = dateObj.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const weekDayName = dateObj
    .toLocaleDateString('pt-BR', { weekday: 'long' })
    .toUpperCase()

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10))
  }

  // Separação de listas
  const waitingList = useMemo(
    () => appointments.filter((a) => a.status === 'ESPERA' || a.isWaitingList),
    [appointments]
  )

  const receptionPatients = useMemo(
    () => appointments.filter((a) => a.status === 'CONFIRMADO' || a.status === 'EM_ATENDIMENTO'),
    [appointments]
  )

  const pendingCheckinPatients = useMemo(
    () => appointments.filter((a) => a.status === 'AGENDADO'),
    [appointments]
  )

  // Verifica se há consultas marcadas à tarde (entre 13:00 e 18:00) para expandir automaticamente a grade
  const hasAfternoonAppointments = useMemo(() => {
    return appointments.some((a) => {
      const h = new Date(a.dateTime).getHours()
      return h >= 13 && h <= 18 && a.status !== 'ESPERA' && !a.isWaitingList
    })
  }, [appointments])

  const isAfternoonExpanded = forceExpandAfternoon || hasAfternoonAppointments

  // Horários exibidos na grade
  const displayHours = useMemo(() => {
    if (isAfternoonExpanded) {
      return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    }
    // Modo colapsado original do Figma
    return ['08:00', '09:00', '10:00', '11:00', '12:00', '13-18h']
  }, [isAfternoonExpanded])

  // Cálculo da posição da linha de tempo real (pixels relativos à grade)
  const realTimePosition = useMemo(() => {
    if (!isToday || nowHours < 8 || nowHours > 18) return null
    if (!isAfternoonExpanded && nowHours >= 13) return null

    // Cada linha de 1 hora tem altura de aproximadamente 88px + 1px borda
    const baseHour = nowHours - 8
    const minuteFraction = nowMins / 60
    const topPx = (baseHour + minuteFraction) * 89 + 42 // 42px é o cabeçalho HORA / SALAS
    return topPx
  }, [isToday, nowHours, nowMins, isAfternoonExpanded])

  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getApptsByRoomAndHour(room: string, hourLabel: string) {
    if (hourLabel === '13-18h') {
      return appointments.filter((a) => {
        const h = new Date(a.dateTime).getHours()
        return (a.room === room || !a.room) && h >= 13 && h <= 18 && !a.isWaitingList && a.status !== 'ESPERA'
      })
    }
    const targetHour = parseInt(hourLabel.split(':')[0], 10)
    return appointments.filter((a) => {
      const h = new Date(a.dateTime).getHours()
      return (a.room === room || !a.room) && h === targetHour && !a.isWaitingList && a.status !== 'ESPERA'
    })
  }

  // 🛡️ Regra: Não permitir agendamento para horário que já passou
  function handleAddInSlot(hourLabel: string, room: string) {
    if (hourLabel === '13-18h') {
      setForceExpandAfternoon(true)
      return
    }

    const targetHour = parseInt(hourLabel.split(':')[0], 10)
    if (isToday && targetHour < nowHours) {
      setTimeErrorAlert(`Não é possível agendar em horários anteriores às ${String(nowHours).padStart(2, '0')}:00 de hoje.`)
      return
    }

    openNovoAgendamento()
  }

  // 🛡️ Regra: Arrastar para horário passado
  function handleDragStart(e: React.DragEvent, appt: Appointment) {
    setDraggedAppt(appt)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, room: string, hourLabel: string) {
    e.preventDefault()
    if (!draggedAppt) return

    if (hourLabel === '13-18h') {
      setForceExpandAfternoon(true)
      setDraggedAppt(null)
      return
    }

    const targetHour = parseInt(hourLabel.split(':')[0], 10)
    if (isToday && targetHour < nowHours) {
      setTimeErrorAlert('Não é possível mover um agendamento para um horário que já passou.')
      setDraggedAppt(null)
      return
    }

    setPendingMove({
      appt: draggedAppt,
      newRoom: room,
      newHour: `${String(targetHour).padStart(2, '0')}:00`,
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
      setTimeErrorAlert('Falha ao sincronizar com o servidor. A alteração foi desfeita.')
    }
  }

  // 🏥 Ações Reais da Recepção (PATCH /appointments/:id/status)
  async function handleUpdateStatus(apptId: string, nextStatus: 'CONFIRMADO' | 'EM_ATENDIMENTO') {
    try {
      await api.patch(`/appointments/${apptId}/status`, { status: nextStatus })
      // Atualiza localmente para resposta instantânea
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: nextStatus } : a))
      )
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar status na recepção.')
    }
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
        room: visibleRooms?.[0] || 'SALA_1',
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

  return (
    <div className={styles.page}>
      {/* ─── TOOLBAR PADRONIZADA (FIGMA EXATO) ─── */}
      <div className={styles.toolbarCard}>
        {/* 1. SEÇÃO DE DATA */}
        <div className={styles.dateSection}>
          <div className={styles.responsiveDateHeader}>
            <h2 className={styles.responsiveDateTitle}>{formattedFullDate}</h2>
            <span className={styles.responsiveWeekDay}>{weekDayName}</span>
          </div>

          <div className={styles.dateControlsRow}>
            <button
              type="button"
              onClick={handleToday}
              className={styles.btnTodayDesktop}
            >
              Hoje
            </button>

            <div className={styles.dateNavigator}>
              <button
                type="button"
                onClick={handlePrevDay}
                className={styles.dateArrowBtn}
                title="Dia anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div
                className={styles.dateDisplayWrapper}
                onClick={() => hiddenDateInputRef.current?.showPicker?.() || hiddenDateInputRef.current?.click()}
              >
                <span className={styles.dateTextDesktop}>{formattedFullDate}</span>
                <span className={styles.dateTextMobile}>Hoje</span>

                <input
                  ref={hiddenDateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={styles.hiddenNativeDateInput}
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className={styles.dateArrowBtn}
                title="Próximo dia"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <span className={styles.weekDayBadgeDesktop}>{weekDayName}</span>
          </div>
        </div>

        {/* 2. SELETOR DE SALAS */}
        <div className={styles.roomsFilterSection}>
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
              className={`${styles.roomCountBtn} ${styles.roomCountBtnEnterprise} ${
                roomsCount === 4 ? styles.roomCountBtnActive : ''
              }`}
            >
              <Crown size={13} className={styles.crownIcon} />
              <span>4 Salas · ENTERPRISE</span>
            </button>
          </div>

          {selectedSingleRoom !== undefined && (
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
          )}
        </div>

        <div className={styles.mobileSwipeIndicator}>
          <span>↔ Navegue pelas abas</span>
        </div>

        {/* 3. LEGENDA DE STATUS */}
        <div className={styles.legendSection}>
          <span className={`${styles.statusBadge} ${styles.badgeAgendado}`}>
            Agendado
          </span>
          <span className={`${styles.statusBadge} ${styles.badgeConfirmado}`}>
            Confirmado
          </span>
          <span className={`${styles.statusBadge} ${styles.badgeEmAtendimento}`}>
            Em Atendimento
          </span>
          <span className={`${styles.statusBadge} ${styles.badgeFinalizado}`}>
            Finalizado
          </span>
        </div>
      </div>

      {/* ─── BANNER DE AGENDA HISTÓRICA ─── */}
      {!isToday && (
        <div className={styles.historyNotice}>
          <Info size={16} className={styles.historyNoticeIcon} />
          <div className={styles.historyNoticeText}>
            <strong>Agenda histórica • {dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</strong>
            <span>Visualizando registros passados da clínica. Agendamentos novos devem ser feitos para a data de hoje ou futura.</span>
          </div>
        </div>
      )}

      {/* ─── ÁREA CENTRAL PRINCIPAL ─── */}
      <div className={styles.mainLayout}>
        {/* COLUNA ESQUERDA: GRADE DE ATENDIMENTO */}
        <div className={styles.scheduleCard}>
          <div className={styles.scheduleHeader}>
            <div className={styles.scheduleHeaderLeft}>
              <h2 className={styles.scheduleTitle}>Grade de atendimento</h2>
              <p className={styles.scheduleSubtitle}>
                Intervalos de 60 minutos • 08:00–18:00
              </p>
            </div>

            {/* Alternador manual caso queira expandir/recolher a tarde */}
            <button
              type="button"
              onClick={() => setForceExpandAfternoon((prev) => !prev)}
              className={styles.btnToggleAfternoon}
            >
              {isAfternoonExpanded ? 'Recolher tarde (13–18h)' : 'Expandir tarde completa'}
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Carregando agenda clínica...</span>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <div
                className={styles.scheduleGrid}
                style={{
                  gridTemplateColumns: `56px repeat(${visibleRooms.length}, 1fr)`,
                }}
              >
                {/* Linha do Tempo em Tempo Real */}
                {realTimePosition !== null && (
                  <div
                    className={styles.realTimeTrack}
                    style={{ top: `${realTimePosition}px` }}
                  >
                    <span className={styles.realTimeDot} />
                    <span className={styles.realTimeLine} />
                    <span className={styles.realTimeTooltip}>
                      {String(nowHours).padStart(2, '0')}:{String(nowMins).padStart(2, '0')}
                    </span>
                  </div>
                )}

                {/* Cabeçalho */}
                <div className={styles.colHeaderTime}>HORA</div>
                {visibleRooms.map((room) => (
                  <div key={`head-${room}`} className={styles.colHeaderRoom}>
                    {room.replace('_', ' ')}
                  </div>
                ))}

                {/* Linhas da Grade */}
                {displayHours.map((hourStr) => {
                  const isPastSlot = isToday && hourStr !== '13-18h' && parseInt(hourStr.split(':')[0], 10) < nowHours

                  return (
                    <React.Fragment key={`row-${hourStr}`}>
                      {/* Horário */}
                      <div className={`${styles.timeCell} ${isPastSlot ? styles.timeCellPast : ''}`}>
                        {hourStr}
                      </div>

                      {/* Salas */}
                      {visibleRooms.map((room) => {
                        const cellAppts = getApptsByRoomAndHour(room, hourStr)

                        return (
                          <div
                            key={`cell-${room}-${hourStr}`}
                            className={`${styles.roomCell} ${isPastSlot ? styles.roomCellPast : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, room, hourStr)}
                          >
                            {cellAppts.length > 0 ? (
                              <div className={styles.apptsContainer}>
                                {cellAppts.map((appt) => (
                                  <div
                                    key={appt.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, appt)}
                                    onClick={() => setSelectedAppt(appt)}
                                    className={`${styles.appointmentFigmaCard} ${
                                      appt.status === 'FINALIZADO'
                                        ? styles.cardStatusFinalizado
                                        : appt.status === 'EM_ATENDIMENTO'
                                        ? styles.cardStatusEmAtendimento
                                        : appt.status === 'CONFIRMADO'
                                        ? styles.cardStatusConfirmado
                                        : styles.cardStatusAgendado
                                    }`}
                                  >
                                    <div className={styles.cardTopMeta}>
                                      <span>
                                        {formatTime(appt.dateTime)} • {room.replace('_', ' ')}
                                      </span>
                                    </div>

                                    <div className={styles.cardPatientName}>
                                      {appt.patient?.name || 'Paciente'}
                                    </div>

                                    <div className={styles.cardProcedureMeta}>
                                      {appt.procedure?.name || 'Avaliação'} • {appt.dentist?.name || 'Dentista'}
                                    </div>

                                    <div className={styles.cardBottomStatus}>
                                      <span
                                        className={`${styles.statusLabelText} ${
                                          appt.status === 'FINALIZADO'
                                            ? styles.statusTextFinalizado
                                            : appt.status === 'EM_ATENDIMENTO'
                                            ? styles.statusTextEmAtendimento
                                            : appt.status === 'CONFIRMADO'
                                            ? styles.statusTextConfirmado
                                            : styles.statusTextAgendado
                                        }`}
                                      >
                                        {STATUS_LABEL[appt.status] || appt.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                className={styles.emptySlotContent}
                                onClick={() => handleAddInSlot(hourStr, room)}
                              >
                                <span className={styles.emptySlotLabel}>
                                  {hourStr === '12:00'
                                    ? 'Intervalo'
                                    : hourStr === '13-18h'
                                    ? 'Horários livres'
                                    : isPastSlot
                                    ? 'Encerrado'
                                    : 'Disponível'}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          <div className={styles.compactNoteMobile}>
            <span>↔ Salas em visualização compacta</span>
          </div>
        </div>

        {/* COLUNA DIREITA: RECEPÇÃO E LISTA DE ESPERA COM DADOS REAIS */}
        <aside className={styles.receptionSidebar}>
          {/* 1. CARD RECEPÇÃO */}
          <div className={styles.sideCard}>
            <div className={styles.receptionHeader}>
              <h3 className={styles.sideCardTitle}>RECEPÇÃO</h3>
              <span className={styles.receptionDateSub}>
                Check-ins • {formattedFullDate}
              </span>
            </div>

            <div className={styles.receptionPillBadge}>
              <span>{receptionPatients.length} paciente(s) na recepção</span>
            </div>

            <div className={styles.receptionList}>
              {receptionPatients.length === 0 && pendingCheckinPatients.length === 0 ? (
                <div className={styles.emptySideState}>
                  <CalendarCheck size={20} color="#94a3b8" />
                  <span>Nenhum paciente aguardando atendimento na recepção hoje.</span>
                </div>
              ) : (
                <>
                  {/* Pacientes que já fizeram Check-in */}
                  {receptionPatients.map((p) => (
                    <div key={p.id} className={styles.receptionItem}>
                      <div className={styles.receptionItemHeader}>
                        <strong className={styles.receptionItemName}>{p.patient?.name}</strong>
                        <span className={styles.receptionItemMeta}>
                          {formatTime(p.dateTime)} • {p.room.replace('_', ' ')}
                        </span>
                      </div>

                      <div className={styles.checkinDoneTag}>
                        <span>Check-in realizado</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(p.id, 'EM_ATENDIMENTO')}
                        className={styles.btnEncaminharSala}
                      >
                        Encaminhar à sala
                      </button>
                    </div>
                  ))}

                  {/* Pacientes Agendados aguardando Check-in */}
                  {pendingCheckinPatients.slice(0, 3).map((p) => (
                    <div key={p.id} className={styles.receptionItem}>
                      <div className={styles.receptionItemHeader}>
                        <strong className={styles.receptionItemName}>{p.patient?.name}</strong>
                        <span className={styles.receptionItemMeta}>
                          {formatTime(p.dateTime)} • {p.room.replace('_', ' ')} • Aguardando check-in
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(p.id, 'CONFIRMADO')}
                        className={styles.btnRealizarCheckin}
                      >
                        Realizar check-in
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 2. CARD LISTA DE ESPERA COM DADOS REAIS */}
          <div className={styles.sideCard}>
            <div className={styles.waitingHeaderFigma}>
              <h3 className={styles.sideCardTitle}>Lista de espera</h3>
              <span className={styles.waitingCountSub}>
                {waitingList.length} solicitação(ões) de encaixe
              </span>
            </div>

            <div className={styles.waitingListWrapper}>
              {waitingList.length === 0 ? (
                <div className={styles.emptySideState}>
                  <span>Nenhum paciente aguardando encaixe.</span>
                </div>
              ) : (
                waitingList.slice(0, 3).map((w) => (
                  <div key={w.id} className={styles.waitingPatientCard}>
                    <strong className={styles.waitingPatientName}>{w.patient?.name}</strong>
                    <span className={styles.waitingPrefMeta}>
                      {w.notes || 'Aguardando brecha de horário'}
                    </span>

                    <div className={styles.waitingActionsCol}>
                      <button
                        type="button"
                        onClick={() => openNovoAgendamento()}
                        className={styles.btnOferecerHorario}
                      >
                        Oferecer horário
                      </button>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => setIsWaitingModalOpen(true)}
                className={styles.btnAdicionarEspera}
              >
                Adicionar à espera
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── MODAL DETALHES DO AGENDAMENTO ─── */}
      {selectedAppt && (
        <DetalhesAgendamentoModal
          appointment={selectedAppt as any}
          onClose={() => setSelectedAppt(null)}
          onSuccess={() => loadAppointments(selectedDate)}
          branding={branding}
          loggedUserName={loggedUserName}
        />
      )}

      {/* ─── MODAL ENCAIXE / ESPERA ─── */}
      {isWaitingModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Adicionar à Fila de Espera</h3>
              <button
                type="button"
                onClick={() => setIsWaitingModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWaitingAppointment} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Paciente:</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className={styles.modalSelect}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Dentista Solicitado:</label>
                <select
                  value={selectedDentistId}
                  onChange={(e) => setSelectedDentistId(e.target.value)}
                  className={styles.modalSelect}
                  required
                >
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Observação / Motivo:</label>
                <input
                  type="text"
                  placeholder="Ex: Prefere período da tarde se houver desistência"
                  value={waitingNotes}
                  onChange={(e) => setWaitingNotes(e.target.value)}
                  className={styles.modalInput}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsWaitingModalOpen(false)}
                  className={styles.btnCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWaiting}
                  className={styles.btnSubmit}
                >
                  {savingWaiting ? <Loader2 size={15} className={styles.spinner} /> : <Plus size={15} />}
                  <span>Salvar na Espera</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRMAÇÃO DE MUDANÇA ─── */}
      {pendingMove && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Alterar agendamento</h3>
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p className={styles.confirmText}>
              Tem certeza que deseja mover <strong>{pendingMove.appt.patient?.name}</strong> para as{' '}
              <strong>{pendingMove.newHour}</strong> na <strong>{pendingMove.newRoom.replace('_', ' ')}</strong>?
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className={styles.btnCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmMoveAppointment}
                className={styles.btnSubmit}
              >
                Confirmar Mudança
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST DE ERRO / AVISO DE HORÁRIO ─── */}
      {timeErrorAlert && (
        <div className={styles.toastError}>
          <span>{timeErrorAlert}</span>
          <button type="button" onClick={() => setTimeErrorAlert(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}