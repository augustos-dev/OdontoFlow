'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb } from 'lucide-react'
import api from '@/lib/api'
import styles from './modal.module.css'

interface ProcedureModalProps {
  isOpen: boolean
  onClose: () => void
  procedure?: any | null
  onSuccess: () => void
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
  'Prevencao / Odontopediatria',
  'Outros',
]

export default function ProcedureModal({
  isOpen,
  onClose,
  procedure,
  onSuccess,
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
      setBasePrice(procedure.basePrice !== undefined && procedure.basePrice !== null ? String(procedure.basePrice) : '')
      setDurationMin(procedure.durationMin ? String(procedure.durationMin) : '30')
      setCategory(procedure.category || 'Dentística / Estética')
    } else {
      setName('')
      setCode('')
      setBasePrice('')
      setDurationMin('30')
      setCategory('Dentística / Estética')
    }
  }, [procedure])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedPrice = parseFloat(basePrice.replace(',', '.'))
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Informe um preço de venda válido.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        basePrice: parsedPrice,
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
    <div className={styles.overlay}>
      <div className={`${styles.container} ${styles.containerSm}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {procedure ? 'Editar Procedimento' : 'Novo Procedimento'}
            </h2>
            <p className={styles.subtitle}>
              Configure os detalhes comerciais e de agenda
            </p>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* Nome do Procedimento */}
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

            {/* Categoria / Especialidade */}
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

            {/* Código + Preço de Venda */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Código (Opcional)</label>
                <input
                  type="text"
                  placeholder="PROC-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preço de Venda (R$) *</label>
                <input
                  type="text"
                  required
                  placeholder="150.00"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Duração Estimada */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Duração Estimada na Agenda (minutos)</label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className={styles.select}
              >
                <option value="15">15 min</option>
                <option value="30">30 min (Padrão)</option>
                <option value="45">45 min</option>
                <option value="60">60 min (1 hora)</option>
                <option value="90">90 min (1h 30m)</option>
                <option value="120">120 min (2 horas)</option>
              </select>
            </div>

            {/* Card Guia */}
            <div className={styles.alertBox} style={{ backgroundColor: '#ecfeff', borderColor: '#cff4fc', color: '#0891b2' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Após cadastrar, clique em <strong>"+ Configurar Ficha"</strong> na tabela para associar os insumos do estoque. O OdontoFlow calculará seu custo real e margem de lucro por procedimento automaticamente!
                </span>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={styles.btnPrimary}>
              {saving ? 'Salvando...' : procedure ? 'Atualizar Procedimento' : 'Salvar Procedimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}