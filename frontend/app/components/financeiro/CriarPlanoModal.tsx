'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  DollarSign
} from 'lucide-react'
import api from '@/lib/api'
import styles from './CriarPlanoModal.module.css'

interface ProcedureOption {
  id: string
  name: string
  basePrice?: number
}

interface UserOption {
  id: string
  name: string
}

interface PatientOption {
  id: string
  name: string
}

interface ProcedureItem {
  procedureId: string
  quantity: number
  actualPrice: number
}

interface CriarPlanoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialPatientId?: string
}

export function CriarPlanoModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatientId,
}: CriarPlanoModalProps) {
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [dentists, setDentists] = useState<UserOption[]>([])
  const [catalogProcedures, setCatalogProcedures] = useState<ProcedureOption[]>([])

  const [patientId, setPatientId] = useState(initialPatientId || '')
  const [dentistId, setDentistId] = useState('')
  const [title, setTitle] = useState('Plano de Tratamento Odontológico')
  const [notes, setNotes] = useState('')
  const [procedures, setProcedures] = useState<ProcedureItem[]>([
    { procedureId: '', quantity: 1, actualPrice: 0 }
  ])

  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId)
  }, [initialPatientId])

  useEffect(() => {
    if (!isOpen) return

    async function loadAuxData() {
      try {
        setLoadingInitial(true)
        const [patientsRes, dentistsRes, procRes] = await Promise.all([
          api.get('/patients?limit=100').catch(() => ({ data: [] })),
          api.get('/users?role=DENTIST').catch(() => ({ data: [] })),
          api.get('/procedures?limit=100').catch(() => ({ data: [] })),
        ])

        const patientList = Array.isArray(patientsRes.data) ? patientsRes.data : patientsRes.data.data || []
        const dentistList = Array.isArray(dentistsRes.data) ? dentistsRes.data : dentistsRes.data.data || []
        const procedureList = Array.isArray(procRes.data) ? procRes.data : procRes.data.data || []

        setPatients(patientList)
        setDentists(dentistList)
        setCatalogProcedures(procedureList)

        if (dentistList.length > 0 && !dentistId) {
          setDentistId(dentistList[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares:', err)
      } finally {
        setLoadingInitial(false)
      }
    }

    loadAuxData()
  }, [isOpen])

  if (!isOpen) return null

  const handleAddProcedureRow = () => {
    setProcedures([...procedures, { procedureId: '', quantity: 1, actualPrice: 0 }])
  }

  const handleRemoveProcedureRow = (index: number) => {
    if (procedures.length === 1) return
    setProcedures(procedures.filter((_, i) => i !== index))
  }

  const handleProcedureChange = (index: number, procedureId: string) => {
    const selected = catalogProcedures.find((p) => p.id === procedureId)
    const updated = [...procedures]
    updated[index].procedureId = procedureId
    if (selected && selected.basePrice !== undefined) {
      updated[index].actualPrice = Number(selected.basePrice)
    }
    setProcedures(updated)
  }

  const handlePriceChange = (index: number, actualPrice: number) => {
    const updated = [...procedures]
    updated[index].actualPrice = actualPrice
    setProcedures(updated)
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...procedures]
    updated[index].quantity = Math.max(1, quantity)
    setProcedures(updated)
  }

  const totalAmount = procedures.reduce((acc, p) => acc + (p.actualPrice * p.quantity), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!patientId) {
      setError('Selecione um paciente para o orçamento.')
      return
    }

    const validProcedures = procedures.filter((p) => Boolean(p.procedureId))
    if (validProcedures.length === 0) {
      setError('Adicione pelo menos um procedimento válido.')
      return
    }

    setLoading(true)
    try {
      await api.post('/treatment-plans', {
        patientId,
        dentistId: dentistId || undefined,
        title,
        totalAmount,
        notes: notes || undefined,
        procedures: validProcedures.map((p) => ({
          procedureId: p.procedureId,
          quantity: Number(p.quantity),
          actualPrice: Number(p.actualPrice),
        })),
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err)
      setError(err.response?.data?.message || 'Erro ao criar plano de tratamento.')
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
            <FileText className={styles.headerIcon} size={20} />
            <h2>Novo Orçamento / Plano de Tratamento</h2>
          </div>
          <button type="button" onClick={onClose} className={styles.btnClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loadingInitial ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando catálogo e pacientes...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Seleção do Paciente */}
            <div className={styles.formGroup}>
              <label>Paciente*</label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={styles.selectField}
              >
                <option value="">Selecione o paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Título e Dentista Responsável */}
            <div className={styles.twoCols}>
              <div className={styles.formGroup}>
                <label>Título do Orçamento*</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dentista Responsável*</label>
                <select
                  required
                  value={dentistId}
                  onChange={(e) => setDentistId(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="">Selecione o profissional...</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seção de Procedimentos */}
            <div className={styles.proceduresSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Procedimentos do Orçamento</span>
                <button
                  type="button"
                  onClick={handleAddProcedureRow}
                  className={styles.btnAddRow}
                >
                  <Plus size={14} />
                  <span>Adicionar Procedimento</span>
                </button>
              </div>

              <div className={styles.proceduresList}>
                {procedures.map((row, index) => (
                  <div key={index} className={styles.procedureRow}>
                    <div className={styles.colProcedure}>
                      <label>Procedimento</label>
                      <select
                        required
                        value={row.procedureId}
                        onChange={(e) => handleProcedureChange(index, e.target.value)}
                        className={styles.selectField}
                      >
                        <option value="">Selecione o procedimento...</option>
                        {catalogProcedures.map((proc) => (
                          <option key={proc.id} value={proc.id}>
                            {proc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.colQty}>
                      <label>Qtd</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                        className={styles.inputField}
                      />
                    </div>

                    <div className={styles.colPrice}>
                      <label>Preço Unit. (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={row.actualPrice}
                        onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                        className={styles.inputField}
                      />
                    </div>

                    <div className={styles.colAction}>
                      <button
                        type="button"
                        onClick={() => handleRemoveProcedureRow(index)}
                        disabled={procedures.length === 1}
                        className={styles.btnRemove}
                        title="Remover procedimento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações / Condições */}
            <div className={styles.formGroup}>
              <label>Observações Clínicas / Condições de Pagamento</label>
              <textarea
                rows={2}
                placeholder="Ex: Parcelado em 3x no cartão de crédito, previsão de início imediato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textareaField}
              />
            </div>

            {/* Banner de Valor Total */}
            <div className={styles.totalBanner}>
              <div className={styles.totalLabelBox}>
                <DollarSign size={18} />
                <span>Valor Total do Orçamento</span>
              </div>
              <span className={styles.totalValue}>
                {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {/* Footer do Formulário */}
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
                className={styles.btnSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Orçamento</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}