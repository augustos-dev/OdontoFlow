'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Stethoscope,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Receipt,
  UserCheck,
  CreditCard,
} from 'lucide-react'
import api from '@/lib/api'
import { FinalizarAtendimentoModal } from '../financeiro/FinalizarAtendimentoModal'
import styles from './DashboardRecepcao.module.css'

interface Appointment {
  id: string
  patientId: string
  patient?: {
    id: string
    name: string
    cpf?: string | null
    email?: string | null
    phone?: string | null
    insuranceProvider?: string | null
    insuranceNumber?: string | null
  }
  procedure?: {
    id: string
    name: string
    basePrice: number
  } | null
  dateTime: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'ESPERA' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO'
  room?: string | null
}

export function DashboardRecepcao() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 🟢 Estado para controlar o modal de checkout/finalização
  const [selectedAppointmentForCheckout, setSelectedAppointmentForCheckout] = useState<Appointment | null>(null)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  const [customization, setCustomization] = useState({
    primaryColor: '#0284c7',
    accentColor: '#06b6d4',
  })

  const getLocalDateString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  async function loadRecepcaoData() {
    try {
      setLoading(true)
      const today = getLocalDateString()

      const [summaryRes, apptsRes, customRes] = await Promise.allSettled([
        api.get('/dashboard/summary'),
        api.get(`/appointments?date=${today}`),
        api.get('/clinics/current/customization'),
      ])

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
        setSummary(summaryRes.value.data)
      }

      if (apptsRes.status === 'fulfilled' && apptsRes.value.data) {
        const raw = Array.isArray(apptsRes.value.data)
          ? apptsRes.value.data
          : apptsRes.value.data.data || []
        setAppointments(raw)
      } else {
        const fallbackRes = await api.get('/appointments').catch(() => ({ data: [] }))
        const raw = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data.data || []
        setAppointments(raw)
      }

      if (customRes.status === 'fulfilled' && customRes.value.data) {
        const cData = customRes.value.data.data || customRes.value.data
        if (cData?.primaryColor) {
          setCustomization({
            primaryColor: cData.primaryColor,
            accentColor: cData.accentColor || '#06b6d4',
          })
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados da recepção:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecepcaoData()
  }, [])

  // Visor Top 5 Consultas por Sala
  const roomSchedules = useMemo(() => {
    const normalize = (roomString?: string | null) => {
      if (!roomString) return '1'
      const digits = roomString.replace(/[^0-9]/g, '')
      return digits || '1'
    }

    const sala1 = appointments
      .filter((a) => normalize(a.room) === '1')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 5)

    const sala2 = appointments
      .filter((a) => normalize(a.room) === '2')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 5)

    return { sala1, sala2 }
  }, [appointments])

  const waitingQueue = useMemo(() => {
    return appointments.filter((a) => a.status === 'ESPERA')
  }, [appointments])

  // Consultas Finalizadas que precisam de Checkout
  const checkoutQueue = useMemo(() => {
    return appointments.filter((a) => a.status === 'FINALIZADO')
  }, [appointments])

  const formatCurrency = (val: number = 0) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // 🟢 Abre o modal de checkout sem sair da tela
  const handleOpenCheckout = (appt: Appointment) => {
    setSelectedAppointmentForCheckout(appt)
    setIsCheckoutModalOpen(true)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando agenda e recepção...</span>
      </div>
    )
  }

  return (
    <div
      className={styles.container}
      style={
        {
          '--clinic-primary': customization.primaryColor,
          '--clinic-accent': customization.accentColor,
        } as React.CSSProperties
      }
    >
      {/* Indicadores Topo */}
      <div className={styles.metricsGrid}>
        <div className={styles.card} onClick={() => router.push('/agenda')}>
          <div className={styles.metricIconBg}>
            <Stethoscope size={18} color="var(--clinic-primary, #0284c7)" />
          </div>
          <span className={styles.metricLabel}>ATENDIMENTOS HOJE</span>
          <span className={styles.metricValue}>{appointments.length || summary?.appointments?.today || 0}</span>
          <span className={styles.metricSub}>agendamentos no dia</span>
        </div>

        <div className={styles.card}>
          <div className={styles.metricIconBg}>
            <Clock size={18} color="#0284c7" />
          </div>
          <span className={styles.metricLabel}>FILA DE ESPERA</span>
          <span className={styles.metricValue}>{waitingQueue.length}</span>
          <span className={styles.metricSub}>pacientes aguardando</span>
        </div>

        <div className={styles.card} onClick={() => router.push('/financeiro')}>
          <div className={styles.metricIconBg}>
            <TrendingUp size={18} color="#16a34a" />
          </div>
          <span className={styles.metricLabel}>RECEITA DO DIA</span>
          <span className={styles.metricValue}>
            {formatCurrency(summary?.financial?.todayRevenue ?? 0)}
          </span>
          <span className={styles.metricSub}>receita de hoje</span>
        </div>

        <div className={styles.card} onClick={() => router.push('/estoque')}>
          <div className={styles.metricIconBg} style={{ background: '#fee2e2' }}>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <span className={styles.metricLabel}>INSUMOS CRÍTICOS</span>
          <span className={`${styles.metricValue} ${styles.alertText}`}>
            {summary?.inventory?.lowStockCount ?? 0}
          </span>
          <span className={styles.metricSub}>reposição necessária</span>
        </div>
      </div>

      {/* Grid Principal: Visor de Salas + Fila de Espera & Checkout */}
      <div className={styles.mainGrid}>
        <div className={styles.agendaCard}>
          <div className={styles.agendaHeader}>
            <div>
              <h3>Agenda do Dia</h3>
              <p>Clique em um agendamento para ver detalhes</p>
            </div>
            <div className={styles.statusLegend}>
              <span className={styles.legendItem}>
                <span className={styles.dotConfirmado} /> Confirmado
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotAtend} /> Na Cadeira
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotFinalizado} /> Finalizado
              </span>
            </div>
          </div>

          <div className={styles.roomsGrid}>
            {/* SALA 1 */}
            <div className={styles.roomCol}>
              <div className={styles.roomColHeader}>
                <h4>SALA 1</h4>
                <span className={styles.roomCountPill}>{roomSchedules.sala1.length} consultas</span>
              </div>

              {roomSchedules.sala1.length === 0 ? (
                <div className={styles.roomEmpty}>Sem agendamentos no momento</div>
              ) : (
                <div className={styles.appointmentsList}>
                  {roomSchedules.sala1.map((appt) => {
                    const isServing = appt.status === 'EM_ATENDIMENTO'
                    const isDone = appt.status === 'FINALIZADO'

                    return (
                      <div
                        key={appt.id}
                        className={`${styles.appointmentItem} ${isServing ? styles.appointmentItemServing : ''}`}
                        onClick={() => router.push(`/pacientes/${appt.patientId}`)}
                      >
                        <div className={styles.apptMainInfo}>
                          <span className={styles.patientName}>
                            {appt.patient?.name || 'Paciente sem nome'}
                          </span>
                          <span className={styles.apptSubMeta}>
                            <span className={styles.timeBadge}>{formatTime(appt.dateTime)}</span>
                            <span>•</span>
                            <span>{appt.procedure?.name || 'Avaliação'}</span>
                          </span>
                        </div>

                        <span
                          className={`${styles.statusMiniBadge} ${
                            isServing
                              ? styles.statusMiniServing
                              : isDone
                              ? styles.statusMiniDone
                              : appt.status === 'ESPERA'
                              ? styles.statusMiniWait
                              : styles.statusMiniScheduled
                          }`}
                        >
                          {isServing
                            ? 'Na Cadeira'
                            : isDone
                            ? 'Finalizado'
                            : appt.status === 'ESPERA'
                            ? 'Na Espera'
                            : 'Agendado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SALA 2 */}
            <div className={styles.roomCol}>
              <div className={styles.roomColHeader}>
                <h4>SALA 2</h4>
                <span className={styles.roomCountPill}>{roomSchedules.sala2.length} consultas</span>
              </div>

              {roomSchedules.sala2.length === 0 ? (
                <div className={styles.roomEmpty}>Sem agendamentos no momento</div>
              ) : (
                <div className={styles.appointmentsList}>
                  {roomSchedules.sala2.map((appt) => {
                    const isServing = appt.status === 'EM_ATENDIMENTO'
                    const isDone = appt.status === 'FINALIZADO'

                    return (
                      <div
                        key={appt.id}
                        className={`${styles.appointmentItem} ${isServing ? styles.appointmentItemServing : ''}`}
                        onClick={() => router.push(`/pacientes/${appt.patientId}`)}
                      >
                        <div className={styles.apptMainInfo}>
                          <span className={styles.patientName}>
                            {appt.patient?.name || 'Paciente sem nome'}
                          </span>
                          <span className={styles.apptSubMeta}>
                            <span className={styles.timeBadge}>{formatTime(appt.dateTime)}</span>
                            <span>•</span>
                            <span>{appt.procedure?.name || 'Avaliação'}</span>
                          </span>
                        </div>

                        <span
                          className={`${styles.statusMiniBadge} ${
                            isServing
                              ? styles.statusMiniServing
                              : isDone
                              ? styles.statusMiniDone
                              : appt.status === 'ESPERA'
                              ? styles.statusMiniWait
                              : styles.statusMiniScheduled
                          }`}
                        >
                          {isServing
                            ? 'Na Cadeira'
                            : isDone
                            ? 'Finalizado'
                            : appt.status === 'ESPERA'
                            ? 'Na Espera'
                            : 'Agendado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra Lateral: Checkout & Fila de Espera */}
        <div className={styles.sidebarCards}>
          {/* CARD DE AGUARDANDO CHECKOUT */}
          <div className={`${styles.cardSide} ${styles.cardSideHighlight}`}>
            <div className={styles.sideHeader}>
              <h4>
                <Receipt size={16} color="#059669" />
                <span>Aguardando Checkout</span>
              </h4>
              <span className={styles.counterBadgeGreen}>{checkoutQueue.length}</span>
            </div>

            {checkoutQueue.length === 0 ? (
              <p className={styles.emptyText}>Nenhum atendimento pendente de liquidação.</p>
            ) : (
              <div className={styles.checkoutList}>
                {checkoutQueue.map((appt) => (
                  <div key={appt.id} className={styles.checkoutItem}>
                    <div className={styles.checkoutInfo}>
                      <span className={styles.checkoutPatient}>
                        {appt.patient?.name || 'Paciente'}
                      </span>
                      <span className={styles.checkoutProcedure}>
                        {appt.procedure?.name || 'Procedimento Clínico'}
                      </span>
                      <span className={styles.checkoutPrice}>
                        {formatCurrency(appt.procedure?.basePrice || 0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(appt)}
                      className={styles.btnCheckout}
                    >
                      <CreditCard size={13} />
                      <span>Liquidar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD DE FILA DE ESPERA */}
          <div className={styles.cardSide}>
            <div className={styles.sideHeader}>
              <h4>
                <UserCheck size={16} color="var(--clinic-primary, #0284c7)" />
                <span>Fila de Espera</span>
              </h4>
              <span className={styles.counterBadge}>{waitingQueue.length}</span>
            </div>

            {waitingQueue.length === 0 ? (
              <p className={styles.emptyText}>Nenhum paciente na fila.</p>
            ) : (
              <div className={styles.checkoutList}>
                {waitingQueue.map((appt) => (
                  <div key={appt.id} className={styles.appointmentItem}>
                    <div className={styles.apptMainInfo}>
                      <span className={styles.patientName}>{appt.patient?.name}</span>
                      <span className={styles.apptSubMeta}>
                        <span className={styles.timeBadge}>{formatTime(appt.dateTime)}</span>
                        <span>•</span>
                        <span>{appt.room?.replace('_', ' ') || 'Sala 1'}</span>
                      </span>
                    </div>
                    <span className={`${styles.statusMiniBadge} ${styles.statusMiniWait}`}>Na Espera</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🟢 Modal de Checkout / Finalização da Consulta & Emissão de NFS-e */}
      <FinalizarAtendimentoModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false)
          setSelectedAppointmentForCheckout(null)
        }}
        onSuccess={() => {
          loadRecepcaoData()
        }}
        appointment={
          selectedAppointmentForCheckout
            ? {
                id: selectedAppointmentForCheckout.id,
                dateTime: selectedAppointmentForCheckout.dateTime,
                procedureId: selectedAppointmentForCheckout.procedure?.id,
                procedure: selectedAppointmentForCheckout.procedure,
                patient: {
                  id: selectedAppointmentForCheckout.patientId,
                  name: selectedAppointmentForCheckout.patient?.name || 'Paciente',
                  cpf: selectedAppointmentForCheckout.patient?.cpf,
                  email: selectedAppointmentForCheckout.patient?.email,
                  insuranceProvider: selectedAppointmentForCheckout.patient?.insuranceProvider,
                  insuranceNumber: selectedAppointmentForCheckout.patient?.insuranceNumber,
                },
              }
            : null
        }
      />
    </div>
  )
}