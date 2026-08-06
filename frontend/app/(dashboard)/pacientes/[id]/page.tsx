'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  AlertTriangle, 
  Cake, 
  Phone, 
  Mail, 
  MapPin, 
  Stethoscope, 
  FileText, 
  Calendar, 
  ClipboardList, 
  Folder,
  Pencil, 
  Check, 
  Plus, 
  Loader2 
} from 'lucide-react'
import api from '@/lib/api'
import styles from './perfil.module.css'

// Import de Componentes
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'
import { EvolutionsTimeline } from '../../../components/medical-record/EvolutionsTimeline'
import { AddEvolutionModal } from '../../../components/medical-record/AddEvolutionModal'
import { Odontogram } from '../../../components/tooth/Odontogram'
import { PatientFilesTab, PatientFile } from '../../../components/pacienteFile/PatientFilesTab'

// Import de Tipos Globais
import { Patient } from '../../../../types/patient.types'
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
  const [tab, setTab] = useState<'visao_geral' | 'evolucoes' | 'agenda' | 'planos' | 'arquivos'>('visao_geral')

  // Modais & Timeline State
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [isAddEvolutionOpen, setIsAddEvolutionOpen] = useState(false)
  const [reloadEvolutionsTrigger, setReloadEvolutionsTrigger] = useState(0)

  // Arquivos do Paciente
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([])

  // Estados de Edição do Prontuário Base / Anamnese
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

    // 🔴 DIAGNÓSTICO: Vamos ver no DevTools exatamente tudo que o Backend retornou!
    console.log('🔍 [DEBUG] Resposta completa da API /patients/:id ->', data)

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

    // 🚀 Busca as evoluções onde quer que elas estejam (no medicalRecord ou na raiz de data)
    const evolutions = data.medicalRecord?.evolutions || data.evolutions || []

    console.log('🔍 [DEBUG] Evoluções encontradas ->', evolutions)

    const extractedFiles: PatientFile[] = evolutions.flatMap((evo: any) => {
      // Tenta pegar anexos por qualquer nome comum
      const rawAttachments = evo.attachments || evo.attachmentsUrl || evo.files || []

      // Se por acaso vier como String JSON do banco, faz o parse
      const attachmentsArray = typeof rawAttachments === 'string' 
        ? JSON.parse(rawAttachments) 
        : rawAttachments

      if (!Array.isArray(attachmentsArray)) return []

      return attachmentsArray.map((item: any, index: number) => {
        const fileUrl = typeof item === 'string' ? item : item.url || item.path || ''
        const fileName = typeof item === 'object' && item.name 
          ? item.name 
          : fileUrl.split('/').pop()?.split('?')[0] || `Exame_${index + 1}`

        return {
          id: `${evo.id}-${index}`,
          name: fileName,
          url: fileUrl,
          createdAt: evo.createdAt,
          type: fileUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image',
          size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : undefined,
        }
      })
    })

    const validFiles = extractedFiles.filter((f) => Boolean(f.url))

    console.log('🚀 [DEBUG] Arquivos extraídos com sucesso ->', validFiles)
    setPatientFiles(validFiles)

  } catch (err) {
    console.error('Erro ao carregar dados do paciente:', err)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    if (id) load()
  }, [id])

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
      await api.put(`/medical-records/${id}`, mrForm)
      await load()
      setIsEditingMR(false)
    } catch (err: any) {
      console.error('Erro ao salvar o prontuário:', err.response?.data || err)
      alert(err.response?.data?.message || 'Erro ao salvar as alterações do prontuário.')
    } finally {
      setSavingMR(false)
    }
  }

  // Upload direto na Aba de Arquivos
  async function handleUploadFiles(files: FileList) {
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('attachments', file))
      formData.append('description', 'Upload de arquivo rápido via Aba Arquivos')

      await api.post(`/medical-records/${id}/evolutions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await load()
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err)
      alert('Falha ao realizar o upload do arquivo.')
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

  function isBirthdayToday(birthDate?: string) {
    if (!birthDate) return false
    const birth = new Date(birthDate)
    const today = new Date()
    return birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth()
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando perfil...</span>
      </div>
    )
  }

  if (!patient) return <div className={styles.loading}>Paciente não encontrado.</div>

  const age = calcAge(patient.birthDate)
  const mr = patient.medicalRecord
  const isBirthday = isBirthdayToday(patient.birthDate)

  return (
    <div className={styles.page}>
      
      {/* ─── Header do Perfil ─── */}
      <div className={styles.profileHeader}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar}>{getInitials(patient.name)}</div>
          <div>
            <div className={styles.profileTitleRow}>
              <h1 className={styles.profileName}>{patient.name}</h1>
              
              {/* Badges de Alerta no Topo */}
              {mr?.allergies && mr.allergies.toLowerCase() !== 'nenhuma' && (
                <span className={styles.badgeAllergy}>
                  <AlertTriangle size={14} />
                  <span>Alergia: {mr.allergies}</span>
                </span>
              )}
              {isBirthday && (
                <span className={styles.badgeBirthday}>
                  <Cake size={14} />
                  <span>Aniversário Hoje!</span>
                </span>
              )}
            </div>

            <div className={styles.profileMeta}>
              {age !== null && (
                <span className={styles.metaItem}>
                  <Cake size={13} />
                  <span>{age} anos</span>
                </span>
              )}
              {patient.gender !== 'NAO_INFORMADO' && <span>· {GENDER_LABEL[patient.gender]}</span>}
              {patient.cpf && <span>· CPF: {patient.cpf}</span>}
              <span>· Cadastrado em {formatDate(patient.createdAt)}</span>
            </div>
            
            <div className={styles.profileContacts}>
              <a href={`https://wa.me/55${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={styles.contactLink}>
                <Phone size={14} />
                <span>{patient.phone}</span>
              </a>
              {patient.email && (
                <span className={styles.contactItem}>
                  <Mail size={14} />
                  <span>{patient.email}</span>
                </span>
              )}
              {patient.address && (
                <span className={styles.contactItem}>
                  <MapPin size={14} />
                  <span>{patient.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navegação por Abas ─── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'visao_geral' ? styles.tabActive : ''}`} onClick={() => setTab('visao_geral')}>
          <Stethoscope size={16} />
          <span>Visão Geral & Odontograma</span>
        </button>
        <button className={`${styles.tab} ${tab === 'evolucoes' ? styles.tabActive : ''}`} onClick={() => setTab('evolucoes')}>
          <FileText size={16} />
          <span>Evoluções Clínicas</span>
        </button>
        <button className={`${styles.tab} ${tab === 'agenda' ? styles.tabActive : ''}`} onClick={() => setTab('agenda')}>
          <Calendar size={16} />
          <span>Agendamentos ({patient.appointments.length})</span>
        </button>
        <button className={`${styles.tab} ${tab === 'planos' ? styles.tabActive : ''}`} onClick={() => setTab('planos')}>
          <ClipboardList size={16} />
          <span>Planos ({patient.treatmentPlans?.length ?? 0})</span>
        </button>
        <button className={`${styles.tab} ${tab === 'arquivos' ? styles.tabActive : ''}`} onClick={() => setTab('arquivos')}>
          <Folder size={16} />
          <span>Arquivos ({patientFiles.length})</span>
        </button>
      </div>

      {/* ─── Grid Principal ─── */}
      <div className={tab === 'arquivos' ? styles.singleColumnLayout : styles.gridContainer}>
        
        {/* ================= COLUNA ESQUERDA (ANAMNESE COMPLETA) ================= */}
        {tab !== 'arquivos' && (
          <div className={styles.column}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.sectionTitle}>Anamnese & Saúde Base</h3>
                {!isEditingMR && (
                  <button type="button" onClick={() => setIsEditingMR(true)} className={styles.btnEdit}>
                    <Pencil size={14} />
                    <span>Editar Anamnese</span>
                  </button>
                )}
              </div>

              {isEditingMR ? (
                <form onSubmit={handleSaveMedicalRecord} className={styles.anamneseForm}>
                  
                  {/* Queixa Principal */}
                  <div className={styles.formGroup}>
                    <span className={styles.infoLabel}>QUEIXA PRINCIPAL</span>
                    <div className={styles.tagsWrapper}>
                      {['Dor de Dente', 'Limpeza / Check-up', 'Estética / Clareamento', 'Ortodontia', 'Prótese / Implante'].map((tag) => {
                        const isActive = mrForm.chiefComplaint.includes(tag)
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => toggleTag('chiefComplaint', tag)}
                            className={`${styles.tagBtn} ${isActive ? styles.tagBtnActive : ''}`}
                          >
                            {isActive ? <Check size={12} /> : <Plus size={12} />}
                            <span>{tag}</span>
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Detalhamento da queixa..."
                      value={mrForm.chiefComplaint}
                      onChange={(e) => setMrForm({ ...mrForm, chiefComplaint: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  {/* Alergias */}
                  <div className={styles.formGroup}>
                    <span className={styles.infoLabel}>ALERGIAS & REAÇÕES</span>
                    <div className={styles.tagsWrapper}>
                      {['Penicilina', 'AAS / Aspirina', 'Dipirona', 'Anestésicos', 'Látex', 'Nenhuma'].map((tag) => {
                        const isActive = mrForm.allergies.includes(tag)
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => toggleTag('allergies', tag)}
                            className={`${styles.tagBtn} ${isActive ? styles.tagBtnActive : ''}`}
                          >
                            {isActive ? <Check size={12} /> : <Plus size={12} />}
                            <span>{tag}</span>
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Outras alergias..."
                      value={mrForm.allergies}
                      onChange={(e) => setMrForm({ ...mrForm, allergies: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  {/* Doenças Sistêmicas */}
                  <div className={styles.formGroup}>
                    <span className={styles.infoLabel}>DOENÇAS SISTÊMICAS & CONDIÇÕES</span>
                    <div className={styles.tagsWrapper}>
                      {[
                        'Pressão Alta', 'Diabetes', 'Cardiopatia', 'Hemorragia', 'Anemia',
                        'Asma/Respiratória', 'Disfunção Renal', 'Disfunção Hepática',
                        'Gastrite/Refluxo', 'Febre Reumática', 'Gestante', 'Amamentando'
                      ].map((tag) => {
                        const isActive = mrForm.systemicDiseases.includes(tag)
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => toggleTag('systemicDiseases', tag)}
                            className={`${styles.tagBtn} ${isActive ? styles.tagBtnActive : ''}`}
                          >
                            {isActive ? <Check size={12} /> : <Plus size={12} />}
                            <span>{tag}</span>
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Detalhes adicionais de doenças/síndromes..."
                      value={mrForm.systemicDiseases}
                      onChange={(e) => setMrForm({ ...mrForm, systemicDiseases: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  {/* ATM e Hábitos */}
                  <div className={styles.formGroup}>
                    <span className={styles.infoLabel}>ATM & HÁBITOS BUCAL</span>
                    <div className={styles.tagsWrapper}>
                      {[
                        'Estalido na boca', 'Dificuldade para abrir boca',
                        'Bruxismo', 'Fumante', 'Consome Álcool', 'Anticoncepcional'
                      ].map((tag) => {
                        const isActive = mrForm.habits.includes(tag)
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => toggleTag('habits', tag)}
                            className={`${styles.tagBtn} ${isActive ? styles.tagBtnActive : ''}`}
                          >
                            {isActive ? <Check size={12} /> : <Plus size={12} />}
                            <span>{tag}</span>
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Outros hábitos articulares..."
                      value={mrForm.habits}
                      onChange={(e) => setMrForm({ ...mrForm, habits: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  {/* Medicamentos */}
                  <div className={styles.formGroup}>
                    <span className={styles.infoLabel}>MEDICAMENTOS EM USO</span>
                    <input
                      type="text"
                      placeholder="Ex: Anti-hipertensivo, Insulina..."
                      value={mrForm.medications}
                      onChange={(e) => setMrForm({ ...mrForm, medications: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  {/* Tipo Sanguíneo e Histórico */}
                  <div className={styles.twoCols}>
                    <div className={styles.formGroup}>
                      <span className={styles.infoLabel}>TIPO SANGUÍNEO</span>
                      <input
                        type="text"
                        placeholder="Ex: O+, A-, AB+"
                        value={mrForm.bloodType}
                        onChange={(e) => setMrForm({ ...mrForm, bloodType: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <span className={styles.infoLabel}>HISTÓRICO / CIRURGIAS</span>
                      <input
                        type="text"
                        placeholder="Internações, cirurgias..."
                        value={mrForm.historyNotes}
                        onChange={(e) => setMrForm({ ...mrForm, historyNotes: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Botões do Formulário */}
                  <div className={styles.formActions}>
                    <button type="button" onClick={() => setIsEditingMR(false)} className={styles.btnSecondary}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={savingMR} className={styles.btnPrimary}>
                      {savingMR ? 'Salvando...' : 'Salvar Anamnese'}
                    </button>
                  </div>
                </form>
              ) : !mr ? (
                <p className={styles.empty}>Prontuário ainda não preenchido. Clique em "Editar Anamnese" para cadastrar.</p>
              ) : (
                <div className={styles.anamneseList}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>QUEIXA PRINCIPAL</span>
                    <span className={`${styles.infoValue} ${!mr.chiefComplaint ? styles.infoEmpty : ''}`}>
                      {mr.chiefComplaint || 'Não informado'}
                    </span>
                  </div>

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ALERGIAS</span>
                    <span className={`${styles.infoValue} ${!mr.allergies ? styles.infoEmpty : ''}`} style={{ color: mr.allergies && mr.allergies.toLowerCase() !== 'nenhuma' ? '#dc2626' : 'inherit', fontWeight: mr.allergies && mr.allergies.toLowerCase() !== 'nenhuma' ? 600 : 'normal' }}>
                      {mr.allergies || 'Nenhuma'}
                    </span>
                  </div>

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>DOENÇAS SISTÊMICAS / CONDIÇÕES</span>
                    <span className={`${styles.infoValue} ${!mr.systemicDiseases ? styles.infoEmpty : ''}`}>
                      {mr.systemicDiseases || 'Nenhuma'}
                    </span>
                  </div>

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>MEDICAMENTOS EM USO</span>
                    <span className={`${styles.infoValue} ${!mr.medications ? styles.infoEmpty : ''}`}>
                      {mr.medications || 'Nenhum'}
                    </span>
                  </div>

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>ATM & HÁBITOS</span>
                    <span className={`${styles.infoValue} ${!mr.habits ? styles.infoEmpty : ''}`}>
                      {mr.habits || 'Não informado'}
                    </span>
                  </div>

                  <div className={styles.twoCols}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>TIPO SANGUÍNEO</span>
                      <span className={styles.infoValue}>{mr.bloodType || '—'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>HISTÓRICO / OBS</span>
                      <span className={styles.infoValue}>{mr.historyNotes || '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= COLUNA DIREITA (ODONTOGRAMA & DEMAIS ABAS) ================= */}
        <div className={styles.column}>
          
          {/* VISÃO GERAL (ODONTOGRAMA + EVOLUÇÕES) */}
          {tab === 'visao_geral' && (
            <>
              <div className={styles.card}>
                <div>
                  <h3 className={styles.sectionTitle}>Mapa Bucal (Odontograma)</h3>
                  <p className={styles.sectionSubtitle}>
                    Selecione um procedimento na barra de ferramentas e clique nas faces anatômicas para registrar o estado dos dentes.
                  </p>
                </div>
                
                <Odontogram patientId={id as string} />
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.sectionTitle}>Últimas Evoluções Clínicas</h3>
                  <button className={styles.btnPrimary} onClick={() => setIsAddEvolutionOpen(true)}>
                    <Plus size={15} />
                    <span>Nova Evolução</span>
                  </button>
                </div>

                <EvolutionsTimeline
                  patientId={id as string}
                  medicalRecordId={patient.medicalRecord?.id}
                  key={reloadEvolutionsTrigger}
                />
              </div>
            </>
          )}

          {/* EVOLUÇÕES CLÍNICAS */}
          {tab === 'evolucoes' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.sectionTitle}>Histórico de Evoluções Clínicas</h3>
                <button className={styles.btnPrimary} onClick={() => setIsAddEvolutionOpen(true)}>
                  <Plus size={15} />
                  <span>Nova Evolução</span>
                </button>
              </div>

              <EvolutionsTimeline
                patientId={id as string}
                medicalRecordId={patient.medicalRecord?.id}
                key={reloadEvolutionsTrigger}
              />
            </div>
          )}

          {/* AGENDAMENTOS */}
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

          {/* PLANOS DE TRATAMENTO */}
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

          {/* ABA DE ARQUIVOS */}
          {tab === 'arquivos' && (
            <PatientFilesTab
              files={patientFiles}
              onUploadNewFile={handleUploadFiles}
            />
          )}

        </div>

      </div>

      {/* ─── Modais ─── */}
      <DetalhesAgendamentoModal
        appointment={selectedAppt as any}
        onClose={() => setSelectedAppt(null)}
        onSuccess={() => { setSelectedAppt(null); load() }}
      />

      <AddEvolutionModal
        patientId={id as string}
        medicalRecordId={patient?.medicalRecord?.id}
        isOpen={isAddEvolutionOpen}
        onClose={() => setIsAddEvolutionOpen(false)}
        onSuccess={() => {
          setIsAddEvolutionOpen(false)
          load()
          setReloadEvolutionsTrigger((prev) => prev + 1)
        }}
      />
    </div>
  )
}