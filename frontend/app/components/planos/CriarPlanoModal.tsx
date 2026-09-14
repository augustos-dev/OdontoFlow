'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Loader2, 
  User, 
  Stethoscope, 
  DollarSign,
  AlertCircle
} from 'lucide-react'
import api from '@/lib/api'
import styles from './criarPlanoModal.module.css'


interface CriarPlanoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  primaryColor?: string
  accentColor?: string
}

interface Patient {
  id: string
  name: string
  phone?: string
}

interface Dentist {
  id: string
  name: string
}

interface ProcedureItem {
  id: string
  name: string
  basePrice: number
}

interface PlanProcedureRow {
  procedureId: string
  quantity: number
  unitPrice: number
}

export function CriarPlanoModal({
  isOpen,
  onClose,
  onSuccess,
  primaryColor = '#06b6d4',
  accentColor = '#0891b2'
}: CriarPlanoModalProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [proceduresCatalog, setProceduresCatalog] = useState<ProcedureItem[]>([])

  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [title, setTitle] = useState('Plano de Tratamento Odontológico')
  const [selectedDentistId, setSelectedDentistId] = useState('')
  const [notes, setNotes] = useState('')

  // Linhas dinâmicas de procedimentos
  const [rows, setRows] = useState<PlanProcedureRow[]>([
    { procedureId: '', quantity: 1, unitPrice: 0 }
  ])

  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  useEffect(() => {
    async function loadSelectData() {
      if (!isOpen) return
      try {
        setLoadingInitial(true)
        const [patientsRes, usersRes, proceduresRes] = await Promise.allSettled([
          api.get('/patients?limit=200'),
          api.get('/users?role=DENTIST'),
          api.get('/procedures?limit=200'),
        ])

        if (patientsRes.status === 'fulfilled') {
          const pData = patientsRes.value.data
          setPatients(pData.data || pData || [])
        }

        if (usersRes.status === 'fulfilled') {
          const uData = usersRes.value.data
          const dList = uData.data || uData || []
          setDentists(dList)
          if (dList.length > 0) {
            setSelectedDentistId(dList[0].id)
          }
        }

        if (proceduresRes.status === 'fulfilled') {
          const prData = proceduresRes.value.data
          setProceduresCatalog(prData.data || prData || [])
        }
      } catch (err) {
        console.error('Erro ao carregar dados do modal de orçamento:', err)
      } finally {
        setLoadingInitial(false)
      }
    }

    loadSelectData()
  }, [isOpen])

  // Adicionar nova linha de procedimento
  function handleAddRow() {
    setRows(prev => [...prev, { procedureId: '', quantity: 1, unitPrice: 0 }])
  }

  // Remover linha
  function handleRemoveRow(index: number) {
    if (rows.length === 1) {
      setRows([{ procedureId: '', quantity: 1, unitPrice: 0 }])
      return
    }
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  // Atualizar campo de linha
  function handleRowChange(index: number, field: keyof PlanProcedureRow, val: any) {
    setRows(prev => {
      const copy = [...prev]
      const current = { ...copy[index] }

      if (field === 'procedureId') {
        current.procedureId = val
        const matched = proceduresCatalog.find(p => p.id === val)
        if (matched) {
          current.unitPrice = Number(matched.basePrice || 0)
        }
      } else if (field === 'quantity') {
        current.quantity = Math.max(Number(val) || 1, 1)
      } else if (field === 'unitPrice') {
        const parsed = parseFloat(String(val).replace(',', '.'))
        current.unitPrice = isNaN(parsed) ? 0 : parsed
      }

      copy[index] = current
      return copy
    })
  }

  // Soma Total
  const totalPlanAmount = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.quantity * (r.unitPrice || 0)), 0)
  }, [rows])

  function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedPatientId) {
      alert('Selecione o paciente.')
      return
    }

    if (totalPlanAmount <= 0) {
      alert('Selecione ao menos um procedimento com valor válido.')
      return
    }

    setSaving(true)
    try {
      const itemsPayload = rows
        .filter(r => r.procedureId)
        .map(r => ({
          procedureId: r.procedureId,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice)
        }))

      await api.post('/treatment-plans', {
        patientId: selectedPatientId,
        dentistId: selectedDentistId || undefined,
        title: title.trim() || 'Plano de Tratamento Odontológico',
        notes: notes.trim() || undefined,
        totalAmount: totalPlanAmount,
        status: 'ORCAMENTO',
        items: itemsPayload.length > 0 ? itemsPayload : undefined
      })

      onSuccess()
    } catch (err: any) {
      console.error('Erro ao gerar plano/orçamento:', err)
      alert(err.response?.data?.message || 'Erro ao gerar orçamento no servidor.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={styles.overlay}
      style={{
        '--brand-primary': primaryColor,
        '--brand-accent': accentColor,
      } as React.CSSProperties}
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIconWrapper}>
              <FileText size={18} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>Novo Orçamento / Plano de Tratamento</h2>
              <p className={styles.subtitle}>Estruture os procedimentos clínicos e gere a proposta comercial</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* Paciente */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Paciente *</label>
              <div className={styles.inputWrapper}>
                <User size={14} className={styles.inputIcon} />
                <select 
                  value={selectedPatientId} 
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className={styles.selectWithIcon}
                  required
                >
                  <option value="">Selecione o paciente cadastrado...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Título e Dentista */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Título do Orçamento *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Reabilitação Oral com Resinas" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Dentista Responsável</label>
                <div className={styles.inputWrapper}>
                  <Stethoscope size={14} className={styles.inputIcon} />
                  <select 
                    value={selectedDentistId} 
                    onChange={(e) => setSelectedDentistId(e.target.value)}
                    className={styles.selectWithIcon}
                  >
                    <option value="">Nenhum vinculado</option>
                    {dentists.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco de Procedimentos */}
            <div className={styles.proceduresBox}>
              <div className={styles.proceduresBoxHeader}>
                <span className={styles.boxTitle}>Procedimentos do Orçamento</span>
                <button 
                  type="button" 
                  onClick={handleAddRow} 
                  className={styles.btnAddRow}
                >
                  <Plus size={13} />
                  <span>Adicionar Procedimento</span>
                </button>
              </div>

              <div className={styles.proceduresList}>
                {rows.map((row, idx) => (
                  <div key={idx} className={styles.procedureRow}>
                    <div className={styles.colProcedure}>
                      <label className={styles.miniLabel}>Procedimento</label>
                      <select 
                        value={row.procedureId}
                        onChange={(e) => handleRowChange(idx, 'procedureId', e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Selecione o procedimento...</option>
                        {proceduresCatalog.map(pr => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name} (R$ {Number(pr.basePrice || 0).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.colQty}>
                      <label className={styles.miniLabel}>Qtd</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={row.quantity}
                        onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                        className={styles.inputSmall}
                      />
                    </div>

                    <div className={styles.colPrice}>
                      <label className={styles.miniLabel}>Preço Unit. (R$)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={row.unitPrice}
                        onChange={(e) => handleRowChange(idx, 'unitPrice', e.target.value)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.colDelete}>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRow(idx)}
                        className={styles.btnRowDelete}
                        title="Remover linha"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações / Condições */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Observações Clínicas / Condições de Pagamento</label>
              <textarea 
                rows={3}
                placeholder="Ex: Parcelamento em até 6x no cartão de crédito; previsão de início na próxima terça-feira..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
              />
            </div>

            {/* Card de Total */}
            <div className={styles.totalBanner}>
              <div className={styles.totalLeft}>
                <DollarSign size={18} className={styles.totalIcon} />
                <span>Valor Total do Orçamento</span>
              </div>
              <strong className={styles.totalValue}>{formatCurrency(totalPlanAmount)}</strong>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <Loader2 size={15} className={styles.spinner} />
                  <span>Salvando Orçamento...</span>
                </>
              ) : (
                <span>Salvar Orçamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}