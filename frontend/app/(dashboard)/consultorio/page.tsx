'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  UserCheck,
  Play,
  FileText,
  Stethoscope,
  Phone,
  RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'
import styles from './MeuConsultorio.module.css'

interface PatientDetails {
  id: string
  name: string
  phone: string | null
  cpf?: string | null
}

interface Appointment {
  id: string
  patientId: string
  patient?: PatientDetails
  procedure?: {
    id: string
    name: string
    basePrice: number
  } | null
  dateTime: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'ESPERA' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO'
  room?: string | null
}

const ROOMS = [
  { id: 'SALA_1', label: 'Consultório 1' },
  { id: 'SALA_2', label: 'Consultório 2' },
  { id: 'SALA_3', label: 'Consultório 3' },
  { id: 'SALA_4', label: 'Consultório 4' },
]

export default function MeuConsultorioCockpit() {
  const router = useRouter()
  const [selectedRoom, setSelectedRoom] = useState<string>('SALA_1')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const getLocalDateString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 1. Carrega preferências do dentista
  useEffect(() => {
    async function loadDentistProfile() {
      try {
        const { data } = await api.get('/dentist-profile')
        const profile = data?.data || data
        if (profile?.defaultRoom) {
          setSelectedRoom(profile.defaultRoom)
        }
      } catch (err) {
        console.error('Erro ao carregar /dentist-profile:', err)
      }
    }
    loadDentistProfile()
  }, [])

  // 2. Carrega agendamentos da sala
  async function loadAppointments(room: string) {
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
  }

  useEffect(() => {
    loadAppointments(selectedRoom)
  }, [selectedRoom])

  const handleSelectRoom = async (room: string) => {
    setSelectedRoom(room)
    try {
      await api.put('/dentist-profile', { defaultRoom: room })
    } catch (e) {
      console.error('Falha ao sincronizar sala:', e)
    }
  }

  // 3. AÇÃO PRINCIPAL: Leva para a tela de Paciente Profile com o ID e parâmetros de atendimento
  const handleAction = async (appt: Appointment) => {
    if (appt.status !== 'EM_ATENDIMENTO' && appt.status !== 'FINALIZADO') {
      try {
        await api.patch(`/appointments/${appt.id}/status`, { status: 'EM_ATENDIMENTO' })
      } catch (err) {
        console.error('Erro ao mudar status do agendamento:', err)
      }
    }

    router.push(`/pacientes/${appt.patientId}?appointmentId=${appt.id}&room=${selectedRoom}&openEvolution=true`)
  }

  const totalAgendados = appointments.length
  const totalAguardando = appointments.filter((a) => a.status === 'ESPERA').length
  const totalFinalizados = appointments.filter((a) => a.status === 'FINALIZADO').length

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerWrapper}>
        <span className={styles.breadcrumbBadge}>ODONTOFLOW • MEU CONSULTÓRIO</span>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Atendimento Clínico & Mocho</h1>
            <p className={styles.pageDescription}>
              Selecione o consultório em que está operando para visualizar a fila e realizar atendimentos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAppointments(selectedRoom)}
            className={styles.refreshBtn}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Atualizar Fila
          </button>
        </div>
      </div>

      {/* Seletor de Cadeira */}
      <div className={styles.roomSelectorCard}>
        <div className={styles.roomSelectorLabel}>
          <Stethoscope size={18} color="#0284c7" />
          <span>Onde você está atendendo hoje?</span>
        </div>

        <div className={styles.roomsButtons}>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => handleSelectRoom(room.id)}
              className={`${styles.roomBtn} ${selectedRoom === room.id ? styles.roomBtnActive : ''}`}
            >
              {room.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal */}
      <div className={styles.mainGrid}>
        <div className={styles.contentArea}>
          {loading ? (
            <div className={styles.emptyState}>
              <p>Carregando fila de atendimentos...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className={styles.emptyState}>
              <UserCheck size={36} color="#94a3b8" />
              <p className="font-semibold text-slate-800 text-sm m-0">Nenhum paciente agendado para esta sala hoje.</p>
              <p className="text-xs text-slate-500 m-0">
                Novas consultas marcadas pela recepção aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            appointments.map((appt) => {
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
                            <span className="flex items-center gap-1 text-slate-500">
                              <Phone size={11} /> {appt.patient.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
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
            })
          )}
        </div>

        {/* Resumo Lateral da Cadeira */}
        <aside className={styles.sideCard}>
          <div className={styles.sideTitle}>
            <span>Resumo da Cadeira</span>
            <span className={styles.sidePill}>{selectedRoom}</span>
          </div>

          <div className={styles.statRow}>
            <span className={styles.statLabel}>Pacientes na Grade:</span>
            <span className={styles.statValue}>{totalAgendados}</span>
          </div>

          <div className={styles.statRow}>
            <span className={styles.statLabel}>Na Recepção (Espera):</span>
            <span className={styles.statValue}>{totalAguardando}</span>
          </div>

          <div className={styles.statRow}>
            <span className={styles.statLabel}>Atendidos Hoje:</span>
            <span className={styles.statValue}>{totalFinalizados}</span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            💡 Ao clicar em <strong>Iniciar Atendimento</strong>, a consulta transita para a cadeira e você é levado diretamente ao prontuário oficial com anamnese e odontograma.
          </div>
        </aside>
      </div>
    </div>
  )
} 