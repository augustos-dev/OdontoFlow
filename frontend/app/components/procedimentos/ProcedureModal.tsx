'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb, Stethoscope, Clock, Tag, DollarSign, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import styles from './modal.module.css'

interface ProcedureModalProps {
  isOpen: boolean
  onClose: () => void
  procedure?: any | null
  onSuccess: () => void
  primaryColor?: string
  accentColor?: string
}

const CATEGORIES = [
  'Dentística / Estética',
  'Endodontia',
  'Cirurgia / Traumatologia',
  'Periodontia',
  'Ortodontia',
  'Prótese Odontológica',
  'Implantodontia',
  'Odontopediatria',
  'Prevenção & Profilaxia',
  'Harmonização Orofacial',
  'Outros',
]

function parsePrice(raw: string): number {
  const str = String(raw || '').trim()
  if (!str) return 0
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }
  return parseFloat(str)
}

export default function ProcedureModal({
  isOpen,
  onClose,
  procedure,
  onSuccess,
  primaryColor = '#06b6d4',
  accentColor = '#0891b2'
}: ProcedureModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [durationMin, setDurationMin] = useState('30')
  const [category, setCategory] = useState('Dentística / Estética')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (procedure) {
      setName(procedure.name || '')
      setCode(procedure.code || '')
      setBasePrice(
        procedure.basePrice !== undefined && procedure.basePrice !== null
          ? String(procedure.basePrice)
          : ''
      )
      setDurationMin(procedure.durationMin ? String(procedure.durationMin) : '30')
      setCategory(procedure.category || 'Dentística / Estética')
    } else {
      setName('')
      setCode('')
      setBasePrice('')
      setDurationMin('30')
      setCategory('Dentística / Estética')
    }
  }, [procedure, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsed = parsePrice(basePrice)
    if (isNaN(parsed) || parsed <= 0) {
      alert('Informe um preço de venda válido maior que zero.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        basePrice: parsed,
        durationMin: Number(durationMin),
        category,
      }

      if (procedure?.id) {
        await api.put(`/procedures/${procedure.id}`, payload)
      } else {
        await api.post('/procedures', payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar procedimento:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Erro ao salvar o procedimento no servidor.'
      alert(errorMsg)
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
      <div className={`${styles.container} ${styles.containerSm}`}>
        {/* Header com ícone de especialidade */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIconWrapper}>
              <Stethoscope size={18} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.title}>
                {procedure ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h2>
              <p className={styles.subtitle}>
                Configure os parâmetros clínicos, comerciais e tempo de agenda
              </p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* Nome */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome do Procedimento *</label>
              <input
                type="text"
                required
                placeholder="Ex: Restauração Resina Composta 2 Faces"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>

            {/* Categoria */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Categoria / Especialidade</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Código + Preço */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Código do Procedimento</label>
                <div className={styles.inputWrapper}>
                  <Tag size={14} className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="PROC-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preço de Venda (R$) *</label>
                <div className={styles.inputWrapper}>
                  <DollarSign size={14} className={styles.inputIcon} />
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ex: 150,00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className={styles.inputWithIcon}
                  />
                </div>
              </div>
            </div>

            {/* Duração Estimada */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Clock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                Duração Estimada na Agenda
              </label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className={styles.select}
              >
                <option value="15">15 minutos (Rápido / Ajuste)</option>
                <option value="30">30 minutos (Padrão de Consulta)</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos (1 hora)</option>
                <option value="90">90 minutos (1h 30m)</option>
                <option value="120">120 minutos (2 horas - Cirurgias)</option>
              </select>
            </div>

            {/* Guia Informativo de Ficha Técnica */}
            <div className={styles.alertBox}>
              <Lightbulb size={16} className={styles.alertIcon} />
              <div className={styles.alertText}>
                Após cadastrar, configure a <strong>Ficha Técnica</strong> para atrelar anestésicos, resinas e brocas. O sistema fará a <strong>baixa automática do estoque</strong> e o cálculo da sua <strong>margem de lucro real</strong>.
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? (
                <>
                  <Loader2 size={15} className={styles.spinner} />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{procedure ? 'Atualizar Procedimento' : 'Salvar Procedimento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}