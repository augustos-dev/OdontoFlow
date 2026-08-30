'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import styles from './DetalhesAgendamentoModal.module.css'
import { FinalizarAtendimentoModal } from '@/app/components/financeiro/FinalizarAtendimentoModal'

interface Procedure {
  id: string
  name: string
  code?: string
  basePrice?: number
}

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  type: string
  room: string
  notes?: string
  cancellationReason?: string
  procedureId?: string
  procedure?: Procedure
  patient: { 
    id: string
    name: string
    phone: string
    email?: string
    insuranceProvider?: string | null
    insuranceNumber?: string | null
  }
  dentist: { id: string; name: string; cro?: string }
  transaction?: { id: string; amount: string; paymentMethod: string } | null
}

interface Props {
  appointment: Appointment | null
  onClose: () => void
  onSuccess: () => void
  onOpenEvolutionModal?: (params: {
    patientId: string
    patientName: string
    procedureId?: string
    appointmentId: string
  }) => void
}

const STATUS_LIST = [
  { value: 'AGENDADO', label: 'Agendada', color: '#2563eb' },
  { value: 'CONFIRMADO', label: 'Confirmada', color: '#16a34a' },
  { value: 'AGUARDANDO', label: 'Paciente aguardando', color: '#ea580c' },
  { value: 'EM_ATENDIMENTO', label: 'Paciente em atendimento', color: '#9333ea' },
  { value: 'FINALIZADO', label: 'Finalizada (Cobrança)', color: '#16a34a' },
  { value: 'FALTOU', label: 'Faltou', color: '#dc2626' },
  { value: 'CANCELADO', label: 'Cancelada', color: '#dc2626' },
]

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDITO: 'Cartão de Crédito',
  DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CONVENIO: 'Convênio',
}

