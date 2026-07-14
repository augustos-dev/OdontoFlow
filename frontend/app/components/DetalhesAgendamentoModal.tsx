// app/components/DetalhesAgendamentoModal.tsx
'use client'

import { useState } from 'react'
import api from '@/lib/api'
import styles from './DetalhesAgendamentoModal.module.css'

interface Appointment {
  id: string
  dateTime: string
  durationMin: number
  status: string
  type: string
  room: string
  notes?: string
  cancellationReason?: string
  patient: { id: string; name: string; phone: string; email?: string }
  dentist: { id: string; name: string; cro?: string }
  transaction?: { id: string; amount: string; paymentMethod: string } | null
}

interface Props {
  appointment: Appointment | null
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_ATENDIMENTO', label: 'Em Atendimento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'FALTOU', label: 'Faltou' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const STATUS_CLASS: Record<string, string> = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  EM_ATENDIMENTO: 'emAtendimento',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado',
  FALTOU: 'cancelado',
  ESPERA: 'espera',
}

const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDITO: 'Cartão de Crédito',
  DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CONVENIO: 'Convênio',
}

export default function DetalhesAgendamentoModal({ appointment, onClose, onSuccess }: Props) {
  const [newStatus, setNewStatus] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!appointment) return null

  const isFinished = ['FINALIZADO', 'CANCELADO', 'FALTOU'].includes(appointment.status)

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  }

  async function handleStatusChange() {
    if (!appointment) return
    if (!newStatus) { setError('Selecione um status.'); return }
    if (newStatus === 'CANCELADO' && !cancellationReason.trim()) {
      setError('Informe o motivo do cancelamento.')
      return
    }
    setError('')
    setLoadingStatus(true)
    try {
      await api.patch(`/appointments/${appointment.id}/status`, {
        status: newStatus,
        ...(newStatus === 'CANCELADO' && { cancellationReason }),
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao atualizar status.')
    } finally {
      setLoadingStatus(false)
    }
  }

  async function handleDelete() {
     if (!appointment) return
    setLoadingDelete(true)
    try {
      await api.delete(`/appointments/${appointment.id}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao deletar agendamento.')
      setConfirmDelete(false)
    } finally {
      setLoadingDelete(false)
    }
  }

  function handleClose() {
    setNewStatus('')
    setCancellationReason('')
    setError('')
    setConfirmDelete(false)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>

        {/* ─── Header ─── */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Detalhes da Consulta</h2>
            <p className={styles.modalSub}>{formatDateTime(appointment.dateTime)}</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <div className={styles.body}>

          {/* ─── Status atual ─── */}
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[appointment.status] ?? 'agendado']}`}>
              {STATUS_OPTIONS.find(s => s.value === appointment.status)?.label ?? appointment.status}
            </span>
            <span className={styles.roomBadge}>{appointment.room.replace('_', ' ')}</span>
            <span className={styles.typeBadge}>{appointment.type === 'PARTICULAR' ? 'Particular' : 'Convênio'}</span>
            <span className={styles.durationBadge}>⏱ {appointment.durationMin} min</span>
          </div>

          {/* ─── Paciente ─── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Paciente</h3>
            <div className={styles.personCard}>
              <div className={styles.avatar}>{getInitials(appointment.patient.name)}</div>
              <div className={styles.personInfo}>
                <div className={styles.personName}>{appointment.patient.name}</div>
                <div className={styles.personSub}>📱 {appointment.patient.phone}</div>
                {appointment.patient.email && (
                  <div className={styles.personSub}>✉️ {appointment.patient.email}</div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Dentista ─── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Dentista</h3>
            <div className={styles.personCard}>
              <div className={`${styles.avatar} ${styles.avatarDentist}`}>
                {getInitials(appointment.dentist.name)}
              </div>
              <div className={styles.personInfo}>
                <div className={styles.personName}>{appointment.dentist.name}</div>
                {appointment.dentist.cro && (
                  <div className={styles.personSub}>CRO: {appointment.dentist.cro}</div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Observações ─── */}
          {appointment.notes && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Observações</h3>
              <p className={styles.notes}>{appointment.notes}</p>
            </div>
          )}

          {/* ─── Motivo cancelamento ─── */}
          {appointment.cancellationReason && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Motivo do Cancelamento</h3>
              <p className={styles.cancelReason}>{appointment.cancellationReason}</p>
            </div>
          )}

          {/* ─── Transação ─── */}
          {appointment.transaction && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pagamento</h3>
              <div className={styles.transactionCard}>
                <span className={styles.transactionAmount}>
                  {Number(appointment.transaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className={styles.transactionMethod}>
                  {PAYMENT_LABEL[appointment.transaction.paymentMethod] ?? appointment.transaction.paymentMethod}
                </span>
              </div>
            </div>
          )}

          {/* ─── Alterar Status ─── */}
          {!isFinished && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Alterar Status</h3>
              <div className={styles.statusChangeRow}>
                <select
                  className={styles.select}
                  value={newStatus}
                  onChange={(e) => { setNewStatus(e.target.value); setError('') }}
                >
                  <option value="">Selecione o novo status...</option>
                  {STATUS_OPTIONS.filter((s) => s.value !== appointment.status).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  className={styles.updateBtn}
                  onClick={handleStatusChange}
                  disabled={loadingStatus || !newStatus}
                >
                  {loadingStatus ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              {newStatus === 'CANCELADO' && (
                <textarea
                  className={styles.textarea}
                  placeholder="Informe o motivo do cancelamento..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={2}
                />
              )}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* ─── Footer ─── */}
        <div className={styles.footer}>
          {!isFinished && !confirmDelete && (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              🗑 Excluir
            </button>
          )}
          {confirmDelete && (
            <div className={styles.confirmDelete}>
              <span>Confirmar exclusão?</span>
              <button className={styles.confirmYes} onClick={handleDelete} disabled={loadingDelete}>
                {loadingDelete ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button className={styles.confirmNo} onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </div>
          )}
          <button className={styles.closeFooterBtn} onClick={handleClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}