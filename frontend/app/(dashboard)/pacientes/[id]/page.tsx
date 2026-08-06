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
  Loader2,
  Eye,
  ExternalLink,
  Save
} from 'lucide-react'
import api from '@/lib/api'
import styles from './perfil.module.css'

// Import de Componentes
import DetalhesAgendamentoModal from '@/app/components/DetalhesAgendamentoModal'
import { EvolutionsTimeline } from '../../../components/medical-record/EvolutionsTimeline'
import { AddEvolutionModal } from '../../../components/medical-record/AddEvolutionModal'
import { Odontogram, OdontogramData } from '../../../components/tooth/Odontogram'
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

  // Estado do Odontograma Acumulado
  const [currentOdontogram, setCurrentOdontogram] = useState<OdontogramData | null>(null)

  // Arquivos e Raio-X Panorâmico
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([])
  const [panoramicFile, setPanoramicFile] = useState<PatientFile | null>(null)

  // Estados de Edição do Prontuário Base / Anamnese
  const [isEditingMR, setIsEditingMR] = useState(false)
  const [savingMR, setSavingMR] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [mrForm, setMrForm] = useState({
    chiefComplaint: '',
    historyNotes: '',
    allergies: '',
    medications: '',
    bloodType: '',
    habits: '',
    systemicDiseases: '',
  })

  const DRAFT_KEY = `odontoflow_draft_mr_${id}`

  // ── 1. Rascunho Automático (LocalStorage) ──
  useEffect(() => {
    if (isEditingMR && id) {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          setMrForm(parsed)
          setHasDraft(true)
        } catch (e) {
          console.error('Erro ao ler rascunho:', e)
        }
      }
    }
  }, [isEditingMR, id, DRAFT_KEY])

  useEffect(() => {
    if (isEditingMR && id) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(mrForm))
      setHasDraft(true)
    }
  }, [mrForm, isEditingMR, id, DRAFT_KEY])

  // ── 2. Carga Principal de Dados ──
  async function load() {
    try {
      // 2.1. Busca dados do paciente
      const { data: patientData } = await api.get(`/patients/${id}`)
      setPatient(patientData)

      // Popula Anamnese inicial se não tiver rascunho ativo
      const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null
      if (patientData.medicalRecord && !savedDraft) {
        setMrForm({
          chiefComplaint: patientData.medicalRecord.chiefComplaint ?? '',
          historyNotes: patientData.medicalRecord.historyNotes ?? '',
          allergies: patientData.medicalRecord.allergies ?? '',
          medications: patientData.medicalRecord.medications ?? '',
          bloodType: patientData.medicalRecord.bloodType ?? '',
          habits: patientData.medicalRecord.habits ?? '',
          systemicDiseases: patientData.medicalRecord.systemicDiseases ?? '',
        })
      }

      // 2.2. Busca histórico, anexos e snapshot das evoluções
      try {
        const { data: evolutions } = await api.get(`/medical-records/${id}/evolutions`)

        if (Array.isArray(evolutions)) {
          let foundPanoramic: PatientFile | null = null

          // 🎯 Busca o snapshot de Odontograma mais recente no histórico de evoluções
          const evolutionsWithSnapshot = evolutions
            .filter((evo: any) => evo.odontogramSnapshot)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

          if (evolutionsWithSnapshot.length > 0) {
            const rawSnapshot = evolutionsWithSnapshot[0].odontogramSnapshot
            const parsedSnapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot
            setCurrentOdontogram(parsedSnapshot)
          }

          // Extração dos Anexos
          const extractedFiles: PatientFile[] = evolutions.flatMap((evo: any) => {
            const rawAttachments = evo.attachments || []

            const attachmentsArray = typeof rawAttachments === 'string'
              ? JSON.parse(rawAttachments)
              : rawAttachments

            if (!Array.isArray(attachmentsArray)) return []

            return attachmentsArray.map((item: any, index: number) => {
              const fileUrl = typeof item === 'string' ? item : item.url || item.path || ''
              const fileName = typeof item === 'object' && item.name
                ? item.name
                : fileUrl.split('/').pop()?.split('?')[0] || `Anexo_${index + 1}`

              const isPdf = fileUrl.toLowerCase().includes('.pdf')
              const lowerName = fileName.toLowerCase()
              const lowerUrl = fileUrl.toLowerCase()

              const fileObj: PatientFile = {
                id: `${evo.id}-${index}`,
                name: fileName,
                url: fileUrl,
                createdAt: evo.createdAt,
                type: isPdf ? 'pdf' : 'image',
                size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : undefined,
              }

              const isPanoramic = (
                lowerName.includes('panoram') || 
                lowerName.includes('raio-x') || 
                lowerName.includes('rx') ||
                lowerName.includes('laudo') ||
                lowerUrl.includes('panoram')
              )

              if (isPanoramic && !foundPanoramic) {
                foundPanoramic = fileObj
              }

              return fileObj
            })
          })

          const validFiles = extractedFiles.filter((file) => Boolean(file.url))
          setPatientFiles(validFiles)
          setPanoramicFile(foundPanoramic)
        }
      } catch (evoErr) {
        console.error('Erro ao buscar evoluções do paciente:', evoErr)
      }

    } catch (err) {
      console.error('Erro ao carregar perfil do paciente:', err)
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
      
      localStorage.removeItem(DRAFT_KEY)
      setHasDraft(false)

      await load()
      setIsEditingMR(false)
    } catch (err: any) {
      console.error('Erro ao salvar o prontuário:', err.response?.data || err)
      alert(err.response?.data?.message || 'Erro ao salvar as alterações do prontuário.')
    } finally {
      setSavingMR(false)
    }
  }

  function handleDiscardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
    if (patient?.medicalRecord) {
      setMrForm({
        chiefComplaint: patient.medicalRecord.chiefComplaint ?? '',
        historyNotes: patient.medicalRecord.historyNotes ?? '',
        allergies: patient.medicalRecord.allergies ?? '',
        medications: patient.medicalRecord.medications ?? '',
        bloodType: patient.medicalRecord.bloodType ?? '',
        habits: patient.medicalRecord.habits ?? '',
        systemicDiseases: patient.medicalRecord.systemicDiseases ?? '',
      })
    }
  }

  async function handleUploadFiles(files: FileList) {
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('attachments', file))
      formData.append('description', 'Upload de arquivo rápido via Aba Arquivos')

      await api.post(`/medical-records/${id}/evolutions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await load()
      setReloadEvolutionsTrigger((prev) => prev + 1)
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
        
        {/* ================= COLUNA ESQUERDA (ANAMNESE) ================= */}
        {tab !== 'arquivos' && (
          <div className={styles.column}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className={styles.sectionTitle}>Anamnese & Saúde Base</h3>
                  {hasDraft && isEditingMR && (
                    <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Save size={10} /> Rascunho salvo
                    </span>
                  )}
                </div>
                {!isEditingMR && (
                  <button type="button" onClick={() => setIsEditingMR(true)} className={styles.btnEdit}>
                    <Pencil size={14} />
                    <span>Editar Anamnese</span>
                  </button>
                )}
              </div>

              {isEditingMR ? (
                <form onSubmit={handleSaveMedicalRecord} className={styles.anamneseForm}>
                  
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

                  <div className={styles.formActions}>
                    {hasDraft && (
                      <button type="button" onClick={handleDiscardDraft} className={styles.btnSecondary} style={{ color: '#ef4444' }}>
                        Descartar Rascunho
                      </button>
                    )}
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
          
          {/* VISÃO GERAL */}
          {tab === 'visao_geral' && (
            <>
              {/* Radiografia Panorâmica */}
              {panoramicFile && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0f172a' }}>
                      <Eye size={18} style={{ color: '#06b6d4' }} />
                      <span>{panoramicFile.type === 'pdf' ? 'Laudo / Radiografia Panorâmica (PDF)' : 'Radiografia Panorâmica do Paciente'}</span>
                    </div>
                    <a 
                      href={panoramicFile.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ fontSize: '0.8rem', color: '#06b6d4', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Abrir Documento Inteiro</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div style={{ width: '100%', height: '280px', backgroundColor: '#09090b', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #27272a' }}>
                    {panoramicFile.type === 'pdf' ? (
                      <iframe 
                        src={`${panoramicFile.url}#toolbar=0`} 
                        style={{ width: '100%', height: '100%', border: 'none' }} 
                        title="Laudo Panorâmico PDF"
                      />
                    ) : (
                      <img 
                        src={panoramicFile.url} 
                        alt="Radiografia Panorâmica" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <div>
                  <h3 className={styles.sectionTitle}>Mapa Bucal (Odontograma)</h3>
                  <p className={styles.sectionSubtitle}>
                    Estado atual acumulado baseado nos atendimentos registrados.
                  </p>
                </div>
                
                {/* 🎯 Odontograma renderizado com o snapshot vindo da evolução mais recente */}
                <Odontogram 
                  patientId={id as string} 
                  value={currentOdontogram || undefined}
                  onChange={(newState) => setCurrentOdontogram(newState)}
                />
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