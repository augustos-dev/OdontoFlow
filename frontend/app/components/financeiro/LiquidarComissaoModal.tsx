'use client'

import { useState } from 'react'
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import api from '@/lib/api'
import styles from './LiquidarComissaoModal.module.css'

export interface CommissionItem {
  id: string
  dentistName: string
  procedureName: string
  patientName: string
  amount: number
  percentage: number
  generatedAt: string
}

interface Props {
  open: boolean
  commission: CommissionItem | null
  onClose: () => void
  onSuccess: () => void
}

export default function LiquidarComissaoModal({ open, commission, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'TRANSFERENCIA' | 'DINHEIRO'>('PIX')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  if (!open || !commission) return null

  function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!commission) return

    setLoading(true)
    setError('')

    try {
      await api.patch(`/commissions/${commission.id}/pay`, {
        paymentMethod,
        paymentDate,
        notes: notes || undefined,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao liquidar comissão:', err)
      setError(err.response?.data?.message || 'Erro ao processar a liquidação da comissão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.iconWrap}>
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className={styles.title}>Liquidar Comissão</h3>
              <p className={styles.subtitle}>Confirmação de repasse financeiro ao profissional</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirmPayment} className={styles.form}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Profissional:</span>
              <span className={styles.summaryValue}>{commission.dentistName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Procedimento:</span>
              <span className={styles.summaryValue}>{commission.procedureName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Paciente:</span>
              <span className={styles.summaryValue}>{commission.patientName}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.totalRow}>
              <span>Valor da Comissão ({commission.percentage}%):</span>
              <strong className={styles.totalAmount}>{formatCurrency(commission.amount)}</strong>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>
                <Calendar size={13} />
                <span>Data do Pagamento</span>
              </label>
              <input
                type="date"
                required
                className={styles.input}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <CreditCard size={13} />
                <span>Forma de Repasse</span>
              </label>
              <select
                className={styles.select}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="PIX">PIX</option>
                <option value="TRANSFERENCIA">Transferência / TED</option>
                <option value="DINHEIRO">Espécie / Dinheiro</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Observação do Repasse (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Comprovante enviado via WhatsApp, lote ref. quinzena..."
              className={styles.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.confirmBtn} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Liquidando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar Liquidação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}