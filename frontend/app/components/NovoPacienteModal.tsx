// app/components/NovoPacienteModal.tsx
'use client'

import { useState } from 'react'
import api from '@/lib/api'
import styles from './NovoPacienteModal.module.css'  // ← adicione essa linha

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NovoPacienteModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'dados' | 'clinico'>('dados')

  const [form, setForm] = useState({
    // Dados básicos
    name: '',
    phone: '',
    email: '',
    cpf: '',
    birthDate: '',
    gender: 'NAO_INFORMADO',
    address: '',
    // Convênio
    insuranceName: '',
    insuranceNumber: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Nome é obrigatório.'); setTab('dados'); return }
    if (!form.phone.trim()) { setError('Telefone é obrigatório.'); setTab('dados'); return }

    setLoading(true)
    try {
      await api.post('/patients', {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        cpf: form.cpf || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender,
        address: form.address || undefined,
        insuranceName: form.insuranceName || undefined,
        insuranceNumber: form.insuranceNumber || undefined,
      })
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao cadastrar paciente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({
      name: '', phone: '', email: '', cpf: '', birthDate: '',
      gender: 'NAO_INFORMADO', address: '', insuranceName: '', insuranceNumber: '',
    })
    setError('')
    setTab('dados')
    onClose()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>

        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Novo Paciente</h2>
            <p className={styles.modalSub}>Preencha os dados para cadastrar</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* ─── Tabs ─── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'dados' ? styles.tabActive : ''}`}
            onClick={() => setTab('dados')}
          >
            👤 Dados Pessoais
          </button>
          <button
            className={`${styles.tab} ${tab === 'clinico' ? styles.tabActive : ''}`}
            onClick={() => setTab('clinico')}
          >
            🏥 Convênio
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ─── Dados Pessoais ─── */}
          {tab === 'dados' && (
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Nome completo <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  placeholder="Ex: Maria da Silva"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Telefone <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    placeholder="(11) 99999-0000"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>CPF</label>
                  <input
                    className={styles.input}
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => set('cpf', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>E-mail</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Data de nascimento</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.birthDate}
                    onChange={(e) => set('birthDate', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Gênero</label>
                  <select className={styles.select} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="NAO_INFORMADO">Não informado</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Endereço</label>
                <input
                  className={styles.input}
                  placeholder="Rua, número, bairro, cidade"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ─── Convênio ─── */}
          {tab === 'clinico' && (
            <div className={styles.fields}>
              <div className={styles.infoBox}>
                ℹ️ Dados de convênio são opcionais. O prontuário clínico completo será criado automaticamente após o cadastro.
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nome do convênio</label>
                <input
                  className={styles.input}
                  placeholder="Ex: Unimed, Bradesco Saúde..."
                  value={form.insuranceName}
                  onChange={(e) => set('insuranceName', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Número da carteirinha</label>
                <input
                  className={styles.input}
                  placeholder="Ex: 0012345678"
                  value={form.insuranceNumber}
                  onChange={(e) => set('insuranceNumber', e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Cancelar
            </button>
            {tab === 'dados' ? (
              <button type="button" className={styles.nextBtn} onClick={() => setTab('clinico')}>
                Próximo →
              </button>
            ) : (
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Cadastrando...' : '+ Cadastrar Paciente'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}