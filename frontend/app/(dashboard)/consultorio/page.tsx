'use client'

import React, { useState, useEffect } from 'react'
import {
  Clock,
  UserCheck,
  CheckCircle,
  Play,
  FileText,
  X,
  Stethoscope,
  Users,
  Activity,
} from 'lucide-react'
import styles from './MeuConsultorio.module.css'

interface Appointment {
  id: string
  patientId: string
  patient: {
    id: string
    name: string
    phone: string | null
  }
  procedure: {
    id: string
    name: string
    basePrice: number
  } | null
  dateTime: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'ESPERA' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO'
  room: string
}

const ROOMS = [
  { id: 'SALA_1', label: 'Consultório 1' },
  { id: 'SALA_2', label: 'Consultório 2' },
  { id: 'SALA_3', label: 'Consultório 3' },
  { id: 'SALA_4', label: 'Consultório 4' },
]

export default function MeuConsultorioCockpit() {
  const [selectedRoom, setSelectedRoom] = useState<string>('SALA_1')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [evolutionDescription, setEvolutionDescription] = useState('')
  const [savingEvolution, setSavingEvolution] = useState(false)

  async function loadDayAppointments(room: string) {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || ''
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://odontoflow-bbc1.onrender.com'
      const today = new Date().toISOString().split('T')[0]

      const res = await fetch(`${baseUrl}/appointments?room=${room}&date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const json = await res.json()
        setAppointments(json.data || [])
      }
    } catch (error) {
      console.error('Falha ao carregar atendimentos da sala:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDayAppointments(selectedRoom)
  }, [selectedRoom])

  const handleOpenAttendance = async (appt: Appointment) => {
    setActiveAppointment(appt)
    setEvolutionDescription('')
    setModalOpen(true)

    if (appt.status !== 'EM_ATENDIMENTO' && appt.status !== 'FINALIZADO') {
      try {
        const token = localStorage.getItem('token') || ''
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://odontoflow-bbc1.onrender.com'

        await fetch(`${baseUrl}/appointments/${appt.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'EM_ATENDIMENTO' }),
        })

        setAppointments((prev) =>
          prev.map((item) => (item.id === appt.id ? { ...item, status: 'EM_ATENDIMENTO' } : item))
        )
      } catch (err) {
        console.error('Erro ao atualizar status do agendamento:', err)
      }
    }
  }

  const handleFinishAttendance = async () => {
    if (!activeAppointment) return

    try {
      setSavingEvolution(true)
      const token = localStorage.getItem('token') || ''
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://odontoflow-bbc1.onrender.com'

      if (evolutionDescription.trim()) {
        await fetch(`${baseUrl}/medical-records/${activeAppointment.patientId}/evolutions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            description: evolutionDescription,
            procedureId: activeAppointment.procedure?.id || undefined,
            appointmentId: activeAppointment.id,
          }),
        })
      }

      await fetch(`${baseUrl}/appointments/${activeAppointment.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'FINALIZADO',
          procedureId: activeAppointment.procedure?.id || undefined,
        }),
      })

      setAppointments((prev) =>
        prev.map((item) =>
          item.id === activeAppointment.id ? { ...item, status: 'FINALIZADO' } : item
        )
      )
      setModalOpen(false)
      setActiveAppointment(null)
    } catch (err) {
      console.error('Erro ao concluir atendimento:', err)
      alert('Houve um erro ao registrar o atendimento.')
    } finally {
      setSavingEvolution(false)
    }
  }

  // Estatísticas rápidas da sala
  const totalAgendados = appointments.length
  const totalAguardando = appointments.filter((a) => a.status === 'ESPERA').length
  const totalFinalizados = appointments.filter((a) => a.status === 'FINALIZADO').length

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerWrapper}>
        <span className={styles.breadcrumbBadge}>ODONTOFLOW • MEU CONSULTÓRIO</span>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Atendimento Clínico & Mocho</h1>
            <p className={styles.pageDescription}>
              Selecione o consultório em que está operando hoje para visualizar e chamar seus pacientes.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtro de Sala */}
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
              onClick={() => setSelectedRoom(room.id)}
              className={`${styles.roomBtn} ${selectedRoom === room.id ? styles.roomBtnActive : ''}`}
            >
              {room.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Fluida: Fila à Esquerda + Resumo da Sala à Direita */}
      <div className={styles.mainGrid}>
        {/* Coluna Principal: Fila de Atendimento */}
        <div className={styles.contentArea}>
          {loading ? (
            <div className={styles.emptyState}>
              <p>Carregando fila de pacientes...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className={styles.emptyState}>
              <UserCheck size={36} color="#94a3b8" />
              <p className="font-semibold text-slate-800 text-sm m-0">Nenhum paciente agendado para esta sala hoje.</p>
              <p className="text-xs text-slate-500 m-0">
                Novas consultas agendadas pela recepção aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            appointments.map((appt) => {
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
                      {appt.patient.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className={styles.patientMeta}>
                      <div className={styles.patientNameRow}>
                        <span className={styles.patientName}>{appt.patient.name}</span>
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
                      </div>
                    </div>
                  </div>

                  <div>
                    {isDone ? (
                      <span className={styles.doneTag}>Enviado p/ Checkout</span>
                    ) : isServing ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAttendance(appt)}
                        className={styles.continueBtn}
                      >
                        <FileText size={15} />
                        <span>Retomar / Concluir</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAttendance(appt)}
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

        {/* Coluna Lateral: Resumo da Sala (Cockpit) */}
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
            💡 Ao clicar em <strong>Iniciar Atendimento</strong>, a recepção é notificada que o paciente já está no mocho.
          </div>
        </aside>
      </div>

      {/* Modal / Prontuário Rápido */}
      {modalOpen && activeAppointment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{activeAppointment.patient.name}</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  {selectedRoom} • Procedimento: {activeAppointment.procedure?.name || 'Avaliação Geral'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evolução Clínica do Atendimento
                </label>
                <textarea
                  rows={6}
                  value={evolutionDescription}
                  onChange={(e) => setEvolutionDescription(e.target.value)}
                  className={styles.textarea}
                  placeholder="Descreva a conduta clínica, dentes trabalhados, anestésicos ou medicamentos..."
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={styles.cancelBtn}
              >
                Manter em Atendimento
              </button>

              <button
                type="button"
                onClick={handleFinishAttendance}
                disabled={savingEvolution}
                className={styles.finishBtn}
              >
                <CheckCircle size={16} />
                <span>{savingEvolution ? 'Registrando...' : 'Concluir & Mandar para Recepção'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}