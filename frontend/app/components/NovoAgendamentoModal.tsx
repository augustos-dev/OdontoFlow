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

interface Slot {
  start: string
  end: string
}

const ROOMS = [
  { id: 'SALA_1', label: 'Cadeira 01 (Sala 1)' },
  { id: 'SALA_2', label: 'Cadeira 02 (Sala 2)' },
  { id: 'SALA_3', label: 'Cadeira 03 (Sala 3)' },
  { id: 'SALA_4', label: 'Cadeira 04 (Sala 4)' },
]

const TAG_OPTIONS = [
  { id: 'AVALIACAO', label: 'Avaliação', color: '#f43f5e' },
  { id: 'CIRURGIA', label: 'Cirurgia', color: '#be123c' },
  { id: 'ENCAIXE', label: 'Encaixe', color: '#eab308' },
  { id: 'LIGAR', label: 'Ligar', color: '#a855f7' },
  { id: 'ORTODONTIA', label: 'Ortodontia', color: '#2563eb' },
  { id: 'PROTESE', label: 'Prótese', color: '#059669' },
]

// HELPER: Gerador dinâmico de slots em intervalos de 15 min
function generateTimeSlots(
  startHourStr: string,
  endHourStr: string,
  stepMinutes: number = 15,
  durationMinutes: number = 30
): Slot[] {
  const slots: Slot[] = []

  const [startH, startM] = startHourStr.split(':').map(Number)
  const [endH, endM] = endHourStr.split(':').map(Number)

  let currentMinutes = startH * 60 + startM
  const limitMinutes = endH * 60 + endM

  while (currentMinutes + durationMinutes <= limitMinutes) {
    const startHStr = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
    const startMStr = (currentMinutes % 60).toString().padStart(2, '0')

    const endMinutes = currentMinutes + durationMinutes
    const endHStr = Math.floor(endMinutes / 60).toString().padStart(2, '0')
    const endMStr = (endMinutes % 60).toString().padStart(2, '0')

    slots.push({
      start: `${startHStr}:${startMStr}`,
      end: `${endHStr}:${endMStr}`,
    })

    currentMinutes += stepMinutes
  }

  return slots
}

