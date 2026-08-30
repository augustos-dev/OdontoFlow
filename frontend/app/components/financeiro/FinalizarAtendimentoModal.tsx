'use client'

import React, { useState } from 'react'
import { 
  X, 
  CreditCard, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import api from '@/lib/api'
import styles from './FinalizarAtendimentoModal.module.css'

interface FinalizarAtendimentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  appointment: {
    id: string
    dateTime: string
    type: 'PARTICULAR' | 'CONVENIO'
    patient: {
      id: string
      name: string
      insuranceProvider?: string | null
      insuranceNumber?: string | null
    }
  } | null
}

export function FinalizarAtendimentoModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
}: FinalizarAtendimentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados do Formulário
  const [billingType, setBillingType] = useState<'PARTICULAR' | 'CONVENIO'>(
    appointment?.type || 'PARTICULAR'
  )
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO'>('PIX')
  const [description, setDescription] = useState('')

  // Dados do Convênio (caso não cadastrado previamente)
  const [insuranceProvider, setInsuranceProvider] = useState(
    appointment?.patient.insuranceProvider || ''
  )
  const [insuranceNumber, setInsuranceNumber] = useState(
    appointment?.patient.insuranceNumber || ''
  )
  const [authorizationCode, setAuthorizationCode] = useState('')

  if (!isOpen || !appointment) return null

  const handleFinishAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (billingType === 'PARTICULAR') {
        const parsedAmount = Number(amount.replace(',', '.'))
        if (!parsedAmount || parsedAmount <= 0) {
          throw new Error('Informe um valor válido para o procedimento.')
        }

        // POST /transactions cria a receita e o backend finaliza o agendamento via appointmentId
        await api.post('/transactions', {
          type: 'RECEITA',
          amount: parsedAmount,
          paymentMethod,
          category: 'Consulta / Procedimento',
          description: description || `Atendimento finalizado - ${appointment.patient.name}`,
          appointmentId: appointment.id,
          paidAt: new Date().toISOString(),
        })
      } else {
        // Validação de dados do convênio
        if (!insuranceProvider.trim() || !insuranceNumber.trim()) {
          throw new Error('Preencha o nome do convênio e o número da carteirinha.')
        }

        // 1. Atualiza dados do convênio no cadastro do paciente se necessário
        if (
          !appointment.patient.insuranceProvider ||
          !appointment.patient.insuranceNumber
        ) {
          await api.put(`/patients/${appointment.patient.id}`, {
            insuranceProvider,
            insuranceNumber,
          })
        }

        // 2. Registra a transação com método CONVENIO vinculando a guia/autorização
        const parsedAmount = amount ? Number(amount.replace(',', '.')) : 0

        await api.post('/transactions', {
          type: 'RECEITA',
          amount: parsedAmount,
          paymentMethod: 'CONVENIO',
          category: 'Guia Convênio',
          description: `Convênio ${insuranceProvider} - Carteira: ${insuranceNumber} | Aut: ${authorizationCode || 'N/A'}`,
          appointmentId: appointment.id,
          paidAt: new Date().toISOString(),
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao finalizar atendimento:', err)
      setError(err.response?.data?.message || err.message || 'Erro ao processar finalização.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalCard}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <CheckCircle2 className={styles.headerIcon} size={20} />
            <h2>Finalizar Atendimento & Faturamento</h2>
          </div>
          <button onClick={onClose} className={styles.btnClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.patientBanner}>
          <span className={styles.patientLabel}>Paciente</span>
          <span className={styles.patientName}>{appointment.patient.name}</span>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFinishAppointment} className={styles.form}>
          {/* Seletor do Tipo de Cobrança */}
          <div className={styles.typeSelector}>
            <button
              type="button"
              className={`${styles.typeBtn} ${billingType === 'PARTICULAR' ? styles.typeBtnActive : ''}`}
              onClick={() => setBillingType('PARTICULAR')}
            >
              <DollarSign size={16} />
              <span>Particular</span>
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${billingType === 'CONVENIO' ? styles.typeBtnActive : ''}`}
              onClick={() => setBillingType('CONVENIO')}
            >
              <Building2 size={16} />
              <span>Convênio / Plano</span>
            </button>
          </div>

          {/* ================= COBRANÇA PARTICULAR ================= */}
          {billingType === 'PARTICULAR' && (
            <>
              <div className={styles.formGroup}>
                <label>Valor Total Cobrado (R$)*</label>
                <div className={styles.inputPrefixWrapper}>
                  <span>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Forma de Pagamento*</label>
                <div className={styles.methodsGrid}>
                  {(['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`${styles.methodBtn} ${paymentMethod === method ? styles.methodBtnActive : ''}`}
                    >
                      {method === 'PIX' && 'Pix'}
                      {method === 'CREDITO' && 'Cartão Crédito'}
                      {method === 'DEBITO' && 'Cartão Débito'}
                      {method === 'DINHEIRO' && 'Dinheiro'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Observação / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Consulta clínica + Profilaxia"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            </>
          )}

          {/* ================= GUIA DE CONVÊNIO ================= */}
          {billingType === 'CONVENIO' && (
            <div className={styles.convenioSection}>
              <div className={styles.formGroup}>
                <label>Operadora do Convênio*</label>
                <input
                  type="text"
                  placeholder="Ex: Unimed Odonto, Amil Dental, Bradesco..."
                  required
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Número da Carteirinha / Matrícula*</label>
                <input
                  type="text"
                  placeholder="Ex: 0023.9912.8831-0"
                  required
                  value={insuranceNumber}
                  onChange={(e) => setInsuranceNumber(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Nº Guia / Autorização</label>
                  <input
                    type="text"
                    placeholder="Código autorizador"
                    value={authorizationCode}
                    onChange={(e) => setAuthorizationCode(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Valor de Repasse Previsto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles.btnCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.btnConfirm}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Processando...</span>
                </>
              ) : (
                <span>Confirmar & Encerrar Consulta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}