'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  X, 
  Mic, 
  Sparkles, 
  Camera, 
  History, 
  ChevronDown, 
  Crown, 
  Trash2,
  Lock,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Clock,
  Save,
  Boxes,
  Square
} from 'lucide-react'
import api from '../../../lib/api'
import { Odontogram, OdontogramData } from '../tooth/Odontogram'
import './AddEvolutionModal.css'

interface EvolutionItem {
  id: string
  title?: string
  description: string
  professionalName?: string
  createdAt: string
  procedureTag?: string
  odontogramSnapshot?: any
}

interface LastEvolution {
  date?: string
  professional?: string
  title?: string
  description?: string
}

interface ProcedureOption {
  id: string
  name: string
  code?: string
  basePrice?: number
  procedureProducts?: any[]
}

interface AddEvolutionModalProps {
  patientId: string
  medicalRecordId?: string | null
  appointmentId?: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  lastEvolution?: LastEvolution | null
  userPlan?: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  initialOdontogramState?: OdontogramData
}

export const AddEvolutionModal: React.FC<AddEvolutionModalProps> = ({
  patientId,
  medicalRecordId,
  appointmentId,
  isOpen,
  onClose,
  onSuccess,
  lastEvolution,
  userPlan = 'PREMIUM',
  initialOdontogramState,
}) => {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('NOTE')
  const [description, setDescription] = useState('')
  const [odontogramSnapshot, setOdontogramSnapshot] = useState<OdontogramData>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  // Seleção de Procedimentos para Exit Inteligente
  const [procedures, setProcedures] = useState<ProcedureOption[]>([])
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('')
  const [loadingProcedures, setLoadingProcedures] = useState<boolean>(false)

  const [previousEvolutions, setPreviousEvolutions] = useState<EvolutionItem[]>([])
  const [showLastEvo, setShowLastEvo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  // Gravação de Áudio com Mocho AI (Whisper + GPT)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [processingAudio, setProcessingAudio] = useState(false)
  const [aiTranscriptionId, setAiTranscriptionId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const editableRef = useRef<HTMLDivElement>(null)

  const DRAFT_KEY = `odontoflow_draft_evolution_${patientId}`
  const isPremiumOrEnterprise = userPlan === 'PREMIUM' || userPlan === 'ENTERPRISE'

  // 1. Carrega Catálogo de Procedimentos
  useEffect(() => {
    if (!isOpen) return

    setLoadingProcedures(true)
    api.get('/procedures')
      .then((res) => {
        const list = res.data?.data || res.data || []
        setProcedures(list)
      })
      .catch((err) => {
        console.error('Erro ao carregar catálogo de procedimentos:', err)
      })
      .finally(() => {
        setLoadingProcedures(false)
      })
  }, [isOpen])

  // 2. Inicializa / Busca Odontograma
  useEffect(() => {
    if (!isOpen || !patientId) return

    if (initialOdontogramState && Object.keys(initialOdontogramState).length > 0) {
      setOdontogramSnapshot(JSON.parse(JSON.stringify(initialOdontogramState)))
      return
    }

    api.get(`/medical-records/${patientId}/evolutions?limit=10`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.evolutions || []
        const evoWithSnapshot = list.find((item: any) => {
          if (!item.odontogramSnapshot) return false
          const parsed = typeof item.odontogramSnapshot === 'string'
            ? JSON.parse(item.odontogramSnapshot)
            : item.odontogramSnapshot
          return parsed && Object.keys(parsed).length > 0
        })

        if (evoWithSnapshot) {
          const snapshot = typeof evoWithSnapshot.odontogramSnapshot === 'string'
            ? JSON.parse(evoWithSnapshot.odontogramSnapshot)
            : evoWithSnapshot.odontogramSnapshot
          setOdontogramSnapshot(snapshot)
        } else {
          setOdontogramSnapshot({})
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar snapshot do odontograma:', err)
      })
  }, [isOpen, patientId, initialOdontogramState])

  // 3. Rascunhos
  useEffect(() => {
    if (isOpen && patientId) {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          if (parsed.title) setTitle(parsed.title)
          if (parsed.type) setType(parsed.type)
          if (parsed.selectedProcedureId) setSelectedProcedureId(parsed.selectedProcedureId)
          if (parsed.description) {
            setDescription(parsed.description)
            if (editableRef.current) {
              editableRef.current.innerHTML = parsed.description
            }
          }
          setHasDraft(true)
        } catch (e) {
          console.error('Erro ao restaurar rascunho:', e)
        }
      }
    }
  }, [isOpen, patientId, DRAFT_KEY])

  useEffect(() => {
    if (isOpen && patientId && (title.trim() || description.trim() || selectedProcedureId)) {
      const draftData = { title, type, description, selectedProcedureId }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      setHasDraft(true)
    }
  }, [title, type, description, selectedProcedureId, isOpen, patientId, DRAFT_KEY])

  // 4. Última evolução
  useEffect(() => {
    if (isOpen && patientId) {
      api.get(`/medical-records/${patientId}/evolutions?limit=1`)
        .then((res) => {
          const raw = Array.isArray(res.data) ? res.data : res.data?.evolutions || []
          const latest = raw[0]
          setPreviousEvolutions(latest ? [latest] : [])
        })
        .catch((err) => {
          console.error('Erro ao buscar última evolução:', err)
        })
    }
  }, [isOpen, patientId])

  // 5. Gravação de Áudio e Envio ao Mocho AI (POST /clinical-ai/transcribe)
  const startRecording = async () => {
    if (!isPremiumOrEnterprise) {
      setShowUpgradeModal(true)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToAI(audioBlob, recordingTime)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 119) {
            stopRecording()
            return 120
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      alert('Não foi possível acessar o microfone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }

  const sendAudioToAI = async (blob: Blob, duration: number) => {
    try {
      setProcessingAudio(true)
      const formData = new FormData()
      formData.append('audio', blob, 'mocho_audio.webm')
      formData.append('durationSeconds', String(duration || 1))

      const res = await api.post('/clinical-ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const data = res.data?.data || res.data
      if (data?.id) setAiTranscriptionId(data.id)

      const struct = data?.structuredData || {}
      let formatted = data?.rawTranscription || ''

      if (struct.summary || struct.conduct) {
        formatted = `<strong>Resumo:</strong> ${struct.summary || ''}<br/><strong>Conduta:</strong> ${struct.conduct || ''}<br/><strong>Prescrições:</strong> ${
          Array.isArray(struct.prescriptions) ? struct.prescriptions.join(', ') : struct.prescriptions || 'Nenhuma'
        }<br/><strong>Materiais:</strong> ${
          Array.isArray(struct.materialsUsed) ? struct.materialsUsed.join(', ') : struct.materialsUsed || 'Nenhum'
        }`
      }

      const nextDesc = description ? `${description}<br/><br/>${formatted}` : formatted
      setDescription(nextDesc)
      if (editableRef.current) {
        editableRef.current.innerHTML = nextDesc
      }
    } catch (err) {
      console.error('Falha ao processar Mocho AI:', err)
      alert('Não foi possível transcrever o áudio.')
    } finally {
      setProcessingAudio(false)
    }
  }

  if (!isOpen) return null

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setTitle('')
    setType('NOTE')
    setSelectedProcedureId('')
    setDescription('')
    if (editableRef.current) {
      editableRef.current.innerHTML = ''
    }
    setHasDraft(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const newFiles = [...images, ...selectedFiles].slice(0, 20)
      setImages(newFiles)

      const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
      setImagePreviews(newPreviews)
    }
  }

  const removeImage = (index: number) => {
    const updatedFiles = images.filter((_, i) => i !== index)
    setImages(updatedFiles)
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  // 6. Submissão da Evolução com appointmentId e Exit Inteligente
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!description.trim()) {
      alert('A descrição da evolução é obrigatória.')
      return
    }

    setLoading(true)

    const fullDescription = [
      title ? `[${title}]` : null,
      type !== 'NOTE' ? `Tipo: ${type === 'PROCEDURE' ? 'Procedimento' : 'Anamnese'}` : null,
      description,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const formData = new FormData()
      if (medicalRecordId) formData.append('medicalRecordId', medicalRecordId)
      formData.append('description', fullDescription)
      
      if (appointmentId) {
        formData.append('appointmentId', appointmentId)
      }
      if (selectedProcedureId && isPremiumOrEnterprise) {
        formData.append('procedureId', selectedProcedureId)
      }
      if (aiTranscriptionId) {
        formData.append('aiTranscriptionId', aiTranscriptionId)
      }
      formData.append(
        'odontogramSnapshot',
        JSON.stringify(Object.keys(odontogramSnapshot).length > 0 ? odontogramSnapshot : null)
      )
      images.forEach((img) => formData.append('attachments', img))

      const response = await api.post(`/medical-records/${patientId}/evolutions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.status === 200 || response.status === 201) {
        localStorage.removeItem(DRAFT_KEY)
        setHasDraft(false)
        setTitle('')
        setDescription('')
        setType('NOTE')
        setSelectedProcedureId('')
        setImages([])
        setImagePreviews([])
        setOdontogramSnapshot({})
        if (editableRef.current) editableRef.current.innerHTML = ''
        
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('Erro ao adicionar evolução:', err)
      alert(err.response?.data?.message || 'Erro ao salvar registro de evolução.')
    } finally {
      setLoading(false)
    }
  }

  const currentProcedure = procedures.find((p) => p.id === selectedProcedureId)

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content evo-modal-container" onClick={(e) => e.stopPropagation()}>
          
          {/* Header do Modal */}
          <div className="evo-modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="evo-modal-title">Nova Evolução Clínica</h3>
                {hasDraft && (
                  <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Save className="w-3 h-3" /> Rascunho salvo
                  </span>
                )}
              </div>
              <p className="evo-modal-subtitle">
                Registre os detalhes do atendimento, adicione fotos e atualize o odontograma.
              </p>
            </div>
            <button type="button" className="btn-close-modal" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="evo-modal-body">
            
            {/* Card Retrátil: Última Evolução */}
            {lastEvolution && (
              <div className="last-evo-card">
                <button
                  type="button"
                  className="last-evo-header"
                  onClick={() => setShowLastEvo(!showLastEvo)}
                >
                  <div className="last-evo-title-group">
                    <History className="w-4 h-4 text-amber-600" />
                    <span>
                      Última Evolução: <strong>{lastEvolution.date || 'Data não informada'}</strong>
                      {lastEvolution.professional && ` — ${lastEvolution.professional}`}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 last-evo-chevron ${showLastEvo ? 'open' : ''}`} />
                </button>

                {showLastEvo && (
                  <div className="last-evo-content">
                    {lastEvolution.title && <p className="last-evo-heading">{lastEvolution.title}</p>}
                    <p className="last-evo-text">{lastEvolution.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Inputs de Topo */}
            <div className="add-evolution-grid-three">
              <div className="form-group">
                <div className="label-with-badge">
                  <label className="form-label">Título do Procedimento</label>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Restauração Resina Dente 16"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <div className="label-with-badge">
                  <label className="form-label">Tipo de Registro</label>
                </div>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="form-select"
                >
                  <option value="NOTE">Anotação Geral</option>
                  <option value="PROCEDURE">Procedimento</option>
                  <option value="ANAMNESIS">Anamnese</option>
                </select>
              </div>

              <div className="form-group">
                <div className="label-with-badge">
                  <label className="form-label">Procedimento para Baixa</label>
                  {!isPremiumOrEnterprise && (
                    <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Crown className="w-2.5 h-2.5" /> Premium
                    </span>
                  )}
                </div>

                <div className="premium-select-wrapper">
                  <select
                    value={selectedProcedureId}
                    onChange={(e) => {
                      if (!isPremiumOrEnterprise) {
                        setShowUpgradeModal(true)
                        return
                      }
                      setSelectedProcedureId(e.target.value)
                    }}
                    className={`form-select ${!isPremiumOrEnterprise ? 'disabled-premium' : ''}`}
                    disabled={loadingProcedures}
                  >
                    <option value="">Nenhum (Sem baixa automática)</option>
                    {procedures.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {!isPremiumOrEnterprise && (
                    <div
                      className="premium-select-overlay"
                      onClick={() => setShowUpgradeModal(true)}
                      title="Exclusivo dos planos Premium e Enterprise"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Aviso Exit Inteligente */}
            {selectedProcedureId && isPremiumOrEnterprise && currentProcedure && (
              <div className="auto-exit-badge-info">
                <Boxes className="w-4 h-4 text-sky-600" />
                <span>
                  <strong>Exit Inteligente Ativo:</strong> Salvar esta evolução disparará a baixa automática dos insumos vinculados à ficha técnica de <strong>{currentProcedure.name}</strong>.
                </span>
              </div>
            )}

            {/* Editor Rich Text com Barra Superior e Mocho AI */}
            <div className="form-group">
              <label className="form-label">Descrição do Atendimento</label>
              <div className="rich-editor-wrapper">

                <div className="formatting-toolbar">
                  <button type="button" className="fmt-btn" title="Negrito" onClick={() => document.execCommand('bold', false)}>
                    <Bold className="w-4 h-4" />
                  </button>
                  <button type="button" className="fmt-btn" title="Itálico" onClick={() => document.execCommand('italic', false)}>
                    <Italic className="w-4 h-4" />
                  </button>
                  <button type="button" className="fmt-btn" title="Sublinhado" onClick={() => document.execCommand('underline', false)}>
                    <Underline className="w-4 h-4" />
                  </button>

                  <span className="fmt-divider" />

                  <button type="button" className="fmt-btn" title="Lista com Marcadores" onClick={() => document.execCommand('insertUnorderedList', false)}>
                    <List className="w-4 h-4" />
                  </button>
                  <button type="button" className="fmt-btn" title="Lista Numerada" onClick={() => document.execCommand('insertOrderedList', false)}>
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <span className="fmt-divider" />

                  <button type="button" className="fmt-btn" title="Alinhar à Esquerda" onClick={() => document.execCommand('justifyLeft', false)}>
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button type="button" className="fmt-btn" title="Centralizar" onClick={() => document.execCommand('justifyCenter', false)}>
                    <AlignCenter className="w-4 h-4" />
                  </button>
                </div>

                <div
                  ref={editableRef}
                  contentEditable
                  id="rich-textarea-input"
                  className="rich-textarea-editable"
                  onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                  data-placeholder="Descreva detalhadamente os procedimentos realizados, anestesia, materiais utilizados e recomendações..."
                />

                {imagePreviews.length > 0 && (
                  <div className="image-previews-bar">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="thumb-container">
                        <img src={src} alt={`Anexo ${idx + 1}`} className="thumb-image" />
                        <button
                          type="button"
                          className="btn-remove-thumb"
                          onClick={() => removeImage(idx)}
                          title="Remover imagem"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Barra de Ações: Fotos + Mocho AI Real */}
                <div className="editor-actions-bar">
                  <label className="btn-upload-label">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Anexar Fotos ({images.length}/20)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <div className="ia-tools-group">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={processingAudio}
                        className={`btn-ia-action ${!isPremiumOrEnterprise ? 'locked' : ''}`}
                      >
                        <Mic className="w-3.5 h-3.5 text-sky-600" />
                        <span>{processingAudio ? 'Processando Mocho AI...' : 'Transcrever com IA'}</span>
                        {!isPremiumOrEnterprise && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="btn-ia-action is-recording"
                      >
                        <Square className="w-3.5 h-3.5 text-red-500" />
                        <span>Parar ({recordingTime}s)</span>
                      </button>
                    )}

                    <button 
                      type="button" 
                      onClick={() => {
                        if (!isPremiumOrEnterprise) {
                          setShowUpgradeModal(true)
                          return
                        }
                        alert('Aprimorando termos odontológicos com IA...')
                      }}
                      className={`btn-ia-action btn-ia-sparkles ${!isPremiumOrEnterprise ? 'locked' : ''}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Melhorar com IA</span>
                      {!isPremiumOrEnterprise && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Condicional */}
            {isPremiumOrEnterprise ? (
              <div className="ia-trial-banner">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Sua clínica possui a <strong>baixa automática de insumos (Exit Inteligente)</strong> e IA habilitados!</span>
              </div>
            ) : (
              <div className="ia-locked-banner" onClick={() => setShowUpgradeModal(true)}>
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  A baixa automática de estoque e recursos de IA são exclusivos dos <strong>Planos Premium e Enterprise</strong>.{' '}
                  <u className="cursor-pointer font-bold">Faça upgrade aqui</u>.
                </span>
              </div>
            )}

            {/* Odontograma */}
            <div className="odontogram-section-container">
              <div className="odontogram-section-header">
                <h4 className="odontogram-section-title">
                  Registro Anatômico do Atendimento (Odontograma)
                </h4>
                <p className="odontogram-section-desc">
                  Marque os procedimentos ou intercorrências realizadas nesta consulta para registrar o histórico inalterável.
                </p>
              </div>
              
              <div className="odontogram-box">
                <Odontogram
                  patientId={patientId}
                  value={odontogramSnapshot}
                  onChange={setOdontogramSnapshot}
                />
              </div>
            </div>

            {/* Ações */}
            <div className="form-actions">
              {hasDraft && (
                <button type="button" onClick={handleDiscardDraft} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
                  Descartar Rascunho
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading || isRecording || processingAudio} className="btn-primary">
                {loading ? 'Salvando...' : 'Adicionar Registro'}
              </button>
            </div>

            {/* Última Evolução */}
            <div className="recent-evolutions-section">
              <h4 className="recent-evolutions-title">Última Evolução</h4>

              {previousEvolutions.length === 0 ? (
                <div className="recent-evo-empty">
                  Nenhum registro anterior encontrado para este paciente.
                </div>
              ) : (
                <div className="recent-evo-card">
                  <p className="recent-evo-text">
                    {previousEvolutions[0].description.replace(/<[^>]*>?/gm, '')}
                  </p>

                  <div className="recent-evo-footer">
                    <div className="recent-evo-author">
                      <span className="author-avatar">
                        {(previousEvolutions[0].professionalName || 'V')[0]}
                      </span>
                      <span>Dr(a). {previousEvolutions[0].professionalName || 'Vicente Gomes'}</span>
                    </div>

                    <span className="recent-evo-dot">•</span>

                    <div className="recent-evo-date">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(previousEvolutions[0].createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {previousEvolutions[0].procedureTag && (
                      <span className="recent-evo-badge">
                        {previousEvolutions[0].procedureTag}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </form>

        </div>
      </div>

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="upgrade-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="upgrade-icon-wrapper">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="upgrade-title">Recurso Exclusivo Premium / Enterprise</h3>
            <p className="upgrade-description">
              A baixa automática de insumos no estoque (Exit Inteligente) e o aprimoramento clínico por voz estão disponíveis nos <strong>Planos Premium e Enterprise</strong>.
            </p>
            <div className="upgrade-actions">
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                className="btn-secondary"
              >
                Agora não
              </button>
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                className="btn-upgrade-primary"
              >
                Ver Planos & Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}