export default function NovoAgendamentoModal({ open, onClose, onSuccess }: Props) {
  // Dados remotos
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<User[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados de Interface / UI
  const [tab, setTab] = useState<'CONSULTA' | 'COMPROMISSO' | 'TAREFA'>('CONSULTA')
  const [sendConfirmation, setSendConfirmation] = useState(true)
  const [returnPeriod, setReturnPeriod] = useState('0')
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showSlotPicker, setShowSlotPicker] = useState(false)

  // Estado do Formulário
  const [form, setForm] = useState({
    patientId: '',
    dentistId: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    durationMin: 30, // Padrão ajustado para 30 min
    type: 'PARTICULAR',
    room: 'SALA_1',
    notes: '',
  })

  // 1. Busca pacientes com debounce
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(async () => {
      try {
        const params = patientSearch ? `?name=${patientSearch}&limit=10` : '?limit=10'
        const { data } = await api.get(`/patients${params}`)
        setPatients(data.data)
      } catch (err) {
        console.error('Erro ao buscar pacientes:', err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch, open])

  // 2. Busca dentistas ao abrir o modal
  useEffect(() => {
    if (!open) return

    async function loadDentists() {
      try {
        const response = await api.get('/users')
        const allUsers = response.data.data
        const dentistsOnly = allUsers.filter((u: User) => u.role === 'DENTIST')
        
        setDentists(dentistsOnly)
        if (dentistsOnly.length > 0 && !form.dentistId) {
          set('dentistId', dentistsOnly[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar dentistas no modal:', err)
      }
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
    if (!form.date || !form.time) { setError('Informe a data e o horário.'); return }

    setLoading(true)
    try {
      // Criação segura da data ISO sem desvio de timezone local
      const dateTimeISO = new Date(`${form.date}T${form.time}:00`).toISOString()

      // Junta as observações com a etiqueta selecionada
      const customNotes = form.notes 
        ? `[${selectedTag.label}] ${form.notes}`
        : selectedTag.label

      await api.post('/appointments', {
        patientId: form.patientId,
        dentistId: form.dentistId,
        dateTime: dateTimeISO,
        durationMin: Number(form.durationMin),
        room: form.room,
        notes: customNotes,
        type: form.type || 'PARTICULAR', // Mantém o Enum de tipo aceito pelo Prisma ('PARTICULAR' / 'CONVENIO')
        status: 'AGENDADO',
      })

      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Erro no backend:', err.response?.data)
      setError(err.response?.data?.message ?? 'Erro interno do servidor.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({
      patientId: '',
      dentistId: dentists[0]?.id || '',
      date: new Date().toISOString().slice(0, 10),
      time: '09:00',
      durationMin: 30,
      type: 'PARTICULAR',
      room: 'SALA_1',
      notes: '',
    })
    setPatientSearch('')
    setError('')
    setShowTagDropdown(false)
    setShowSlotPicker(false)
    onClose()
  }

  if (!open) return null

  const selectedPatient = patients.find((p) => p.id === form.patientId)

  // Gerador dinâmico baseado na duração configurada no formulário
  const morningSlots = generateTimeSlots('08:00', '12:00', 15, form.durationMin)
  const afternoonSlots = generateTimeSlots('13:00', '18:00', 15, form.durationMin)

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        {/* ─── ABAS & BOTÃO FECHAR ─── */}
        <div className={styles.headerRow}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'CONSULTA' ? styles.activeTab : ''}`}
              onClick={() => setTab('CONSULTA')}
            >
              Consulta
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'COMPROMISSO' ? styles.activeTab : ''}`}
              onClick={() => setTab('COMPROMISSO')}
            >
              Compromisso
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'TAREFA' ? styles.activeTab : ''}`}
              onClick={() => setTab('TAREFA')}
            >
              Tarefa
            </button>
          </div>
          <button type="button" className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ─── DENTISTA & CADEIRA ─── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Dentista</label>
              <select
                className={styles.select}
                value={form.dentistId}
                onChange={(e) => set('dentistId', e.target.value)}
              >
                <option value="">Selecione...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cadeira</label>
              <select
                className={styles.select}
                value={form.room}
                onChange={(e) => set('room', e.target.value)}
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── PACIENTE ─── */}
          <div className={styles.field}>
            <label className={styles.label}>Paciente</label>
            <div className={styles.patientRow}>
              <div className={styles.searchWrapper}>
                <input
                  className={styles.input}
                  placeholder="Busque por nome, telefone, CPF ou cadastre um novo paciente..."
                  value={selectedPatient ? selectedPatient.name : patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    set('patientId', '')
                  }}
                />
                
                {/* Dropdown de Autocomplete de Pacientes */}
                {patients.length > 0 && !form.patientId && patientSearch && (
                  <div className={styles.dropdown}>
                    {patients.map((p) => (
                      <div
                        key={p.id}
                        className={styles.dropdownItem}
                        onClick={() => {
                          set('patientId', p.id)
                          setPatientSearch(p.name)
                        }}
                      >
                        <div className={styles.dropdownAvatar}>
                          {p.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className={styles.dropdownName}>{p.name}</div>
                          <div className={styles.dropdownSub}>{p.phone}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className={styles.btnRegister}>
                <span>+</span> Cadastrar
              </button>
            </div>

            {selectedPatient && (
              <div className={styles.selectedPatientTag}>
                ✓ {selectedPatient.name} — {selectedPatient.phone}
              </div>
            )}
          </div>

          {/* ─── DATA, HORÁRIO & DURAÇÃO ─── */}
          <div className={styles.rowGridDate}>
            <div className={styles.field}>
              <label className={styles.label}>Data da consulta</label>
              <input
                type="date"
                className={styles.input}
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Horário</label>
              <input
                type="time"
                className={styles.input}
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Duração (min)</label>
              <input
                type="number"
                className={styles.input}
                value={form.durationMin}
                onChange={(e) => set('durationMin', Number(e.target.value))}
                step="15"
                min="15"
              />
            </div>

            <button
              type="button"
              className={styles.btnFindSlot}
              onClick={() => setShowSlotPicker(true)}
            >
              🕒 Encontrar horário
            </button>
          </div>

          {/* ─── OBSERVAÇÕES ─── */}
          <div className={styles.field}>
            <label className={styles.label}>Observações</label>
            <textarea
              className={styles.textarea}
              placeholder="Adicione observações sobre esta consulta..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* ─── MENSAGEM DE CONFIRMAÇÃO & RETORNO ─── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Enviar mensagem de confirmação?</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    name="confirmMsg"
                    checked={sendConfirmation}
                    onChange={() => setSendConfirmation(true)}
                  />
                  Sim
                </label>
                <label>
                  <input
                    type="radio"
                    name="confirmMsg"
                    checked={!sendConfirmation}
                    onChange={() => setSendConfirmation(false)}
                  />
                  Não
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Retornar em</label>
              <select
                className={styles.select}
                value={returnPeriod}
                onChange={(e) => setReturnPeriod(e.target.value)}
              >
                <option value="0">Sem retorno</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="180">6 meses</option>
              </select>
            </div>
          </div>

          {/* ─── ETIQUETA / PROCEDIMENTO ─── */}
          <div className={styles.field}>
            <label className={styles.label}>Etiqueta</label>
            <div className={styles.tagWrapper}>
              <button
                type="button"
                className={styles.tagSelectBtn}
                onClick={() => setShowTagDropdown(!showTagDropdown)}
              >
                <span className={styles.tagDot} style={{ background: selectedTag.color }} />
                <span>{selectedTag.label}</span>
              </button>

              {showTagDropdown && (
                <div className={styles.tagDropdown}>
                  {TAG_OPTIONS.map((tag) => (
                    <div
                      key={tag.id}
                      className={styles.tagOption}
                      onClick={() => {
                        setSelectedTag(tag)
                        setShowTagDropdown(false)
                      }}
                    >
                      <span className={styles.tagDot} style={{ background: tag.color }} />
                      <span>{tag.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {/* ─── AÇÕES DO FOOTER ─── */}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Agendando...' : '✓ Agendar consulta'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── MODAL AUXILIAR: BUSCADOR DE HORÁRIOS VAGOS (PASSO DE 15 MIN) ─── */}
      {showSlotPicker && (
        <div className={styles.subModalOverlay}>
          <div className={styles.subModal}>
            <div className={styles.subHeader}>
              <h3>Horários disponíveis ({form.date})</h3>
              <button type="button" onClick={() => setShowSlotPicker(false)}>✕</button>
            </div>

            <div className={styles.slotsBody}>
              <p className={styles.subTitleSection}>Horários da manhã</p>
              <div className={styles.slotsGrid}>
                {morningSlots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    className={styles.slotBtn}
                    onClick={() => {
                      set('time', slot.start)
                      setShowSlotPicker(false)
                    }}
                  >
                    De {slot.start} às {slot.end}
                  </button>
                ))}
              </div>

              <p className={styles.subTitleSection}>Horários da tarde</p>
              <div className={styles.slotsGrid}>
                {afternoonSlots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    className={styles.slotBtn}
                    onClick={() => {
                      set('time', slot.start)
                      setShowSlotPicker(false)
                    }}
                  >
                    De {slot.start} às {slot.end}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.subFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowSlotPicker(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}