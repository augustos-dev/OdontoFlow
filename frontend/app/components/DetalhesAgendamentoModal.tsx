'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  Calendar, 
  Clock, 
  UserCheck, 
  Tag, 
  FileText, 
  AlertCircle, 
  CreditCard, 
  Copy, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  SendHorizontal,
  Stethoscope
} from 'lucide-react'
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
  branding?: {
    primaryColor?: string
    accentColor?: string
    clinicName?: string
    clinicAddress?: string
  }
  loggedUserName?: string
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
  branding,
  loggedUserName,
}: Props) {
  const router = useRouter()

  const primaryColor = branding?.primaryColor || '#0284c7'
  const clinicName = branding?.clinicName || 'Clarium Clinic - Messejana'
  const clinicAddress = branding?.clinicAddress || 'Avenida Frei Cirilo, 3748, Messejana'

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

  const dt = new Date(appointment.dateTime)
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const dateFormattedCompact = `${day}/${month}`

  const hours = String(dt.getHours()).padStart(2, '0')
  const minutes = String(dt.getMinutes()).padStart(2, '0')
  const timeFormattedCompact = `${hours}h${minutes}`

  const dateFormattedHeader = dt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const endDt = new Date(dt.getTime() + (appointment.durationMin || 30) * 60000)
  const timeFormattedHeader = `${hours}:${minutes} - ${endDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  const currentStatusObj = STATUS_LIST.find((s) => s.value === appointment.status) || STATUS_LIST[0]

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  function getCleanPhone() {
    if (!appointment?.patient?.phone) return ''
    const clean = appointment.patient.phone.replace(/\D/g, '')
    return clean.startsWith('55') ? clean : `55${clean}`
  }

  function getGreeting() {
    const currentHour = new Date().getHours()
    if (currentHour >= 5 && currentHour < 12) return 'Olá, bom dia!'
    if (currentHour >= 12 && currentHour < 18) return 'Olá, boa tarde!'
    return 'Olá, boa noite!'
  }

  // 1. CONFIRMAÇÃO DE DADOS DA CONSULTA
  function handleSendConfirmation() {
    const fullPhone = getCleanPhone()
    if (!fullPhone) return

    const lines = [
      `Perfeito! Sua consulta ficou agendada na *${clinicName}*:`,
      '',
      `*Data:* ${dateFormattedCompact}`,
      `*Horário:* ${timeFormattedCompact}`,
      `*Local:* ${clinicAddress}`,
      '',
      `*Nosso atendimento é por ordem de chegada, porém dentro do seu horário agendado.*`,
      '',
      `Se precisar reagendar, é só me avisar por aqui.`
    ]

    const textEncoded = lines.map((l) => encodeURIComponent(l)).join('%0A')
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${textEncoded}`, '_blank')
  }

 // 2. LEMBRETE DE CONSULTA
  function handleSendReminder() {
    const fullPhone = getCleanPhone()
    if (!fullPhone) return

    // Pega o primeiro nome limpo
    const rawName = loggedUserName?.trim()
    const firstName = rawName ? rawName.split(' ')[0] : ''
    const greeting = getGreeting()

    // Se tem o nome: "Me chamo Vicente e falo em nome da..."
    // Se não pegou por delay de rede: "falo da equipe da..."
    const introduction = firstName 
      ? `Me chamo ${firstName} e falo em nome da *${clinicName}*.`
      : `falo da recepção da *${clinicName}*.`

    const lines = [
      `${greeting} ${introduction}`,
      '',
      `Sobre a sua consulta agendada conosco amanhã às *${timeFormattedCompact}*, podemos confirmar a sua presença?`
    ]

    const textEncoded = lines.map((l) => encodeURIComponent(l)).join('%0A')
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${textEncoded}`, '_blank')
  }
  function handleOpenPatientRecord() {
    if (!appointment?.patient?.id) return
    onClose()
    router.push(`/pacientes/${appointment.patient.id}?tab=prontuario`)
  }

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
      <div 
        className={styles.overlay} 
        onClick={(e) => e.target === e.currentTarget && handleClose()}
        style={{ '--brand-primary': primaryColor } as React.CSSProperties}
      >
        <div className={styles.popoverCard}>
          
          {/* ─── HEADER ─── */}
          <div className={styles.header}>
            <div 
              className={styles.avatar}
              style={{ background: `${primaryColor}20`, color: primaryColor }}
            >
              {getInitials(appointment.patient.name)}
            </div>
            <div className={styles.headerInfo}>
              <h3
                className={styles.patientNameClickable}
                onClick={handleOpenPatientRecord}
                title="Abrir cadastro do paciente"
              >
                {appointment.patient.name}
              </h3>
              <div className={styles.phoneRow}>
                <span>{appointment.patient.phone || 'Sem telefone'}</span>
              </div>
              {appointment.patient.email && (
                <div className={styles.emailSub}>{appointment.patient.email}</div>
              )}
            </div>
            <button type="button" className={styles.closeBtn} onClick={handleClose}>
              <X size={16} />
            </button>
          </div>

          {/* ─── DISPAROS DE WHATSAPP ─── */}
          {appointment.patient?.phone && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                type="button" 
                onClick={handleSendReminder}
                title="Enviar lembrete amigável assinado pelo atendente"
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Bell size={13} />
                <span>Lembrar</span>
              </button>

              <button 
                type="button" 
                onClick={handleSendConfirmation}
                title="Enviar confirmação completa de agendamento"
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0284c7',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <SendHorizontal size={13} />
                <span>Confirmar</span>
              </button>
            </div>
          )}

          {/* ─── ATALHOS RÁPIDOS ─── */}
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

          {/* ─── FINALIZAR & COBRAR ─── */}
          <div className={styles.primaryActionRow}>
            {!isFinished && (
              <button
                type="button"
                className={styles.btnFinishAction}
                onClick={() => setIsFinalizarModalOpen(true)}
              >
                <CreditCard size={15} />
                <span>Finalizar & Cobrar</span>
              </button>
            )}
            <button
              type="button"
              className={styles.btnIconCopy}
              title="Copiar dados da consulta"
              onClick={() =>
                navigator.clipboard.writeText(
                  `${appointment.patient.name} - ${dateFormattedHeader} às ${timeFormattedHeader}`
                )
              }
            >
              <Copy size={15} />
            </button>
          </div>

          {/* ─── DETALHES ─── */}
          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <UserCheck size={15} className={styles.icon} />
              <span>
                <strong>{appointment.dentist.name}</strong> • {appointment.room?.replace('_', ' ') ?? '—'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <Calendar size={15} className={styles.icon} />
              <span>{dateFormattedHeader}</span>
              <Clock size={15} className={styles.iconTime} />
              <span>{timeFormattedHeader}</span>
            </div>

            <div className={styles.detailItem}>
              <Tag size={15} className={styles.icon} />
              <span>
                {appointment.type === 'PARTICULAR' ? 'Particular' : 'Convênio'} ({appointment.durationMin} min)
              </span>
            </div>

            {appointment.procedure && (
              <div 
                className={styles.procedureBadgeBox}
                style={{ background: `${primaryColor}15`, color: primaryColor }}
              >
                <Stethoscope size={14} className={styles.icon} />
                <span>
                  <strong>Procedimento:</strong> {appointment.procedure.name}
                </span>
              </div>
            )}

            {appointment.notes && (
              <div className={styles.notesBox} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <FileText size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                <span><strong>Observações:</strong> {appointment.notes}</span>
              </div>
            )}

            {appointment.cancellationReason && (
              <div className={styles.cancelReasonBox} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
                <span><strong>Motivo do Cancelamento:</strong> {appointment.cancellationReason}</span>
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

          {/* ─── STATUS ─── */}
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
                {showStatusDropdown ? <ChevronUp size={14} className={styles.arrow} /> : <ChevronDown size={14} className={styles.arrow} />}
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
                      {st.value === appointment.status && <Check size={14} className={styles.check} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CANCELAMENTO ─── */}
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

          {/* ─── FOOTER ─── */}
          <div className={styles.footer}>
            {!isFinished && !confirmDelete && (
              <button 
                type="button" 
                className={styles.deleteBtn} 
                onClick={() => setConfirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={13} />
                <span>Excluir</span>
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