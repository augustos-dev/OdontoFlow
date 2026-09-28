'use client'

import { useState, useEffect, Suspense, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  HeartPulse, 
  Check, 
  Plus, 
  ShieldCheck, 
  UserCheck,
  AlertCircle,
  Clock
} from 'lucide-react'
import axios from 'axios'
import styles from './preCadastro.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://odontoflow.omniatechlabs.com.br/api'

const OPTIONS_QUEIXA = ['Dor de Dente', 'Limpeza / Check-up', 'Estética / Clareamento', 'Ortodontia', 'Prótese / Implante']
const OPTIONS_ALERGIAS = ['Penicilina', 'AAS / Aspirina', 'Dipirona', 'Anestésicos', 'Látex', 'Nenhuma']
const OPTIONS_DOENCAS = ['Pressão Alta', 'Diabetes', 'Cardiopatia', 'Hemorragia', 'Anemia', 'Asma/Respiratória', 'Disfunção Renal', 'Disfunção Hepática', 'Gastrite/Refluxo', 'Febre Reumática', 'Gestante', 'Amamentando']
const OPTIONS_ATM = ['Estalido na boca', 'Dificuldade para abrir boca', 'Bruxismo', 'Fumante', 'Consome Álcool', 'Anticoncepcional']

function AnamnesePacienteForm() {
  const searchParams = useSearchParams()

  // 1. Extração dupla resiliente: Next.js + window.location nativo para telemóveis
  const [token, setToken] = useState<string>('')
  const [fallbackPatientId, setFallbackPatientId] = useState<string>('')
  const [isClientReady, setIsClientReady] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [clinicName, setClinicName] = useState('Clarium Clinic - Messejana')
  const [primaryColor, setPrimaryColor] = useState('#0284c7')

  // Chips e Seleções
  const [selectedQueixa, setSelectedQueixa] = useState<string[]>([])
  const [selectedAlergias, setSelectedAlergias] = useState<string[]>([])
  const [selectedDoencas, setSelectedDoencas] = useState<string[]>([])
  const [selectedAtm, setSelectedAtm] = useState<string[]>([])

  // Campos Digitáveis (Outros)
  const [customQueixa, setCustomQueixa] = useState('')
  const [customAlergias, setCustomAlergias] = useState('')
  const [customDoencas, setCustomDoencas] = useState('')
  const [customAtm, setCustomAtm] = useState('')

  const [medications, setMedications] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')

  // Efeito 1: Sincronização e extração instantânea do token da barra de endereço
  useEffect(() => {
    let resolvedToken = searchParams.get('token') || ''
    let resolvedPatientId = searchParams.get('patientId') || ''

    if (typeof window !== 'undefined') {
      const nativeParams = new URLSearchParams(window.location.search)
      if (!resolvedToken) resolvedToken = nativeParams.get('token') || ''
      if (!resolvedPatientId) resolvedPatientId = nativeParams.get('patientId') || ''
    }

    setToken(resolvedToken)
    setFallbackPatientId(resolvedPatientId)
    setIsClientReady(true)
  }, [searchParams])

  // Efeito 2: Carregamento do prontuário público assim que os parâmetros forem extraídos
  useEffect(() => {
    if (!isClientReady) return

    async function loadData() {
      // Se após a hidratação do cliente não houver token nem ID, o link é considerado inválido/expirado
      if (!token && !fallbackPatientId) {
        setExpired(true)
        setInitialLoading(false)
        return
      }

      try {
        let res: any
        if (token) {
          // Rota pública enviando o token assinado como parâmetro seguro
          res = await axios.get(`${API_URL}/medical-records/public/anamnese`, {
            params: { token }
          })
        } else {
          // Fallback transitório com ID para testes locais
          res = await axios.get(`${API_URL}/medical-records/${fallbackPatientId}`)
        }

        const data = res.data
        if (data.patientName) setPatientName(data.patientName)
        if (data.clinicName) setClinicName(data.clinicName)

        const record = data?.medicalRecord || data
        if (record) {
          // Queixa principal (suporte a mainComplaint e chiefComplaint)
          const complaint = record.mainComplaint || record.chiefComplaint
          if (complaint) {
            const parts = complaint.split(',').map((s: string) => s.trim()).filter(Boolean)
            setSelectedQueixa(parts.filter((p: string) => OPTIONS_QUEIXA.includes(p)))
            const custom = parts.filter((p: string) => !OPTIONS_QUEIXA.includes(p))
            if (custom.length > 0) setCustomQueixa(custom.join(', '))
          }

          // Alergias
          if (record.allergies) {
            const parts = record.allergies.split(',').map((s: string) => s.trim()).filter(Boolean)
            setSelectedAlergias(parts.filter((p: string) => OPTIONS_ALERGIAS.includes(p)))
            const custom = parts.filter((p: string) => !OPTIONS_ALERGIAS.includes(p))
            if (custom.length > 0) setCustomAlergias(custom.join(', '))
          }

          // Doenças sistémicas
          if (record.systemicDiseases) {
            const parts = record.systemicDiseases.split(',').map((s: string) => s.trim()).filter(Boolean)
            setSelectedDoencas(parts.filter((p: string) => OPTIONS_DOENCAS.includes(p)))
            const custom = parts.filter((p: string) => !OPTIONS_DOENCAS.includes(p))
            if (custom.length > 0) setCustomDoencas(custom.join(', '))
          }

          // Hábitos / ATM
          if (record.habits) {
            const parts = record.habits.split(',').map((s: string) => s.trim()).filter(Boolean)
            setSelectedAtm(parts.filter((p: string) => OPTIONS_ATM.includes(p)))
            const custom = parts.filter((p: string) => !OPTIONS_ATM.includes(p))
            if (custom.length > 0) setCustomAtm(custom.join(', '))
          }

          // Medicamentos em uso
          const meds = record.medicationsInUse || record.medications
          if (meds && meds !== 'Nenhum') {
            setMedications(meds)
          }
        }
      } catch (err: any) {
        // Exibe ecrã de expirado APENAS para erros 401 ou 403 reais do backend
        if (err.response?.status === 401 || err.response?.status === 403) {
          setExpired(true)
        } else {
          console.warn('Iniciando formulário sem dados prévios:', err)
        }
      } finally {
        setInitialLoading(false)
      }
    }

    loadData()
  }, [token, fallbackPatientId, isClientReady])

  function toggleOption(item: string, currentList: string[], setList: (arr: string[]) => void) {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item))
    } else {
      if (item === 'Nenhuma') setList(['Nenhuma'])
      else setList([...currentList.filter((i) => i !== 'Nenhuma'), item])
    }
  }

  function combineData(chips: string[], customText: string, defaultVal = 'Nenhuma') {
    const list = [...chips]
    if (customText.trim()) list.push(customText.trim())
    return list.filter(Boolean).join(', ') || defaultVal
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!acceptedTerms) {
      setError('Por favor, confirme o termo de veracidade das informações.')
      return
    }

    setLoading(true)

    const payload = {
      mainComplaint: combineData(selectedQueixa, customQueixa, 'Avaliação de rotina'),
      allergies: combineData(selectedAlergias, customAlergias, 'Nenhuma'),
      systemicDiseases: combineData(selectedDoencas, customDoencas, 'Nenhuma'),
      habits: combineData(selectedAtm, customAtm, 'Não informado'),
      medicationsInUse: medications.trim() || 'Nenhum',
    }

    try {
      if (token) {
        // Submissão pública autenticada pelo token de 36 horas
        await axios.put(`${API_URL}/medical-records/public/anamnese`, payload, {
          params: { token }
        })
      } else {
        // Rota protegida interna
        await axios.put(`${API_URL}/medical-records/${fallbackPatientId}`, payload)
      }
      setSuccess(true)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao guardar a sua anamnese.'
      if (err.response?.status === 401 || err.response?.status === 403) {
        setExpired(true)
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Loader2 size={28} className={styles.spinner} style={{ margin: '0 auto 12px', color: primaryColor }} />
          <p style={{ fontSize: '13px', color: '#64748b' }}>Carregando dados com segurança...</p>
        </div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Clock size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Link de Anamnese Expirado</h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px' }}>
            Por motivos de privacidade e segurança médica, este link tinha validade de <strong>36 horas</strong> e já expirou.
          </p>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
            Por favor, solicite um novo link à recepção da <strong>{clinicName}</strong> ou preencha presencialmente ao chegar.
          </div>
        </div>
      </div>
    )
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
              Obrigado{patientName ? `, ${patientName}` : ''}! Suas informações clínicas foram salvas com sigilo diretamente no seu prontuário na <strong>{clinicName}</strong>. Tenha um excelente atendimento!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} style={{ '--primary': primaryColor } as React.CSSProperties}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badgeClinic}>
            <Sparkles size={12} />
            <span>{clinicName}</span>
          </div>
          <h1 className={styles.title}>Ficha de Saúde (Anamnese)</h1>
          <p className={styles.subtitle}>
            {patientName ? (
              <>Olá, <strong>{patientName}</strong>! Confira ou complemente as informações abaixo para sua consulta.</>
            ) : (
              <>Preencha suas informações de saúde para garantir um atendimento seguro e personalizado.</>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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

            {/* 1. QUEIXA PRINCIPAL */}
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
                placeholder="Outro motivo ou detalhamento da queixa..."
                value={customQueixa}
                onChange={(e) => setCustomQueixa(e.target.value)}
                className={styles.input}
                style={{ marginTop: '8px' }}
              />
            </div>

            {/* 2. ALERGIAS & REAÇÕES */}
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
                placeholder="Outra alergia não listada acima..."
                value={customAlergias}
                onChange={(e) => setCustomAlergias(e.target.value)}
                className={styles.input}
                style={{ marginTop: '8px' }}
              />
            </div>

            {/* 3. DOENÇAS SISTÊMICAS */}
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
                placeholder="Outra doença ou diagnóstico pré-existente..."
                value={customDoencas}
                onChange={(e) => setCustomDoencas(e.target.value)}
                className={styles.input}
                style={{ marginTop: '8px' }}
              />
            </div>

            {/* 4. ATM & HÁBITOS ORAIS */}
            <div className={styles.chipsGroup}>
              <span className={styles.groupLabel}>ATM & Hábitos Orais</span>
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
                placeholder="Outro hábito ou sintoma bucal..."
                value={customAtm}
                onChange={(e) => setCustomAtm(e.target.value)}
                className={styles.input}
                style={{ marginTop: '8px' }}
              />
            </div>

            {/* MEDICAMENTOS */}
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
          </div>

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

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                <span>Gravando questionário seguro...</span>
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
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Carregando formulário seguro...
      </div>
    }>
      <AnamnesePacienteForm />
    </Suspense>
  )
}