'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  Phone,
  Play,
  FileText,
  RefreshCw,
  Info,
  CheckCircle2,
  X,
  UserCheck,
} from 'lucide-react'
import api from '@/lib/api'
import styles from './MeuConsultorio.module.css'

// 🪑 SVG da Cadeira/Mocho Odontológico do Figma
export function DentalChairIcon({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8z" />
      <path d="M4 11h16" />
      <path d="M5 14v4a1 1 0 0 0 1 1h1" />
      <path d="M19 14v4a1 1 0 0 1-1 1h-1" />
      <path d="M12 15v5" />
      <path d="M9 20h6" />
    </svg>
  )
}

interface RoomOption {
  id: string
  label: string
}

interface Patient {
  id: string
  name: string
  phone?: string
}

interface Procedure {
  id: string
  name: string
}

interface Appointment {
  id: string
  patientId: string
  dateTime: string
  room?: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'ESPERA' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO'
  patient?: Patient
  procedure?: Procedure
}

interface UserProfile {
  id: string
  name: string
  role?: string
  cro?: string
  specialty?: string
  clinicId?: string
  tenantId?: string
  defaultRoom?: string
}

interface ChecklistState {
  equipamentos: boolean
  esterilizacao: boolean
  lastCheckedDate: string // YYYY-MM-DD
  lastCheckedTime: string // HH:mm
}

const ROOMS: RoomOption[] = [
  { id: 'SALA_1', label: 'Consultório 1' },
  { id: 'SALA_2', label: 'Consultório 2' },
  { id: 'SALA_3', label: 'Consultório 3' },
  { id: 'SALA_4', label: 'Consultório 4' },
]

