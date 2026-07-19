// app/(dashboard)/pacientes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import styles from './perfil.module.css'
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'

interface MedicalRecord {
  id: string
  chiefComplaint: string | null
  historyNotes: string | null
  allergies: string | null
  medications: string | null
  bloodType: string | null
  habits: string | null
  systemicDiseases: string | null
}

interface Appointment {
  id: string
  dateTime: string
  status: string
  type: string
  room: string
  notes?: string
  cancellationReason?: string
  transaction?: null
  dentist: { id: string; name: string; cro?: string }
  patient: { id: string; name: string; phone: string }
}

interface Patient {
  id: string
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string
  gender: string
  address?: string
  createdAt: string
  medicalRecord: MedicalRecord | null
  appointments: Appointment[]
  treatmentPlans: {
    id: string
    title: string
    status: string
    totalAmount: number
    createdAt: string
  }[]
}

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
  const [tab, setTab] = useState<'info' | 'prontuario' | 'agenda' | 'planos'>('info')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  async function load() {
    try {
      const { data } = await api.get(`/patients/${id}`)
      setPatient(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

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
          🩺 Prontuário
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

      {/* ─── Prontuário ─── */}
      {tab === 'prontuario' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Prontuário Clínico</h3>
          {!mr ? (
            <p className={styles.empty}>Prontuário não encontrado.</p>
          ) : (
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
                    {item.value ?? 'Não informado'}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                    onClick={() => setSelectedAppt({ ...appt, patient: { id: patient.id, name: patient.name, phone: patient.phone } })}
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

      {/* ─── Modal de detalhes ─── */}
      <DetalhesAgendamentoModal
        appointment={selectedAppt as any}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => { setSelectedAppt(null); load() }}
      />
    </div>
  )
}