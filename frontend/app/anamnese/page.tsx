'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  HeartPulse, 
  Check, 
  Plus, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react'
import api from '@/lib/api'
import styles from '../anamnese/preCadastro.module.css'

// Opções da Anamnese espelhadas do prontuário OdontoFlow
const OPTIONS_QUEIXA = [
  'Dor de Dente',
  'Limpeza / Check-up',
  'Estética / Clareamento',
  'Ortodontia',
  'Prótese / Implante',
]

const OPTIONS_ALERGIAS = [
  'Penicilina',
  'AAS / Aspirina',
  'Dipirona',
  'Anestésicos',
  'Látex',
  'Nenhuma',
]

const OPTIONS_DOENCAS = [
  'Pressão Alta',
  'Diabetes',
  'Cardiopatia',
  'Hemorragia',
  'Anemia',
  'Asma/Respiratória',
  'Disfunção Renal',
  'Disfunção Hepática',
  'Gastrite/Refluxo',
  'Febre Reumática',
  'Gestante',
  'Amamentando',
]

const OPTIONS_ATM = [
  'Estalido na boca',
  'Dificuldade para abrir boca',
  'Bruxismo',
  'Fumante',
  'Consome Álcool',
  'Anticoncepcional',
]

function AnamnesePacienteForm() {
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') || ''
  const patientName = searchParams.get('name') || ''

  // White-Label dinâmico da clínica
  const [clinicName, setClinicName] = useState('Clarium Clinic - Messejana')
  const [primaryColor, setPrimaryColor] = useState('#0284c7')

  // Anamnese com Seleção Múltipla
  const [selectedQueixa, setSelectedQueixa] = useState<string[]>([])
  const [selectedAlergias, setSelectedAlergias] = useState<string[]>([])
  const [selectedDoencas, setSelectedDoencas] = useState<string[]>([])
  const [selectedAtm, setSelectedAtm] = useState<string[]>([])

  // Campos Livres da Anamnese
  const [medications, setMedications] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [surgeries, setSurgeries] = useState('')

  // Termos de Confirmação e Veracidade
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBranding() {
      try {
        const { data } = await api.get('/clinics').catch(() => ({ data: [] }))
        const clinicsList = Array.isArray(data) ? data : data?.data || []
        if (clinicsList.length > 0) {
          if (clinicsList[0].name) setClinicName(clinicsList[0].name)
          if (clinicsList[0].primaryColor) setPrimaryColor(clinicsList[0].primaryColor)
        }
      } catch {}
    }
    loadBranding()
  }, [])

  function toggleOption(item: string, currentList: string[], setList: (arr: string[]) => void) {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item))
    } else {
      if (item === 'Nenhuma') {
        setList(['Nenhuma'])
      } else {
        setList([...currentList.filter((i) => i !== 'Nenhuma'), item])
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!acceptedTerms) {
      setError('Por favor, confirme o termo de veracidade das informações preenchidas.')
      return
    }

    if (!patientId) {
      setError('Identificador do paciente não encontrado na URL do formulário.')
      return
    }

    setLoading(true)
    try {
      // Monta o payload estruturado exatamente como o PerfilPacientePage e o banco esperam
      const anamnesePayload = {
        chiefComplaint: selectedQueixa.join(', ') || 'Avaliação de rotina',
        allergies: selectedAlergias.join(', ') || 'Nenhuma',
        systemicDiseases: selectedDoencas.join(', ') || 'Nenhuma',
        habits: selectedAtm.join(', ') || 'Não informado',
        medications: medications || 'Nenhum',
        bloodType: bloodType || undefined,
        historyNotes: surgeries ? `Cirurgias/Internações: ${surgeries}` : undefined,
      }

      // 1. Tenta a rota oficial de prontuário existente no backend
      try {
        await api.put(`/medical-records/${patientId}`, anamnesePayload)
        setSuccess(true)
        return
      } catch (err1: any) {
        // 2. Se a rota de prontuário por ID do paciente retornar 404, tenta via patch no paciente
        if (err1.response?.status === 404) {
          await api.patch(`/patients/${patientId}`, {
            medicalRecord: anamnesePayload
          })
          setSuccess(true)
          return
        }
        throw err1
      }
    } catch (err: any) {
      console.error('Erro ao salvar anamnese:', err.response?.data || err)
      const msg = err.response?.data?.message || 'Erro ao salvar sua anamnese no prontuário. Informe a recepção ao chegar.'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.container} style={{ '--primary': primaryColor } as React.CSSProperties}>
        <div className={styles.card}>
          <div className={styles.successCard}>
            <div className={styles.successIconWrap}>
              <CheckCircle2 size={32} />
            </div>
            <h2 className={styles.successTitle}>Anamnese Concluída com Sucesso!</h2>
            <p className={styles.successText}>
              Obrigado, <strong>{patientName || 'Paciente'}</strong>! Suas informações clínicas foram salvas e enviadas com segurança diretamente para o seu prontuário na <strong>{clinicName}</strong>. Tenha um excelente atendimento!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} style={{ '--primary': primaryColor } as React.CSSProperties}>
      <div className={styles.card}>
        
        {/* ─── Header ─── */}
        <div className={styles.header}>
          <div className={styles.badgeClinic}>
            <Sparkles size={12} />
            <span>{clinicName}</span>
          </div>
          <h1 className={styles.title}>Ficha de Saúde (Anamnese)</h1>
          <p className={styles.subtitle}>
            {patientName ? (
              <>Olá, <strong>{patientName}</strong>! Preencha as perguntas abaixo para orientar o atendimento do seu dentista.</>
            ) : (
              <>Preencha suas informações de saúde para garantir um atendimento seguro e personalizado.</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          {/* ─── ANAMNESE CLÍNICA COM CHIPS ─── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <HeartPulse size={14} />
                <span>Anamnese & Saúde Base</span>
              </h3>
              <span className={styles.badgeRascunho}>
                <UserCheck size={12} /> Paciente
              </span>
            </div>

            {/* QUEIXA PRINCIPAL */}
            <div className={styles.chipsGroup}>
              <span className={styles.groupLabel}>Queixa Principal</span>
              <div className={styles.chipsContainer}>
                {OPTIONS_QUEIXA.map((item) => {
                  const active = selectedQueixa.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      onClick={() => toggleOption(item, selectedQueixa, setSelectedQueixa)}
                    >
                      {active ? <Check size={13} /> : <Plus size={13} />}
                      <span>{item}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                readOnly
                className={`${styles.input} ${styles.inputSummary}`}
                placeholder="Selecione as opções acima..."
                value={selectedQueixa.join(', ')}
              />
            </div>

            {/* ALERGIAS & REAÇÕES */}
            <div className={styles.chipsGroup}>
              <span className={styles.groupLabel}>Alergias & Reações</span>
              <div className={styles.chipsContainer}>
                {OPTIONS_ALERGIAS.map((item) => {
                  const active = selectedAlergias.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      onClick={() => toggleOption(item, selectedAlergias, setSelectedAlergias)}
                    >
                      {active ? <Check size={13} /> : <Plus size={13} />}
                      <span>{item}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                readOnly
                className={`${styles.input} ${styles.inputSummary}`}
                placeholder="Selecione caso possua alguma alergia..."
                value={selectedAlergias.join(', ')}
              />
            </div>

            {/* DOENÇAS SISTÊMICAS & CONDIÇÕES */}
            <div className={styles.chipsGroup}>
              <span className={styles.groupLabel}>Doenças Sistêmicas & Condições</span>
              <div className={styles.chipsContainer}>
                {OPTIONS_DOENCAS.map((item) => {
                  const active = selectedDoencas.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      onClick={() => toggleOption(item, selectedDoencas, setSelectedDoencas)}
                    >
                      {active ? <Check size={13} /> : <Plus size={13} />}
                      <span>{item}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                readOnly
                className={`${styles.input} ${styles.inputSummary}`}
                placeholder="Selecione condições pré-existentes..."
                value={selectedDoencas.join(', ')}
              />
            </div>

            {/* ATM & HÁBITOS */}
            <div className={styles.chipsGroup}>
              <span className={styles.groupLabel}>ATM & Hábitos Bucais</span>
              <div className={styles.chipsContainer}>
                {OPTIONS_ATM.map((item) => {
                  const active = selectedAtm.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      onClick={() => toggleOption(item, selectedAtm, setSelectedAtm)}
                    >
                      {active ? <Check size={13} /> : <Plus size={13} />}
                      <span>{item}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                readOnly
                className={`${styles.input} ${styles.inputSummary}`}
                placeholder="Selecione sintomas ou hábitos..."
                value={selectedAtm.join(', ')}
              />
            </div>

            {/* MEDICAMENTOS EM USO */}
            <div className={styles.field}>
              <label className={styles.label}>Medicamentos de Uso Contínuo</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: Anti-hipertensivo, Insulina, AAS..."
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />
            </div>

            {/* TIPO SANGUÍNEO & CIRURGIAS */}
            <div className={styles.rowBloodSurgery}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo Sanguíneo</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: O+, A-, AB+"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Histórico de Cirurgias / Internações</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Cirurgia cardíaca, internação recente..."
                  value={surgeries}
                  onChange={(e) => setSurgeries(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ─── TERMO DE VERACIDADE E CONFIDENCIALIDADE ─── */}
          <div className={styles.consentBox}>
            <div className={styles.consentContent}>
              <input
                id="terms"
                type="checkbox"
                required
                className={styles.checkbox}
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms" className={styles.consentText}>
                Declaro que todas as informações prestadas neste questionário são <strong>verdadeiras e completas</strong>, assumindo total responsabilidade pela exatidão dos dados fornecidos para orientar a conduta clínica da equipe da <strong>{clinicName}</strong>.
              </label>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          {/* ─── BOTÃO DE ENVIO ─── */}
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitBtn}
          >
            {loading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                <span>Enviando questionário...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Confirmar e Concluir Anamnese</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}

export default function AnamnesePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Carregando formulário de anamnese...</div>}>
      <AnamnesePacienteForm />
    </Suspense>
  )
}