// app/components/NovoAgendamentoModal.tsx
'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import styles from './NovoAgendementoModal.module.css'

interface Patient { id: string; name: string; phone: string }
interface User { id: string; name: string; role: string }

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ROOMS = ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4']
const DURATIONS = [30, 45, 60, 90, 120]

export default function NovoAgendamentoModal({ open, onClose, onSuccess }: Props) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<User[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    patientId: '',
    dentistId: '',
    dateTime: '',
    durationMin: 60,
    type: 'PARTICULAR',
    room: 'SALA_1',
    notes: '',
  })

  // Busca pacientes com debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const params = patientSearch ? `?name=${patientSearch}&limit=10` : '?limit=10'
        const { data } = await api.get(`/patients${params}`)
        setPatients(data.data)
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // Busca dentistas
  useEffect(() => {
    if (!open) return
    async function loadDentists() {
      try {
        const { data } = await api.get('/users')
        setDentists(data.filter((u: User) => u.role === 'DENTIST'))
      } catch {}
    }
    loadDentists()
  }, [open])

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.patientId) { setError('Selecione um paciente.'); return }
    if (!form.dentistId) { setError('Selecione um dentista.'); return }
    if (!form.dateTime) { setError('Informe a data e hora.'); return }

    setLoading(true)
    try {
      await api.post('/appointments', {
        ...form,
        dateTime: new Date(form.dateTime).toISOString(),
      })
      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar agendamento.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({ patientId: '', dentistId: '', dateTime: '', durationMin: 60, type: 'PARTICULAR', room: 'SALA_1', notes: '' })
    setPatientSearch('')
    setError('')
    onClose()
  }

  if (!open) return null

  const selectedPatient = patients.find((p) => p.id === form.patientId)

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Novo Agendamento</h2>
            <p className={styles.modalSub}>Preencha os dados para agendar uma consulta</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ─── Paciente ─── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Paciente</h3>
            <div className={styles.field}>
              <label className={styles.label}>Buscar paciente</label>
              <input
                className={styles.input}
                placeholder="Digite o nome do paciente..."
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); set('patientId', '') }}
              />
              {patients.length > 0 && !form.patientId && (
                <div className={styles.dropdown}>
                  {patients.map((p) => (
                    <div
                      key={p.id}
                      className={styles.dropdownItem}
                      onClick={() => { set('patientId', p.id); setPatientSearch(p.name) }}
                    >
                      <div className={styles.dropdownAvatar}>
                        {p.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className={styles.dropdownName}>{p.name}</div>
                        <div className={styles.dropdownSub}>{p.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <div className={styles.selectedPatient}>
                  ✓ {selectedPatient.name} — {selectedPatient.phone}
                </div>
              )}
            </div>
          </div>

          {/* ─── Dentista + Sala ─── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Profissional e Local</h3>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Dentista</label>
                <select className={styles.select} value={form.dentistId} onChange={(e) => set('dentistId', e.target.value)}>
                  <option value="">Selecione...</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Sala</label>
                <select className={styles.select} value={form.room} onChange={(e) => set('room', e.target.value)}>
                  {ROOMS.map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ─── Data + Duração + Tipo ─── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Data e Horário</h3>
            <div className={styles.row3}>
              <div className={styles.field}>
                <label className={styles.label}>Data e hora</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={form.dateTime}
                  onChange={(e) => set('dateTime', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Duração</label>
                <select className={styles.select} value={form.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tipo</label>
                <select className={styles.select} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="PARTICULAR">Particular</option>
                  <option value="CONVENIO">Convênio</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─── Observações ─── */}
          <div className={styles.section}>
            <div className={styles.field}>
              <label className={styles.label}>Observações (opcional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Ex: Paciente com sensibilidade, trazer radiografia..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Agendando...' : '+ Agendar Consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}