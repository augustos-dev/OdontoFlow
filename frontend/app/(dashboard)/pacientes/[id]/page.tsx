// app/(dashboard)/pacientes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import styles from './perfil.module.css'

// Import de Componentes
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'
import { EvolutionsTimeline } from '../../../components/medical-record/EvolutionsTimeline'
import { AddEvolutionModal } from '../../../components/medical-record/AddEvolutionModal'

// Import de Tipos Globais
import { Patient, MedicalRecord } from '../../../../types/patient.types'
import { Appointment } from '../../../../types/appointment.types'

const GENDER_LABEL: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  OUTRO: 'Outro',
  NAO_INFORMADO: 'Não informado',
}

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ATENDIMENTO: 'Em Atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  FALTOU: 'Faltou',
  ESPERA: 'Espera',
}

const STATUS_CLASS: Record<string, string> = {
  AGENDADO: styles.agendado,
  CONFIRMADO: styles.confirmado,
  EM_ATENDIMENTO: styles.emAtendimento,
  FINALIZADO: styles.finalizado,
  CANCELADO: styles.cancelado,
  FALTOU: styles.cancelado,
  ESPERA: styles.espera,
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  APROVADO: 'Aprovado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  RECUSADO: 'Recusado',
}

export default function PerfilPacientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'prontuario' | 'evolucoes' | 'agenda' | 'planos'>('info')
  
  // Modais & Timeline State
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [isAddEvolutionOpen, setIsAddEvolutionOpen] = useState(false)
  const [reloadEvolutionsTrigger, setReloadEvolutionsTrigger] = useState(0)

  // Estados de Edição do Prontuário Base
  const [isEditingMR, setIsEditingMR] = useState(false)
  const [savingMR, setSavingMR] = useState(false)
  const [mrForm, setMrForm] = useState({
    chiefComplaint: '',
    historyNotes: '',
    allergies: '',
    medications: '',
    bloodType: '',
    habits: '',
    systemicDiseases: '',
  })

  async function load() {
    try {
      const { data } = await api.get(`/patients/${id}`)
      setPatient(data)
      if (data.medicalRecord) {
        setMrForm({
          chiefComplaint: data.medicalRecord.chiefComplaint ?? '',
          historyNotes: data.medicalRecord.historyNotes ?? '',
          allergies: data.medicalRecord.allergies ?? '',
          medications: data.medicalRecord.medications ?? '',
          bloodType: data.medicalRecord.bloodType ?? '',
          habits: data.medicalRecord.habits ?? '',
          systemicDiseases: data.medicalRecord.systemicDiseases ?? '',
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // Lógica para alternar seleção de tags no formulário
  function toggleTag(field: keyof typeof mrForm, tag: string) {
    setMrForm((prev) => {
      const currentValue = prev[field] || ''
      
      if (currentValue.includes(tag)) {
        const updated = currentValue
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== tag)
          .join(', ')
        return { ...prev, [field]: updated }
      } 
      
      const updated = currentValue ? `${currentValue}, ${tag}` : tag
      return { ...prev, [field]: updated }
    })
  }

  async function handleSaveMedicalRecord(e: React.FormEvent) {
  e.preventDefault()

  setSavingMR(true)
  try {
    // A rota correta do backend vincula diretamente o ID do paciente
    await api.patch(`/patients/${id}/medical-record`, mrForm)

    await load() // Recarrega os dados atualizados do paciente
    setIsEditingMR(false)
  } catch (err: any) {
    console.error('Erro ao salvar no endpoint do paciente:', err)

    // Fallback utilizando PUT caso a rota no NestJS utilize @Put
    try {
      await api.put(`/patients/${id}/medical-record`, mrForm)
      await load()
      setIsEditingMR(false)
      return
    } catch (putErr) {
      console.error('Erro com PUT:', putErr)
    }

    alert('Erro ao salvar as alterações do prontuário. Verifique os campos.')
  } finally {
    setSavingMR(false)
  }
}

  function formatDate(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR')
  }

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function calcAge(birthDate?: string) {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  // Estilos rápidos para as tags interativas
  const getTagStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '0.78rem',
    border: active ? '1px solid #0284c7' : '1px solid #cbd5e1',
    background: active ? '#e0f2fe' : '#ffffff',
    color: active ? '#0369a1' : '#475569',
    fontWeight: active ? '600' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    outline: 'none',
    marginTop: '6px'
  }

  if (loading) return <div className={styles.loading}>Carregando perfil...</div>
  if (!patient) return <div className={styles.loading}>Paciente não encontrado.</div>

  const age = calcAge(patient.birthDate)
  const mr = patient.medicalRecord

  return (
    <div className={styles.page}>
      {/* ─── Header do perfil ─── */}
      <div className={styles.profileHeader}>
        <button className={styles.backBtn} onClick={() => router.back()}>← Voltar</button>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar}>{getInitials(patient.name)}</div>
          <div>
            <h1 className={styles.profileName}>{patient.name}</h1>
            <div className={styles.profileMeta}>
              {age !== null && <span>🎂 {age} anos</span>}
              {patient.gender !== 'NAO_INFORMADO' && <span>· {GENDER_LABEL[patient.gender]}</span>}
              {patient.cpf && <span>· CPF: {patient.cpf}</span>}
              <span>· Cadastrado em {formatDate(patient.createdAt)}</span>
            </div>
            <div className={styles.profileContacts}>
              <span>📱 {patient.phone}</span>
              {patient.email && <span>✉️ {patient.email}</span>}
              {patient.address && <span>📍 {patient.address}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'info' ? styles.tabActive : ''}`} onClick={() => setTab('info')}>
          👤 Informações
        </button>
        <button className={`${styles.tab} ${tab === 'prontuario' ? styles.tabActive : ''}`} onClick={() => setTab('prontuario')}>
          🩺 Prontuário Base
        </button>
        <button className={`${styles.tab} ${tab === 'evolucoes' ? styles.tabActive : ''}`} onClick={() => setTab('evolucoes')}>
          📝 Evoluções Clínicas
        </button>
        <button className={`${styles.tab} ${tab === 'agenda' ? styles.tabActive : ''}`} onClick={() => setTab('agenda')}>
          📅 Agendamentos ({patient.appointments.length})
        </button>
        <button className={`${styles.tab} ${tab === 'planos' ? styles.tabActive : ''}`} onClick={() => setTab('planos')}>
          📋 Planos ({patient.treatmentPlans?.length ?? 0})
        </button>
      </div>

      {/* ─── Informações ─── */}
      {tab === 'info' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Dados Pessoais</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nome completo</span>
              <span className={styles.infoValue}>{patient.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Telefone</span>
              <span className={styles.infoValue}>{patient.phone}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>E-mail</span>
              <span className={styles.infoValue}>{patient.email ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CPF</span>
              <span className={styles.infoValue}>{patient.cpf ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Data de nascimento</span>
              <span className={styles.infoValue}>{patient.birthDate ? `${formatDate(patient.birthDate)} (${age} anos)` : '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Gênero</span>
              <span className={styles.infoValue}>{GENDER_LABEL[patient.gender]}</span>
            </div>
            <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
              <span className={styles.infoLabel}>Endereço</span>
              <span className={styles.infoValue}>{patient.address ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Prontuário Base (Com Suporte a Tags + Edição) ─── */}
      {tab === 'prontuario' && (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Anamnese & Prontuário Base</h3>
            </div>
            {!isEditingMR && mr && (
              <button 
                type="button"
                onClick={() => setIsEditingMR(true)}
                style={{ 
                  background: '#0284c7', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer' 
                }}
              >
                ✏️ Preencher Anamnese
              </button>
            )}
          </div>

          {!mr ? (
            <p className={styles.empty}>Prontuário não encontrado.</p>
          ) : isEditingMR ? (
            /* Formulário com Seleção Rápida */
            <form onSubmit={handleSaveMedicalRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Queixa Principal */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className={styles.infoLabel}>QUEIXA PRINCIPAL</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                  {['Dor de Dente', 'Limpeza / Check-up', 'Estética / Clareamento', 'Aparelho / Ortodontia', 'Prótese / Implante'].map((tag) => {
                    const active = mrForm.chiefComplaint.includes(tag)
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag('chiefComplaint', tag)}
                        style={getTagStyle(active)}
                      >
                        {active ? '✓ ' : '+ '} {tag}
                      </button>
                    )
                  })}
                </div>
                <input 
                  type="text" 
                  placeholder="Observação ou detalhamento..."
                  value={mrForm.chiefComplaint}
                  onChange={(e) => setMrForm({ ...mrForm, chiefComplaint: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Alergias e Doenças Sistêmicas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>ALERGIAS</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                    {['Penicilina', 'Dipirona', 'Anestésicos', 'Látex', 'Nenhuma'].map((tag) => {
                      const active = mrForm.allergies.includes(tag)
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleTag('allergies', tag)}
                          style={getTagStyle(active)}
                        >
                          {active ? '✓ ' : '+ '} {tag}
                        </button>
                      )
                    })}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Outras alergias..."
                    value={mrForm.allergies}
                    onChange={(e) => setMrForm({ ...mrForm, allergies: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>DOENÇAS SISTÊMICAS</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                    {['Hipertensão', 'Diabetes', 'Cardiopatia', 'Gestante', 'Nenhuma'].map((tag) => {
                      const active = mrForm.systemicDiseases.includes(tag)
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleTag('systemicDiseases', tag)}
                          style={getTagStyle(active)}
                        >
                          {active ? '✓ ' : '+ '} {tag}
                        </button>
                      )
                    })}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Outras condições..."
                    value={mrForm.systemicDiseases}
                    onChange={(e) => setMrForm({ ...mrForm, systemicDiseases: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Medicamentos, Hábitos, Tipo Sanguíneo & Histórico */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>MEDICAMENTOS EM USO</span>
                  <input 
                    type="text" 
                    placeholder="Ex: Losartana 50mg, Anticoncepcional..."
                    value={mrForm.medications}
                    onChange={(e) => setMrForm({ ...mrForm, medications: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>HÁBITOS</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                    {['Fumante', 'Bruxismo', 'Consome Álcool', 'Fio Dental Diário'].map((tag) => {
                      const active = mrForm.habits.includes(tag)
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => toggleTag('habits', tag)}
                          style={getTagStyle(active)}
                        >
                          {active ? '✓ ' : '+ '} {tag}
                        </button>
                      )
                    })}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Outros hábitos..."
                    value={mrForm.habits}
                    onChange={(e) => setMrForm({ ...mrForm, habits: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>TIPO SANGUÍNEO</span>
                  <input 
                    type="text" 
                    placeholder="Ex: O+, A-, B+"
                    value={mrForm.bloodType}
                    onChange={(e) => setMrForm({ ...mrForm, bloodType: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className={styles.infoLabel}>HISTÓRICO MÉDICO / OBSERVAÇÕES</span>
                  <input 
                    type="text" 
                    placeholder="Observações adicionais relevantes..."
                    value={mrForm.historyNotes}
                    onChange={(e) => setMrForm({ ...mrForm, historyNotes: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Botões do Formulário */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditingMR(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingMR}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {savingMR ? 'Salvando...' : 'Salvar Anamnese'}
                </button>
              </div>
            </form>
          ) : (
            /* Modo Leitura Padrão */
            <div className={styles.prontuarioGrid}>
              {[
                { label: 'Queixa principal', value: mr.chiefComplaint },
                { label: 'Histórico médico', value: mr.historyNotes },
                { label: 'Alergias', value: mr.allergies },
                { label: 'Medicamentos em uso', value: mr.medications },
                { label: 'Tipo sanguíneo', value: mr.bloodType },
                { label: 'Hábitos', value: mr.habits },
                { label: 'Doenças sistêmicas', value: mr.systemicDiseases },
              ].map((item) => (
                <div key={item.label} className={styles.prontuarioItem}>
                  <span className={styles.infoLabel}>{item.label}</span>
                  <span className={`${styles.infoValue} ${!item.value ? styles.infoEmpty : ''}`}>
                    {item.value || 'Não informado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Evoluções Clínicas ─── */}
      {tab === 'evolucoes' && (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Histórico de Evoluções Clínicas</h3>
            <button
              className={styles.backBtn}
              style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
              onClick={() => setIsAddEvolutionOpen(true)}
            >
              + Nova Evolução
            </button>
          </div>

          <EvolutionsTimeline
            patientId={id as string}
            medicalRecordId={patient.medicalRecord?.id}
            key={reloadEvolutionsTrigger}
          />
        </div>
      )}

      {/* ─── Agendamentos ─── */}
      {tab === 'agenda' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Histórico de Agendamentos</h3>
          {patient.appointments.length === 0 ? (
            <p className={styles.empty}>Nenhum agendamento encontrado.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>DATA / HORA</th>
                  <th>DENTISTA</th>
                  <th>SALA</th>
                  <th>TIPO</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {patient.appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    className={styles.row}
                    onClick={() => setSelectedAppt({ ...appt, patient: { id: patient.id, name: patient.name, phone: patient.phone } } as any)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className={styles.dateCell}>{formatDateTime(appt.dateTime)}</td>
                    <td>{appt.dentist?.name ?? '—'}</td>
                    <td>{appt.room?.replace('_', ' ') ?? '—'}</td>
                    <td>{appt.type === 'PARTICULAR' ? 'Particular' : appt.type === 'CONVENIO' ? 'Convênio' : '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${STATUS_CLASS[appt.status]}`}>
                        {STATUS_LABEL[appt.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Planos de Tratamento ─── */}
      {tab === 'planos' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Planos de Tratamento</h3>
          {!patient.treatmentPlans?.length ? (
            <p className={styles.empty}>Nenhum plano de tratamento encontrado.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>TÍTULO</th>
                  <th>STATUS</th>
                  <th>VALOR TOTAL</th>
                  <th>CRIADO EM</th>
                </tr>
              </thead>
              <tbody>
                {patient.treatmentPlans.map((plan) => (
                  <tr key={plan.id} className={styles.row}>
                    <td className={styles.planTitle}>{plan.title}</td>
                    <td>
                      <span className={styles.planStatus}>{PLAN_STATUS_LABEL[plan.status] ?? plan.status}</span>
                    </td>
                    <td className={styles.planAmount}>{formatCurrency(plan.totalAmount)}</td>
                    <td>{formatDate(plan.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Modais ─── */}
      <DetalhesAgendamentoModal
        appointment={selectedAppt as any}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => { setSelectedAppt(null); load() }}
      />

      <AddEvolutionModal
        patientId={id}
        isOpen={isAddEvolutionOpen}
        onClose={() => setIsAddEvolutionOpen(false)}
        onSuccess={() => {
          setIsAddEvolutionOpen(false)
          setReloadEvolutionsTrigger(prev => prev + 1)
        }}
      />
    </div>
  )
}