export default function DetalhesAgendamentoModal({
  appointment,
  onClose,
  onSuccess,
  onOpenEvolutionModal,
}: Props) {
  const router = useRouter()

  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false)

  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  if (!appointment) return null

  const isFinished = ['FINALIZADO', 'CANCELADO', 'FALTOU'].includes(appointment.status)

  // Datas e horários
  const dt = new Date(appointment.dateTime)
  const dateFormatted = dt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const endDt = new Date(dt.getTime() + (appointment.durationMin || 30) * 60000)
  const timeFormatted = `${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${endDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  const currentStatusObj = STATUS_LIST.find((s) => s.value === appointment.status) || STATUS_LIST[0]

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  function handleOpenWhatsapp() {
    const cleanPhone = appointment?.patient?.phone ? appointment.patient.phone.replace(/\D/g, '') : ''
    const msg = encodeURIComponent(
      `Olá ${appointment?.patient?.name}, confirmamos sua consulta para ${dateFormatted} às ${timeFormatted}?`
    )
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank')
  }

  // 1. Redireciona para o prontuário do paciente
  function handleOpenPatientRecord() {
    if (!appointment?.patient?.id) return
    onClose()
    router.push(`/pacientes/${appointment.patient.id}?tab=prontuario`)
  }

  // 2. Aciona o modal de nova evolução clínica já com o agendamento e procedimento amarrados
  function handleAddEvolution() {
    if (!appointment?.patient?.id) return
    onClose()

    if (onOpenEvolutionModal) {
      onOpenEvolutionModal({
        patientId: appointment.patient.id,
        patientName: appointment.patient.name,
        procedureId: appointment.procedureId || appointment.procedure?.id,
        appointmentId: appointment.id,
      })
    } else {
      router.push(
        `/pacientes/${appointment.patient.id}?tab=prontuario&openEvolution=true&appointmentId=${appointment.id}&procedureId=${appointment.procedureId || ''}`
      )
    }
  }

  async function handleSelectStatus(targetStatus: string) {
    setShowStatusDropdown(false)
    setError('')

    // Abre o modal de cobrança/finalização caso escolha FINALIZADO
    if (targetStatus === 'FINALIZADO') {
      setIsFinalizarModalOpen(true)
      return
    }

    if (targetStatus === 'CANCELADO') {
      setPendingStatus(targetStatus)
      return
    }

    await executeStatusUpdate(targetStatus)
  }

  async function executeStatusUpdate(statusToSave: string, reason?: string) {
    setLoadingStatus(true)
    setError('')
    try {
      await api.patch(`/appointments/${appointment?.id}/status`, {
        status: statusToSave,
        procedureId: appointment?.procedureId || appointment?.procedure?.id || undefined,
        ...(reason && { cancellationReason: reason }),
      })
      setPendingStatus(null)
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao atualizar status.')
    } finally {
      setLoadingStatus(false)
    }
  }

  async function handleDelete() {
    setLoadingDelete(true)
    try {
      await api.delete(`/appointments/${appointment?.id}`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao deletar agendamento.')
      setConfirmDelete(false)
    } finally {
      setLoadingDelete(false)
    }
  }

  function handleClose() {
    setShowStatusDropdown(false)
    setCancellationReason('')
    setPendingStatus(null)
    setError('')
    setConfirmDelete(false)
    setIsFinalizarModalOpen(false)
    onClose()
  }

  return (
    <>
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className={styles.popoverCard}>
          
          {/* ─── HEADER: AVATAR, PACIENTE & WHATSAPP ─── */}
          <div className={styles.header}>
            <div className={styles.avatar}>{getInitials(appointment.patient.name)}</div>
            <div className={styles.headerInfo}>
              <h3
                className={styles.patientNameClickable}
                onClick={handleOpenPatientRecord}
                title="Clique para ir ao cadastro do paciente"
              >
                {appointment.patient.name}
              </h3>
              <div className={styles.phoneRow}>
                <span>{appointment.patient.phone}</span>
                <button type="button" className={styles.btnWhatsapp} onClick={handleOpenWhatsapp}>
                  💬 Confirmar consulta
                </button>
              </div>
              {appointment.patient.email && (
                <div className={styles.emailSub}>{appointment.patient.email}</div>
              )}
            </div>
            <button type="button" className={styles.closeBtn} onClick={handleClose}>✕</button>
          </div>

          {/* ─── ATALHOS RÁPIDOS FUNCIONAIS ─── */}
          <div className={styles.quickActions}>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={handleOpenPatientRecord}
            >
              Abrir prontuário
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={handleAddEvolution}
            >
              Adicionar evolução
            </button>
          </div>

          {/* ─── BOTÃO DE AÇÃO PRINCIPAL & FINALIZAR ─── */}
          <div className={styles.primaryActionRow}>
            {!isFinished && (
              <button
                type="button"
                className={styles.btnFinishAction || styles.btnEdit}
                style={{ background: '#16a34a', color: '#ffffff', border: 'none' }}
                onClick={() => setIsFinalizarModalOpen(true)}
              >
                💳 Finalizar & Cobrar
              </button>
            )}
            <button
              type="button"
              className={styles.btnIconCopy}
              title="Copiar detalhes"
              onClick={() =>
                navigator.clipboard.writeText(
                  `${appointment.patient.name} - ${dateFormatted} às ${timeFormatted}`
                )
              }
            >
              📋
            </button>
          </div>

          {/* ─── DETALHES DO AGENDAMENTO ─── */}
          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <span className={styles.icon}>👨‍⚕️</span>
              <span>
                <strong>{appointment.dentist.name}</strong> • {appointment.room?.replace('_', ' ') ?? '—'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.icon}>📅</span>
              <span>{dateFormatted}</span>
              <span className={styles.iconTime}>🕒</span>
              <span>{timeFormatted}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.icon}>🏷️</span>
              <span>
                {appointment.type === 'PARTICULAR' ? 'Particular' : 'Convênio'} ({appointment.durationMin} min)
              </span>
            </div>

            {/* Procedimento atrelado */}
            {appointment.procedure && (
              <div className={styles.procedureBadgeBox}>
                <span className={styles.icon}>🦷</span>
                <span>
                  <strong>Procedimento:</strong> {appointment.procedure.name}
                </span>
              </div>
            )}

            {appointment.notes && (
              <div className={styles.notesBox}>
                <strong>Observações:</strong> {appointment.notes}
              </div>
            )}

            {appointment.cancellationReason && (
              <div className={styles.cancelReasonBox}>
                <strong>Motivo do Cancelamento:</strong> {appointment.cancellationReason}
              </div>
            )}

            {appointment.transaction && (
              <div className={styles.transactionCard}>
                <span className={styles.transactionAmount}>
                  {Number(appointment.transaction.amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
                <span className={styles.transactionMethod}>
                  {PAYMENT_LABEL[appointment.transaction.paymentMethod] ?? appointment.transaction.paymentMethod}
                </span>
              </div>
            )}
          </div>

          {/* ─── SELECT DE STATUS COM DROPDOWN FLUTUANTE ─── */}
          {!isFinished && (
            <div className={styles.statusSection}>
              <button
                type="button"
                className={styles.statusSelectTrigger}
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={loadingStatus}
              >
                <div className={styles.statusLeft}>
                  <span className={styles.dot} style={{ background: currentStatusObj.color }} />
                  <span>{currentStatusObj.label}</span>
                </div>
                <span className={styles.arrow}>{showStatusDropdown ? '▲' : '▼'}</span>
              </button>

              {showStatusDropdown && (
                <div className={styles.statusDropdownMenu}>
                  {STATUS_LIST.map((st) => (
                    <div
                      key={st.value}
                      className={`${styles.statusOption} ${st.value === appointment.status ? styles.selectedOption : ''}`}
                      onClick={() => handleSelectStatus(st.value)}
                    >
                      <div className={styles.statusLeft}>
                        <span className={styles.dot} style={{ background: st.color }} />
                        <span>{st.label}</span>
                      </div>
                      {st.value === appointment.status && <span className={styles.check}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campo para motivo de cancelamento */}
          {pendingStatus === 'CANCELADO' && (
            <div className={styles.cancelReasonField}>
              <textarea
                className={styles.textarea}
                placeholder="Informe o motivo do cancelamento..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={2}
              />
              <div className={styles.cancelActions}>
                <button
                  type="button"
                  className={styles.btnConfirmCancel}
                  disabled={loadingStatus || !cancellationReason.trim()}
                  onClick={() => executeStatusUpdate('CANCELADO', cancellationReason)}
                >
                  {loadingStatus ? 'Salvando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {/* ─── FOOTER (EXCLUSÃO / FECHAR) ─── */}
          <div className={styles.footer}>
            {!isFinished && !confirmDelete && (
              <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
                🗑 Excluir
              </button>
            )}

            {confirmDelete && (
              <div className={styles.confirmDeleteRow}>
                <span>Excluir?</span>
                <button
                  type="button"
                  className={styles.confirmYes}
                  onClick={handleDelete}
                  disabled={loadingDelete}
                >
                  {loadingDelete ? '...' : 'Sim'}
                </button>
                <button
                  type="button"
                  className={styles.confirmNo}
                  onClick={() => setConfirmDelete(false)}
                >
                  Não
                </button>
              </div>
            )}

            <button type="button" className={styles.closeFooterBtn} onClick={handleClose}>
              Fechar
            </button>
          </div>

        </div>
      </div>

      {/* ─── MODAL DE PAGAMENTO / CONVÊNIO AO FINALIZAR ─── */}
      <FinalizarAtendimentoModal
        isOpen={isFinalizarModalOpen}
        appointment={appointment as any}
        onClose={() => setIsFinalizarModalOpen(false)}
        onSuccess={() => {
          setIsFinalizarModalOpen(false)
          onSuccess()
          handleClose()
        }}
      />
    </>
  )
}