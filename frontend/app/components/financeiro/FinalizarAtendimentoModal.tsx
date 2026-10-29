'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  X, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Stethoscope,
  Receipt,
  Award
} from 'lucide-react'
import api from '@/lib/api'
import styles from './FinalizarAtendimentoModal.module.css'

const CEARA_INSURANCES = [
  { 
    id: 'HAPVIDA', 
    name: 'Hapvida Odonto', 
    discountPercent: 65, 
    dentistSplitPercent: 35, 
    taxAndGlosaPercent: 10 
  },
  { 
    id: 'UNIMED', 
    name: 'Unimed Odonto Ceará', 
    discountPercent: 55, 
    dentistSplitPercent: 40,
    taxAndGlosaPercent: 8
  },
  { 
    id: 'BRADESCO', 
    name: 'Bradesco Dental', 
    discountPercent: 50, 
    dentistSplitPercent: 40,
    taxAndGlosaPercent: 7
  },
  { 
    id: 'AMIL', 
    name: 'Amil Dental', 
    discountPercent: 60, 
    dentistSplitPercent: 35,
    taxAndGlosaPercent: 9
  },
  { 
    id: 'OUTRO', 
    name: 'Outro Convênio / Regional', 
    discountPercent: 55, 
    dentistSplitPercent: 35,
    taxAndGlosaPercent: 8
  }
]

interface ProcedureData {
  id?: string
  name: string
  basePrice?: number
}

export interface FinalizarAtendimentoAppointment {
  id: string
  dateTime: string
  type?: string
  notes?: string
  dentistId?: string
  dentist?: {
    id: string
    name: string
  }
  procedureId?: string
  procedure?: ProcedureData | null
  treatmentPlanId?: string
  patient: {
    id: string
    name: string
    cpf?: string | null
    email?: string | null
    insuranceProvider?: string | null
    insuranceNumber?: string | null
  }
  transaction?: {
    id: string
    amount: string | number
    paymentMethod: string
  } | null
}

interface FinalizarAtendimentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  appointment: FinalizarAtendimentoAppointment | null
}

