'use client'

import React, { useState } from 'react'
import {
  X,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  Layers
} from 'lucide-react'
import api from '@/lib/api'
import styles from './liquidacao.module.css'

export interface CommissionItem {
  id: string
  dentistId: string
  dentistName?: string
  treatmentPlanTitle?: string
  procedureName?: string
  grossAmount: number
  materialsCost: number
  netBaseAmount: number
  percentage: number
  commissionAmount: number
  status: 'PENDING' | 'PAID' | 'CANCELED'
  createdAt?: string
}

interface ModalLiquidacaoProps {
  isOpen: boolean
  commission?: CommissionItem | null
  commissionsList?: CommissionItem[]
  batchDentistName?: string
  primaryColor?: string
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'Pix Instantâneo' },
  { value: 'TRANSFERENCIA', label: 'Transferência / TED' },
  { value: 'DINHEIRO', label: 'Dinheiro em Espécie' },
  { value: 'CHEQUE', label: 'Cheque Compensado' },
]

export function ModalLiquidacao({
  isOpen,
  commission,
  commissionsList,
  batchDentistName,
  primaryColor = '#0284c7',
  onClose,
  onSuccess,
}: ModalLiquidacaoProps) {
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')
  const [receiptFileUrl, setReceiptFileUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  // Modo Lote ou Modo Unitário
  const isBatch = Boolean(commissionsList && commissionsList.length > 0)
  const itemsToPay = isBatch ? (commissionsList || []) : (commission ? [commission] : [])

  if (itemsToPay.length === 0) return null

  // Cálculos consolidados
  const totalGross = itemsToPay.reduce((acc, c) => acc + (c.grossAmount || 0), 0)
  const totalMaterials = itemsToPay.reduce((acc, c) => acc + (c.materialsCost || 0), 0)
  const totalNetBase = itemsToPay.reduce((acc, c) => acc + (c.netBaseAmount || 0), 0)
  const totalCommission = itemsToPay.reduce((acc, c) => acc + (c.commissionAmount || 0), 0)
  const targetDentistName = batchDentistName || commission?.dentistName || 'Cirurgião-Dentista'

  function formatCurrency(val: number) {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  async function handleSettlePayment(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        paymentMethod,
        paymentDate: new Date(`${paymentDate}T12:00:00.000Z`).toISOString(),
        notes: notes.trim()
          ? `${notes.trim()}${isBatch ? ` (Liquidação em Lote de ${itemsToPay.length} lançamentos)` : ''}`
          : isBatch ? `Liquidação em lote consolidada (${itemsToPay.length} procedimentos).` : undefined,
        receiptFileUrl: receiptFileUrl.trim() || undefined,
      }

      // Executa as liquidações em paralelo ou em sequência
      await Promise.all(
        itemsToPay.map((item) => api.patch(`/commissions/${item.id}/pay`, payload))
      )

      onSuccess()
      onClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Não foi possível liquidar o(s) repasse(s). Verifique os dados.'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ '--primary-clinic': primaryColor } as React.CSSProperties}
      >
        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className={styles.title}>
                {isBatch ? `Liquidação em Lote (${itemsToPay.length} Itens)` : 'Liquidar Repasse de Comissão'}
              </h2>
              <p className={styles.subtitle}>
                {isBatch
                  ? `Fechamento financeiro agrupado para ${targetDentistName}`
                  : 'Baixa operacional e geração automática de despesa no DRE'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Resumo da Ficha Técnica e Base Consolidada */}
        <div className={styles.financialCard}>
          <div className={styles.dentistRow}>
            <div>
              <span className={styles.metaLabel}>PROFISSIONAL</span>
              <strong className={styles.dentistName}>{targetDentistName}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={styles.metaLabel}>TIPO DE OPERAÇÃO</span>
              <span className={styles.procedureName}>
                {isBatch ? `Balanço Geral • ${itemsToPay.length} procedimentos` : (commission?.procedureName || 'Procedimento')}
              </span>
            </div>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Valor Bruto Total</span>
              <span className={styles.kpiValue}>{formatCurrency(totalGross)}</span>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>
                <TrendingDown size={11} color="#ef4444" /> Custo Insumos
              </span>
              <span className={`${styles.kpiValue} ${styles.dangerText}`}>
                - {formatCurrency(totalMaterials)}
              </span>
            </div>

            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Base Líquida</span>
              <span className={styles.kpiValue}>{formatCurrency(totalNetBase)}</span>
            </div>

            <div className={`${styles.kpiItem} ${styles.highlightKpi}`}>
              <span className={styles.kpiLabel}>
                {isBatch ? 'Total a Transferir' : `Repasse (${commission?.percentage}%)`}
              </span>
              <strong className={styles.payoutValue}>{formatCurrency(totalCommission)}</strong>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSettlePayment} className={styles.form}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <CreditCard size={14} />
                <span>Forma de Pagamento</span>
              </label>
              <select
                className={styles.select}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Calendar size={14} />
                <span>Data do Pagamento</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <UploadCloud size={14} />
              <span>Link do Comprovante Bancário (Opcional)</span>
            </label>
            <input
              type="url"
              className={styles.input}
              placeholder="https://storage.../comprovante-pix.pdf"
              value={receiptFileUrl}
              onChange={(e) => setReceiptFileUrl(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FileText size={14} />
              <span>Observações / Recibo</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={2}
              placeholder={isBatch ? "Ex: Pagamento quinzenal unificado de procedimentos." : "Ex: Quitado via chave Pix celular."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.btnCancel}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className={styles.btnSubmit}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Liquidando {itemsToPay.length} itens...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>
                    {isBatch ? `Confirmar Pagamento (${formatCurrency(totalCommission)})` : 'Confirmar Liquidação'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}