function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function MeuConsultorioPage() {
  const router = useRouter()

  const [selectedRoom, setSelectedRoom] = useState<string>('SALA_1')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // ─── Usuário Logado & Dentista Ativo Vinculado à Sala ───
  const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(null)
  const [assignedDoctor, setAssignedDoctor] = useState<UserProfile | null>(null)
  
  // ─── Modal de Troca de Profissional ───
  const [isChangeDoctorModalOpen, setIsChangeDoctorModalOpen] = useState(false)
  const [availableDentists, setAvailableDentists] = useState<UserProfile[]>([])
  const [loadingDentists, setLoadingDentists] = useState(false)

  // ─── Checklist da Sala ───
  const [checklist, setChecklist] = useState<ChecklistState>({
    equipamentos: false,
    esterilizacao: false,
    lastCheckedDate: '',
    lastCheckedTime: '',
  })

  // ─── 1. Carrega Perfil do Usuário Logado e Inicializa o Profissional ───
  const hasLoadedProfileRef = useRef(false)

  useEffect(() => {
    if (hasLoadedProfileRef.current) return
    hasLoadedProfileRef.current = true

    async function initProfile() {
      try {
        // Tenta obter instantaneamente do localStorage
        const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')
        let initialProfile: UserProfile | null = null

        if (stored) {
          try {
            initialProfile = JSON.parse(stored)
            if (initialProfile) {
              setLoggedInUser(initialProfile)
              setAssignedDoctor(initialProfile)
              if (initialProfile.defaultRoom) setSelectedRoom(initialProfile.defaultRoom)
            }
          } catch (e) {
            console.error('Erro ao ler perfil do storage:', e)
          }
        }

        // Busca dados enriquecidos no backend (/auth/me ou /dentist-profile)
        const meRes = await api.get('/auth/me').catch(() => null)
        const meData = meRes?.data?.user || meRes?.data?.data || meRes?.data

        if (meData?.id) {
          const completeUser: UserProfile = {
            id: meData.id,
            name: meData.name || initialProfile?.name || 'Cirurgião-Dentista',
            role: meData.role || initialProfile?.role || 'DENTIST',
            cro: meData.cro || initialProfile?.cro || '',
            specialty: meData.specialty || initialProfile?.specialty || 'Clínica Geral',
            clinicId: meData.clinicId || meData.tenantId || initialProfile?.clinicId,
            tenantId: meData.tenantId || initialProfile?.tenantId,
            defaultRoom: meData.defaultRoom || initialProfile?.defaultRoom,
          }
          setLoggedInUser(completeUser)
          setAssignedDoctor(completeUser)
          if (completeUser.defaultRoom) setSelectedRoom(completeUser.defaultRoom)
        }
      } catch (err) {
        console.error('Erro ao inicializar perfil:', err)
      }
    }

    initProfile()
  }, [])

  // ─── 2. Carrega Agendamentos da Sala ───
  const loadAppointments = useCallback(async (room: string) => {
    try {
      setLoading(true)
      const today = getLocalDateString()

      let rawList: Appointment[] = []
      try {
        const res = await api.get(`/appointments?date=${today}`)
        const json = res.data
        rawList = Array.isArray(json) ? json : json.data || []
      } catch {
        const fallbackRes = await api.get('/appointments')
        const fallbackJson = fallbackRes.data
        rawList = Array.isArray(fallbackJson) ? fallbackJson : fallbackJson.data || []
      }

      const targetDigits = room.replace(/[^0-9]/g, '')
      const filtered = rawList.filter((appt) => {
        if (!appt.room) return true
        const apptDigits = String(appt.room).replace(/[^0-9]/g, '')
        return apptDigits === targetDigits || appt.room === room
      })

      setAppointments(filtered)
    } catch (error) {
      console.error('Falha ao carregar fila:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadAppointments(selectedRoom)
    }
  }, [selectedRoom, loadAppointments])

  // ─── 3. Chave de Checklist Isolada por Tenant + Usuário Específico + Sala ───
  const activeDoctorId = assignedDoctor?.id || loggedInUser?.id || 'default'
  const activeTenantId = loggedInUser?.clinicId || loggedInUser?.tenantId || 'global'

  const getChecklistStorageKey = useCallback(() => {
    return `odontoflow_checklist_${activeTenantId}_${activeDoctorId}_${selectedRoom}`
  }, [activeTenantId, activeDoctorId, selectedRoom])

  // ─── 4. Leitura e Reset Diário (24h) do Checklist ───
  useEffect(() => {
    if (!selectedRoom || !activeDoctorId) return

    const todayStr = getLocalDateString()
    const storageKey = getChecklistStorageKey()
    const saved = localStorage.getItem(storageKey)

    if (saved) {
      try {
        const parsed: ChecklistState = JSON.parse(saved)
        if (parsed.lastCheckedDate === todayStr) {
          setChecklist(parsed)
          return
        }
      } catch (err) {
        console.error('Erro ao ler checklist:', err)
      }
    }

    setChecklist({
      equipamentos: false,
      esterilizacao: false,
      lastCheckedDate: todayStr,
      lastCheckedTime: '',
    })
  }, [selectedRoom, activeDoctorId, getChecklistStorageKey])

  // ─── Ações de Troca de Sala ───
  const handleSelectRoom = async (room: string) => {
    setSelectedRoom(room)
    try {
      await api.put('/dentist-profile', { defaultRoom: room }).catch(() => null)
    } catch (e) {
      console.error('Falha ao sincronizar sala:', e)
    }
  }

  // ─── Modal de Troca de Profissional ───
  const openChangeDoctorModal = async () => {
    setIsChangeDoctorModalOpen(true)
    try {
      setLoadingDentists(true)
      // Chama o endpoint do Swagger: /users?role=DENTIST&isActive=true
      const res = await api.get('/users?role=DENTIST&isActive=true').catch(() => null)
      const data = res?.data?.data || res?.data || []
      const dentistsList = Array.isArray(data) ? data : []
      setAvailableDentists(dentistsList)
    } catch (e) {
      console.error('Erro ao buscar lista de dentistas:', e)
    } finally {
      setLoadingDentists(false)
    }
  }

  const handleSelectDoctor = (doctor: UserProfile) => {
    setAssignedDoctor({
      id: doctor.id,
      name: doctor.name,
      role: doctor.role || 'DENTIST',
      cro: doctor.cro || '',
      specialty: doctor.specialty || 'Clínica Geral',
    })
    setIsChangeDoctorModalOpen(false)
  }

  // ─── Ações do Checklist ───
  function handleConfirmChecklist() {
    const now = new Date()
    const todayStr = getLocalDateString()
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const updated: ChecklistState = {
      equipamentos: true,
      esterilizacao: true,
      lastCheckedDate: todayStr,
      lastCheckedTime: timeStr,
    }

    setChecklist(updated)
    localStorage.setItem(getChecklistStorageKey(), JSON.stringify(updated))
  }

  function handleToggleItem(key: 'equipamentos' | 'esterilizacao') {
    const now = new Date()
    const todayStr = getLocalDateString()
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    setChecklist((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
        lastCheckedDate: todayStr,
        lastCheckedTime: timeStr,
      }
      localStorage.setItem(getChecklistStorageKey(), JSON.stringify(next))
      return next
    })
  }

  // ─── Ação Principal: Iniciar / Concluir Consulta ───
  const handleAction = async (appt: Appointment) => {
    if (appt.status !== 'EM_ATENDIMENTO' && appt.status !== 'FINALIZADO') {
      try {
        await api.patch(`/appointments/${appt.id}/status`, { status: 'EM_ATENDIMENTO' })
      } catch (err) {
        console.error('Erro ao atualizar status do agendamento:', err)
      }
    }

    router.push(
      `/pacientes/${appt.patientId}?appointmentId=${appt.id}&room=${selectedRoom}&openEvolution=true`
    )
  }

  // ─── Contadores em Tempo Real ───
  const totalAgendados = useMemo(() => appointments.length, [appointments])
  const totalAguardando = useMemo(
    () => appointments.filter((a) => a.status === 'ESPERA').length,
    [appointments]
  )
  const totalFinalizados = useMemo(
    () => appointments.filter((a) => a.status === 'FINALIZADO').length,
    [appointments]
  )

  const isChecklistComplete = checklist.equipamentos && checklist.esterilizacao

  return (
    <div className={styles.consultorioContainer}>
      {/* ─── TOPO LOCAL DA PÁGINA COM ATUALIZAÇÃO ─── */}
      

      {/* ─── CARD PRINCIPAL: SELETOR DE CADEIRAS (FIGMA) ─── */}
      <div className={styles.roomSelectorPanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Onde você está atendendo hoje?</h2>
          <p className={styles.panelSubtitle}>
            Selecione a sala para acompanhar sua fila e iniciar o atendimento.
          </p>
        </div>

        <div className={styles.roomsGrid}>
          {ROOMS.map((room) => {
            const isSelected = selectedRoom === room.id

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room.id)}
                className={`${styles.roomCard} ${isSelected ? styles.roomCardActive : ''}`}
              >
                <div
                  className={`${styles.roomIconWrap} ${
                    isSelected ? styles.iconActive : styles.iconInactive
                  }`}
                >
                  <DentalChairIcon size={22} />
                </div>

                <div className={styles.roomDetails}>
                  <span className={`${styles.roomName} ${isSelected ? styles.textActive : ''}`}>
                    {room.label}
                  </span>
                  <span
                    className={`${styles.roomStatusTag} ${
                      isSelected ? styles.tagActive : styles.tagAvailable
                    }`}
                  >
                    {isSelected ? 'Selecionado' : 'Disponível'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── GRID PRINCIPAL DO MOCHO ─── */}
      <div className={styles.mainGrid}>
        {/* Coluna Esquerda: Fila de Atendimento / Estado Vazio */}
        <section className={styles.contentArea}>
          {loading ? (
            <div className={styles.emptyCard}>
              <RefreshCw size={24} className={styles.spinIcon} />
              <p className={styles.emptyCardText}>Carregando fila de atendimentos da sala...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className={styles.chairIconWrapper}>
                <DentalChairIcon size={32} />
              </div>

              <h3 className={styles.emptyCardTitle}>Nenhum paciente agendado para esta sala</h3>
              <p className={styles.emptyCardSubtitle}>
                A agenda do {ROOMS.find((r) => r.id === selectedRoom)?.label || 'Consultório 1'} está livre hoje.
                Vincule um paciente ou consulte os próximos horários.
              </p>

              <button
                type="button"
                onClick={() => router.push('/agenda')}
                className={styles.btnOpenAgenda}
              >
                <Calendar size={16} />
                <span>Abrir agenda integrada</span>
              </button>

              <div className={styles.roomReadyBadge}>
                <span className={styles.greenDot} />
                <span>{selectedRoom.toUpperCase()} • PRONTA PARA ATENDER</span>
              </div>
            </div>
          ) : (
            <div className={styles.patientList}>
              {appointments.map((appt) => {
                const patientDisplayName = appt.patient?.name || 'Paciente sem nome'
                const timeFormatted = new Date(appt.dateTime).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const isServing = appt.status === 'EM_ATENDIMENTO'
                const isDone = appt.status === 'FINALIZADO'

                return (
                  <div
                    key={appt.id}
                    className={`${styles.patientCard} ${isServing ? styles.patientCardServing : ''}`}
                  >
                    <div className={styles.patientInfo}>
                      <div className={styles.avatarCircle}>
                        {patientDisplayName.substring(0, 2).toUpperCase()}
                      </div>

                      <div className={styles.patientMeta}>
                        <div className={styles.patientNameRow}>
                          <span className={styles.patientName}>{patientDisplayName}</span>
                          <span
                            className={`${styles.statusPill} ${
                              appt.status === 'ESPERA'
                                ? styles.statusEspera
                                : isServing
                                ? styles.statusEmAtendimento
                                : isDone
                                ? styles.statusFinalizado
                                : styles.statusAgendado
                            }`}
                          >
                            {appt.status === 'ESPERA'
                              ? 'Aguardando Recepção'
                              : isServing
                              ? 'Na Cadeira'
                              : isDone
                              ? 'Atendido (Aguardando Checkout)'
                              : 'Agendado'}
                          </span>
                        </div>

                        <div className={styles.patientSub}>
                          <span className={styles.badgeTime}>
                            <Clock size={13} /> {timeFormatted}
                          </span>
                          <span>•</span>
                          <span>{appt.procedure?.name || 'Avaliação Geral'}</span>
                          {appt.patient?.phone && (
                            <>
                              <span>•</span>
                              <span className={styles.phoneGroup}>
                                <Phone size={11} /> {appt.patient.phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.patientActionCol}>
                      {isDone ? (
                        <span className={styles.doneTag}>Enviado p/ Checkout</span>
                      ) : isServing ? (
                        <button
                          type="button"
                          onClick={() => handleAction(appt)}
                          className={styles.continueBtn}
                        >
                          <FileText size={15} />
                          <span>Retomar / Concluir</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAction(appt)}
                          className={styles.startBtn}
                        >
                          <Play size={14} />
                          <span>Iniciar Atendimento</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Banner de Orientações Clínicas Pré-Atendimento */}
          <div className={styles.guidelineBanner}>
            <Info size={17} className={styles.bannerInfoIcon} />
            <div className={styles.bannerText}>
              <strong>Antes de iniciar:</strong>
              <span>Confira a anamnese, as alergias e o consentimento do paciente no prontuário.</span>
            </div>
          </div>
        </section>

        {/* Coluna Direita: Resumo da Cadeira, Equipe & Checklist */}
        <aside className={styles.sideCardsColumn}>
          {/* 1. Resumo da Cadeira */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <h3 className={styles.summaryTitle}>
                RESUMO DA CADEIRA - {selectedRoom.toUpperCase()}
              </h3>
              <span className={styles.summaryDate}>
                {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className={styles.summaryStatsList}>
              <div className={styles.summaryStatItem}>
                <span className={styles.statLabel}>Pacientes na Grade</span>
                <span className={styles.statNumber}>{totalAgendados}</span>
              </div>

              <div className={styles.summaryStatItem}>
                <span className={styles.statLabel}>Em Espera</span>
                <span className={styles.statNumber}>{totalAguardando}</span>
              </div>

              <div className={styles.summaryStatItem}>
                <span className={styles.statLabel}>Atendidos</span>
                <span className={styles.statNumber}>{totalFinalizados}</span>
              </div>
            </div>
          </div>

          {/* 2. Equipe Vinculada (Traz dinâmico os dados do dentista logado) */}
          <div className={styles.summaryCard}>
            <div className={styles.teamCardHeader}>
              <h3 className={styles.teamCardTitle}>Equipe vinculada</h3>
            </div>

            <div className={styles.teamDoctorInfo}>
              <span className={styles.doctorName}>
                {assignedDoctor?.name || loggedInUser?.name || 'Dr(a). Cirurgião-Dentista'}
              </span>
              <span className={styles.doctorRole}>
                {assignedDoctor?.specialty || 'Clínica geral'} • {assignedDoctor?.cro ? `CRO: ${assignedDoctor.cro}` : 'CRO Ativo'}
              </span>
              <span className={styles.doctorStatusBadge}>Disponível</span>
            </div>

            <button
              type="button"
              onClick={openChangeDoctorModal}
              className={styles.btnChangeDoctor}
            >
              Alterar profissional
            </button>
          </div>

          {/* 3. Checklist da Sala com Reset Diário (24h) e Isolamento Multi-Tenant */}
          <div className={styles.summaryCard}>
            <div className={styles.checklistCardHeader}>
              <h3 className={styles.checklistTitle}>Checklist da sala</h3>
              <span className={isChecklistComplete ? styles.badgeChecked : styles.badgePending}>
                {isChecklistComplete ? 'Conferido' : 'Pendente hoje'}
              </span>
            </div>

            <div className={styles.checklistItemsList}>
              <div
                className={styles.checklistItem}
                onClick={() => handleToggleItem('equipamentos')}
                role="button"
                tabIndex={0}
              >
                <span className={checklist.equipamentos ? styles.checkIconChecked : styles.checkIconPending}>
                  {checklist.equipamentos ? '✓' : '○'}
                </span>
                <span className={checklist.equipamentos ? styles.checkItemLabel : styles.checkItemLabelPending}>
                  Equipamentos conferidos
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => handleToggleItem('esterilizacao')}
                role="button"
                tabIndex={0}
              >
                <span className={checklist.esterilizacao ? styles.checkIconChecked : styles.checkIconPending}>
                  {checklist.esterilizacao ? '✓' : '○'}
                </span>
                <span className={checklist.esterilizacao ? styles.checkItemLabel : styles.checkItemLabelPending}>
                  Esterilização registrada
                </span>
              </div>
            </div>

            {!isChecklistComplete ? (
              <button
                type="button"
                onClick={handleConfirmChecklist}
                className={styles.btnConfirmChecklist}
              >
                <CheckCircle2 size={14} />
                <span>Confirmar Materiais & Mocho</span>
              </button>
            ) : (
              <div className={styles.checklistFooterMeta}>
                <span>Última conferência: hoje, {checklist.lastCheckedTime || '08:00'}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─── MODAL RÁPIDO: ALTERAR PROFISSIONAL NA SALA ─── */}
      {isChangeDoctorModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Alterar Profissional no Mocho</h3>
              <button
                type="button"
                onClick={() => setIsChangeDoctorModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p className={styles.modalSubtitle}>
              Selecione o dentista responsável pela {selectedRoom.replace('_', ' ')} hoje:
            </p>

            <div className={styles.doctorsList}>
              {loadingDentists ? (
                <div className={styles.modalLoading}>
                  <RefreshCw size={18} className={styles.spinIcon} />
                  <span>Buscando dentistas ativos...</span>
                </div>
              ) : availableDentists.length === 0 ? (
                <div className={styles.modalEmpty}>
                  <UserCheck size={28} color="#94a3b8" />
                  <span>Nenhum outro dentista encontrado na clínica.</span>
                </div>
              ) : (
                availableDentists.map((doc) => {
                  const isCurrent = doc.id === (assignedDoctor?.id || loggedInUser?.id)
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDoctor(doc)}
                      className={`${styles.doctorSelectCard} ${isCurrent ? styles.doctorSelectCardActive : ''}`}
                    >
                      <div className={styles.doctorSelectInfo}>
                        <span className={styles.doctorSelectName}>{doc.name}</span>
                        <span className={styles.doctorSelectMeta}>
                          {doc.specialty || 'Clínica Geral'} {doc.cro ? `• CRO: ${doc.cro}` : ''}
                        </span>
                      </div>
                      {isCurrent && <span className={styles.currentDocBadge}>Ativo</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}