export function FinalizarAtendimentoModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
}: FinalizarAtendimentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingEvolution, setLoadingEvolution] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tipo de Faturamento
  const [billingType, setBillingType] = useState<'PARTICULAR' | 'CONVENIO'>('PARTICULAR')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO'>('PIX')
  const [description, setDescription] = useState('')

  // Procedimento Dinâmico (do Agendamento ou da Evolução)
  const [activeProcedure, setActiveProcedure] = useState<{ name: string; basePrice: number }>({
    name: '',
    basePrice: 0,
  })

  // Comissão do Dentista
  const [dentistPercentage, setDentistPercentage] = useState<number>(40)
  const [materialsCost, setMaterialsCost] = useState<string>('0,00')

  // Convênio
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>('HAPVIDA')
  const [insuranceNumber, setInsuranceNumber] = useState('')
  const [authorizationCode, setAuthorizationCode] = useState('')

  // NFS-e
  const [emitNfse, setEmitNfse] = useState(false)
  const [patientCpf, setPatientCpf] = useState('')
  const [patientEmail, setPatientEmail] = useState('')

  // Estado que trava o checkout se já tiver transação válida
  const [existingTransaction, setExistingTransaction] = useState<any>(null)

  const activeInsurance = useMemo(() => {
    return CEARA_INSURANCES.find((i) => i.id === selectedInsuranceId) || CEARA_INSURANCES[0]
  }, [selectedInsuranceId])

  useEffect(() => {
    if (!appointment || !isOpen) return

    setError(null)
    setMaterialsCost('0,00')
    setAuthorizationCode('')
    setPatientCpf(appointment.patient?.cpf || '')
    setPatientEmail(appointment.patient?.email || '')
    setEmitNfse(false)
    setInsuranceNumber(appointment.patient?.insuranceNumber || '')

    // 🔒 1. VALIDAÇÃO ESTRITA ANTI-DUPLICIDADE
    // Só considera como faturado se existir um objeto com ID válido preenchido
    const hasDirectTransaction = Boolean(
      appointment.transaction &&
      typeof appointment.transaction === 'object' &&
      appointment.transaction.id
    )

    if (hasDirectTransaction) {
      setExistingTransaction(appointment.transaction)
    } else {
      setExistingTransaction(null)

      // Validação complementar segura buscando detalhes específicos da consulta
      api.get(`/appointments/${appointment.id}`)
        .then((res) => {
          const data = res.data?.data || res.data
          if (data?.transaction?.id || data?.transactionId) {
            setExistingTransaction(data.transaction || { id: data.transactionId })
          } else {
            setExistingTransaction(null)
          }
        })
        .catch(() => {
          setExistingTransaction(null)
        })
    }

    // 2. Determinação de Convênio
    const isConvenio = appointment.type === 'CONVENIO' || !!appointment.patient?.insuranceProvider
    setBillingType(isConvenio ? 'CONVENIO' : 'PARTICULAR')

    const existingProvider = (appointment.patient?.insuranceProvider || '').toUpperCase()
    let initialInsuranceId = 'HAPVIDA'
    if (existingProvider.includes('UNIMED')) initialInsuranceId = 'UNIMED'
    else if (existingProvider.includes('BRADESCO')) initialInsuranceId = 'BRADESCO'
    else if (existingProvider.includes('AMIL')) initialInsuranceId = 'AMIL'
    else if (existingProvider.includes('HAPVIDA')) initialInsuranceId = 'HAPVIDA'
    setSelectedInsuranceId(initialInsuranceId)

    const ins = CEARA_INSURANCES.find((i) => i.id === initialInsuranceId) || CEARA_INSURANCES[0]

    // 3. Resgate Dinâmico do Procedimento (se não constar no agendamento, busca da evolução)[cite: 29]
    async function resolveProcedureAndPrice() {
      let procName = appointment?.procedure?.name || ''
      let procBasePrice = Number(appointment?.procedure?.basePrice || 0)

      if (!procName && appointment?.patient?.id) {
        try {
          setLoadingEvolution(true)
          const res = await api.get(`/medical-records/${appointment.patient.id}/evolutions`).catch(() => null)
          const list = res?.data?.data || res?.data || []

          if (Array.isArray(list) && list.length > 0) {
            // Busca a evolução associada a esta consulta ou a última criada
            const matchEv = list.find((e: any) => e.appointmentId === appointment.id) || list[0]

            if (matchEv?.procedure) {
              procName = matchEv.procedure.name
              procBasePrice = Number(matchEv.procedure.basePrice || matchEv.procedurePrice || 0)
            } else if (matchEv?.notes) {
              procName = matchEv.notes.slice(0, 45)
              procBasePrice = Number(matchEv.amount || 0)
            }
          }
        } catch (evErr) {
          console.error('Falha ao resgatar procedimento da evolução:', evErr)
        } finally {
          setLoadingEvolution(false)
        }
      }

      setActiveProcedure({
        name: procName || 'Procedimento Clínico',
        basePrice: procBasePrice,
      })

      setDescription(procName ? `Procedimento: ${procName}` : 'Consulta / Atendimento Clínico')

      if (procBasePrice > 0) {
        if (isConvenio) {
          const discountFactor = (100 - ins.discountPercent) / 100
          const estimatedConvenioValue = procBasePrice * discountFactor
          setAmount(estimatedConvenioValue.toFixed(2).replace('.', ','))
          setDentistPercentage(ins.dentistSplitPercent)
        } else {
          setAmount(procBasePrice.toFixed(2).replace('.', ','))
          setDentistPercentage(40)
        }
      } else {
        setAmount('')
        setDentistPercentage(isConvenio ? ins.dentistSplitPercent : 40)
      }
    }

    resolveProcedureAndPrice()
  }, [appointment?.id, isOpen])

  const handleToggleBillingType = (type: 'PARTICULAR' | 'CONVENIO') => {
    if (existingTransaction) return
    setBillingType(type)
    const basePrice = activeProcedure.basePrice
    if (basePrice <= 0) return

    if (type === 'PARTICULAR') {
      setAmount(basePrice.toFixed(2).replace('.', ','))
      setDentistPercentage(40)
    } else {
      const discountFactor = (100 - activeInsurance.discountPercent) / 100
      const estimatedConvenioValue = basePrice * discountFactor
      setAmount(estimatedConvenioValue.toFixed(2).replace('.', ','))
      setDentistPercentage(activeInsurance.dentistSplitPercent)
    }
  }

  const handleInsuranceChange = (newInsuranceId: string) => {
    if (existingTransaction) return
    setSelectedInsuranceId(newInsuranceId)
    const ins = CEARA_INSURANCES.find((i) => i.id === newInsuranceId) || CEARA_INSURANCES[0]
    setDentistPercentage(ins.dentistSplitPercent)

    const basePrice = activeProcedure.basePrice
    if (basePrice > 0) {
      const discountFactor = (100 - ins.discountPercent) / 100
      const estimatedConvenioValue = basePrice * discountFactor
      setAmount(estimatedConvenioValue.toFixed(2).replace('.', ','))
    }
  }

  const financialBreakdown = useMemo(() => {
    const rawVal = Number(amount.replace(/\./g, '').replace(',', '.'))
    const grossVal = isNaN(rawVal) ? 0 : rawVal

    const rawMat = Number(materialsCost.replace(/\./g, '').replace(',', '.'))
    const matVal = isNaN(rawMat) ? 0 : rawMat

    if (billingType === 'PARTICULAR') {
      const netBase = Math.max(grossVal - matVal, 0)
      const dentistCut = netBase * (dentistPercentage / 100)
      const clinicNet = grossVal - dentistCut
      return { grossVal, matVal, taxAndGlosa: 0, dentistCut, clinicNet, percentage: dentistPercentage }
    }

    const taxAndGlosa = grossVal * (activeInsurance.taxAndGlosaPercent / 100)
    const netFromInsurance = Math.max(grossVal - taxAndGlosa - matVal, 0)
    const dentistCut = netFromInsurance * (dentistPercentage / 100)
    const clinicNet = grossVal - taxAndGlosa - dentistCut

    return {
      grossVal,
      matVal,
      taxAndGlosa,
      dentistCut,
      clinicNet,
      percentage: dentistPercentage,
    }
  }, [amount, materialsCost, billingType, activeInsurance, dentistPercentage])

  if (!isOpen || !appointment) return null

  const handleFinishAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (existingTransaction) return

    setError(null)
    setLoading(true)

    try {
      const parsedAmount = financialBreakdown.grossVal
      if (billingType === 'PARTICULAR' && parsedAmount <= 0) {
        throw new Error('Indique um valor válido para o procedimento.')
      }

      // 1. Registra a Receita Financeira vinculada à consulta[cite: 30]
      await api.post('/transactions', {
        type: 'RECEITA',
        amount: parsedAmount,
        paymentMethod: billingType === 'PARTICULAR' ? paymentMethod : 'CONVENIO',
        category: 'Procedimento Odontológico',
        description: billingType === 'CONVENIO' 
          ? `Convênio ${activeInsurance.name} • Matrícula: ${insuranceNumber}${authorizationCode ? ` | Guia: ${authorizationCode}` : ''}`
          : description,
        appointmentId: appointment.id,
        patientId: appointment.patient.id,
        dentistId: appointment.dentistId || appointment.dentist?.id,
        paidAt: new Date().toISOString(),
      })

      // 2. Atualização dos dados do Convênio no cadastro do Paciente
      if (billingType === 'CONVENIO') {
        if (!insuranceNumber.trim()) {
          throw new Error('Indique o número da carteirinha ou matrícula do convênio.')
        }

        await api.put(`/patients/${appointment.patient.id}`, {
          insuranceProvider: activeInsurance.name,
          insuranceNumber,
        })
      }

      // 3. Lançamento da Comissão do Dentista Parceiro
      const resolvedDentistId = appointment.dentistId || appointment.dentist?.id
      if (resolvedDentistId && parsedAmount > 0) {
        try {
          await api.post('/commissions', {
            dentistId: resolvedDentistId,
            treatmentPlanId: appointment.treatmentPlanId || undefined,
            procedureId: appointment.procedureId || appointment.procedure?.id || undefined,
            grossAmount: parsedAmount,
            materialsCost: financialBreakdown.matVal,
            percentage: financialBreakdown.percentage,
          })
        } catch (commErr) {
          console.error('Falha ao registrar comissão:', commErr)
        }
      }

      // 4. Emissão Opcional de NFS-e
      if (emitNfse) {
        if (!patientCpf.trim()) {
          throw new Error('Para a emissão da NFS-e é obrigatório preencher o CPF do paciente.')
        }

        await api.post('/nfse/emit', {
          serviceValue: parsedAmount,
          serviceDescription: description || activeProcedure.name || 'Procedimento Odontológico',
          patient: {
            name: appointment.patient.name,
            cpf: patientCpf.replace(/\D/g, ''),
            email: patientEmail.trim() || undefined,
          },
        })
      }

      // 5. Finaliza o status do agendamento[cite: 31]
      await api.patch(`/appointments/${appointment.id}/status`, {
        status: 'FINALIZADO',
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao finalizar checkout:', err)
      setError(err.response?.data?.message || err.message || 'Erro ao processar checkout.')
    } finally {
      setLoading(false)
    }
  }

  const isLocked = Boolean(existingTransaction)

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalCard}>
        {/* Cabeçalho */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <CheckCircle2 className={styles.headerIcon} size={20} />
            <h2>Finalizar Atendimento & Checkout</h2>
          </div>
          <button onClick={onClose} className={styles.btnClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Banner do Paciente & Procedimento Dinâmico[cite: 28, 32] */}
        <div className={styles.patientBanner}>
          <div className={styles.patientInfoCol}>
            <span className={styles.patientLabel}>PACIENTE</span>
            <span className={styles.patientName}>{appointment.patient.name}</span>
          </div>

          <div className={styles.procedureBadge}>
            <Stethoscope size={14} />
            {loadingEvolution ? (
              <span className={styles.loadingProcText}>Consultando evolução...</span>
            ) : (
              <span>
                {activeProcedure.name}
                {activeProcedure.basePrice > 0 && (
                  <span className={styles.procedurePrice}>
                    {' '}• Valor Base: R$ {activeProcedure.basePrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Alerta de Transação Existente (só aparece se já estiver faturado)[cite: 28, 32] */}
        {isLocked && (
          <div className={styles.alreadyPaidBanner}>
            <AlertCircle size={18} className={styles.alreadyPaidIcon} />
            <div className={styles.alreadyPaidText}>
              <strong>Já existe uma transação vinculada a este agendamento.</strong>
              <span>Este atendimento já foi faturado e baixado no sistema financeiro.</span>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFinishAppointment} className={styles.form}>
          {/* Seletor Particular vs Convênio */}
          <div className={styles.typeSelector}>
            <button
              type="button"
              disabled={isLocked}
              className={`${styles.typeBtn} ${billingType === 'PARTICULAR' ? styles.typeBtnActive : ''}`}
              onClick={() => handleToggleBillingType('PARTICULAR')}
            >
              <DollarSign size={16} />
              <span>Particular</span>
            </button>
            <button
              type="button"
              disabled={isLocked}
              className={`${styles.typeBtn} ${billingType === 'CONVENIO' ? styles.typeBtnActive : ''}`}
              onClick={() => handleToggleBillingType('CONVENIO')}
            >
              <Building2 size={16} />
              <span>Convênio / Plano</span>
            </button>
          </div>

          {/* Seção Particular */}
          {billingType === 'PARTICULAR' && (
            <>
              <div className={styles.formGroup}>
                <label>Valor Cobrado (Tabela Particular)*</label>
                <div className={styles.inputPrefixWrapper}>
                  <span>R$</span>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    placeholder="0,00"
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
                      disabled={isLocked}
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`${styles.methodBtn} ${paymentMethod === method ? styles.methodBtnActive : ''}`}
                    >
                      {method === 'PIX' && 'Pix'}
                      {method === 'CREDITO' && 'Crédito'}
                      {method === 'DEBITO' && 'Débito'}
                      {method === 'DINHEIRO' && 'Dinheiro'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Seção Convênio */}
          {billingType === 'CONVENIO' && (
            <div className={styles.convenioSection}>
              <div className={styles.formGroup}>
                <label>Operadora de Saúde Bucal*</label>
                <select
                  disabled={isLocked}
                  value={selectedInsuranceId}
                  onChange={(e) => handleInsuranceChange(e.target.value)}
                  className={styles.inputFieldPlain}
                >
                  {CEARA_INSURANCES.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} (~{ins.discountPercent}% desc. s/ particular)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formGroup}>
                  <label>Nº Carteirinha / Matrícula*</label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    placeholder="00000000000"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    className={styles.inputFieldPlain}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Nº Guia TISS / Autorização</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder="Código autorizador"
                    value={authorizationCode}
                    onChange={(e) => setAuthorizationCode(e.target.value)}
                    className={styles.inputFieldPlain}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Valor Bruto Faturado na Guia (R$)*</label>
                <div className={styles.inputPrefixWrapper}>
                  <span>R$</span>
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seção de Comissão */}
          <div className={styles.commissionBox}>
            <div className={styles.commissionHeader}>
              <span className={styles.commissionTitle}>
                <Award size={14} color="#0284c7" /> Lançamento de Comissão (Dentista Parceiro)
              </span>
              <span className={styles.dentistSub}>
                {appointment.dentist?.name ? `Dr(a). ${appointment.dentist.name}` : 'Profissional Vinculado'}
              </span>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.formGroup}>
                <label>Custo de Insumos / Prótese (R$)</label>
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder="0,00"
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(e.target.value)}
                  className={styles.inputFieldPlain}
                />
              </div>

              <div className={styles.formGroup}>
                <label>% Comissão do Dentista</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={isLocked}
                  value={dentistPercentage}
                  onChange={(e) => setDentistPercentage(Number(e.target.value))}
                  className={styles.inputFieldPlain}
                />
              </div>
            </div>

            <div className={styles.commissionResults}>
              <span className={styles.commToPay}>
                Comissão a Lançar: R$ {financialBreakdown.dentistCut.toFixed(2)}
              </span>
              <span className={styles.clinicNet}>
                Líquido da Clínica: R$ {financialBreakdown.clinicNet.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Descrição do Recibo */}
          <div className={styles.formGroup}>
            <label>Descrição do Recibo / Histórico</label>
            <input
              type="text"
              disabled={isLocked}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.inputFieldPlain}
            />
          </div>

          {/* Emissão de NFS-e */}
          <div className={styles.fiscalSection}>
            <label className={styles.fiscalToggleRow}>
              <input
                type="checkbox"
                disabled={isLocked}
                checked={emitNfse}
                onChange={(e) => setEmitNfse(e.target.checked)}
                className={styles.fiscalCheckbox}
              />
              <div className={styles.fiscalLabelGroup}>
                <span className={styles.fiscalLabelTitle}>
                  <Receipt size={14} color="#059669" />
                  Emitir NFS-e e enviar para o paciente
                </span>
                <span className={styles.fiscalLabelSub}>
                  Gera a nota fiscal eletrônica e envia arquivo PDF por e-mail
                </span>
              </div>
            </label>

            {emitNfse && (
              <div className={styles.fiscalInputsGrid}>
                <div className={styles.formGroup}>
                  <label>CPF do Paciente*</label>
                  <input
                    type="text"
                    required={emitNfse}
                    disabled={isLocked}
                    placeholder="000.000.000-00"
                    value={patientCpf}
                    onChange={(e) => setPatientCpf(e.target.value)}
                    className={styles.inputFieldPlain}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>E-mail de Destino</label>
                  <input
                    type="email"
                    disabled={isLocked}
                    placeholder="paciente@email.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className={styles.inputFieldPlain}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé com Trava de Duplicidade */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles.btnCancel}
            >
              Cancelar
            </button>

            {!isLocked ? (
              <button
                type="submit"
                disabled={loading}
                className={styles.btnConfirm}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>Confirmar & Concluir Checkout</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={styles.btnAlreadyPaid}
              >
                Atendimento já faturado
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}