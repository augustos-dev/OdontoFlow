import React, { useState, useEffect } from 'react'
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
  Clock
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
}

interface LastEvolution {
  date?: string
  professional?: string
  title?: string
  description?: string
}

interface AddEvolutionModalProps {
  patientId: string
  medicalRecordId?: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  lastEvolution?: LastEvolution | null
  userPlan?: 'FREE' | 'BASIC' | 'PREMIUM'
}

export const AddEvolutionModal: React.FC<AddEvolutionModalProps> = ({
  patientId,
  medicalRecordId,
  isOpen,
  onClose,
  onSuccess,
  lastEvolution,
  userPlan = 'BASIC',
}) => {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('NOTE')
  const [description, setDescription] = useState('')
  const [odontogramSnapshot, setOdontogramSnapshot] = useState<OdontogramData>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [previousEvolutions, setPreviousEvolutions] = useState<EvolutionItem[]>([])
  const [showLastEvo, setShowLastEvo] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Busca histórico recente de evoluções
  useEffect(() => {
    if (isOpen && patientId) {
    api.get(`/medical-records/${patientId}/evolutions?limit=1`)
      .then((res) => {
        // Se vier array, pega o primeiro item; se vier objeto direto, usa res.data
        const latest = Array.isArray(res.data) ? res.data[0] : res.data
        setPreviousEvolutions(latest ? [latest] : [])
      })
      .catch((err) => {
        console.error('Erro ao buscar última evolução:', err)
      })
  }
}, [isOpen, patientId])

  if (!isOpen) return null

  const isPremium = userPlan === 'PREMIUM'

  // Trava para recursos de Inteligência Artificial
  const handleAiAction = (actionCallback: () => void) => {
    if (!isPremium) {
      setShowUpgradeModal(true)
      return
    }
    actionCallback()
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!medicalRecordId) {
      alert('Atenção: Este paciente ainda não possui um prontuário cadastrado!')
      return
    }

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
      let payload: any

      if (images.length > 0) {
        const formData = new FormData()
        formData.append('medicalRecordId', medicalRecordId)
        formData.append('description', fullDescription)
        formData.append(
          'odontogramSnapshot',
          JSON.stringify(Object.keys(odontogramSnapshot).length > 0 ? odontogramSnapshot : null)
        )
        images.forEach((img) => formData.append('attachments', img))
        payload = formData
      } else {
        payload = {
          medicalRecordId,
          description: fullDescription,
          odontogramSnapshot: Object.keys(odontogramSnapshot).length > 0 ? odontogramSnapshot : null,
        }
      }

      const response = await api.post(`/medical-records/${patientId}/evolutions`, payload)

      if (response.status === 200 || response.status === 201) {
        setTitle('')
        setDescription('')
        setType('NOTE')
        setImages([])
        setImagePreviews([])
        setOdontogramSnapshot({})
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

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content evo-modal-container" onClick={(e) => e.stopPropagation()}>
          
          {/* Header do Modal */}
          <div className="evo-modal-header">
            <div>
              <h3 className="evo-modal-title">Nova Evolução Clínica</h3>
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
            <div className="add-evolution-grid">
              <div className="form-group">
                <label className="form-label">Título do Procedimento</label>
                <input
                  type="text"
                  placeholder="Ex: Restauração Resina Dente 16"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Registro</label>
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
            </div>

            {/* Editor Rich Text com Barra Word/Email Superior */}
            <div className="form-group">
              <label className="form-label">Descrição do Atendimento</label>
              <div className="rich-editor-wrapper">

                {/* Toolbar de Formatação Superior */}
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

                {/* Área de Texto Editável Visual */}
                <div
                  contentEditable
                  id="rich-textarea-input"
                  className="rich-textarea-editable"
                  onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                  data-placeholder="Descreva detalhadamente os procedimentos realizados, anestesia, materiais utilizados e recomendações..."
                />

                {/* Previews de Fotos Anexadas */}
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

                {/* Toolbar Inferior de Ações (Anexar + IA) */}
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
                    <button
                      type="button"
                      onClick={() => handleAiAction(() => setIsTranscribing(!isTranscribing))}
                      className={`btn-ia-action ${isTranscribing ? 'is-recording' : ''} ${!isPremium ? 'locked' : ''}`}
                    >
                      <Mic className={`w-3.5 h-3.5 ${isTranscribing ? 'text-red-500' : 'text-slate-500'}`} />
                      <span>{isTranscribing ? 'Ouvindo...' : 'Transcrever com IA'}</span>
                      {!isPremium && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => handleAiAction(() => alert('Melhorando texto com IA...'))}
                      className={`btn-ia-action btn-ia-sparkles ${!isPremium ? 'locked' : ''}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Melhorar com IA</span>
                      {!isPremium && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Condicional por Plano */}
            {isPremium ? (
              <div className="ia-trial-banner">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Você possui <strong>recursos de IA ilimitados</strong> no plano Premium!</span>
              </div>
            ) : (
              <div className="ia-locked-banner" onClick={() => setShowUpgradeModal(true)}>
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  A transcrição por voz e melhoria de texto com IA são exclusivas do <strong>Plano Premium</strong>.{' '}
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

            {/* Botões de Ação Principais */}
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Adicionar Registro'}
              </button>
            </div>

            {/* 📋 SEÇÃO: ÚLTIMA EVOLUÇÃO (APENAS O CARD PRINCIPAL) */}
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

      {/* Pop-up Modal de Upgrade Premium */}
      {showUpgradeModal && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="upgrade-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="upgrade-icon-wrapper">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="upgrade-title">Recurso Exclusivo Premium</h3>
            <p className="upgrade-description">
              A transcrição automática de consultas por voz e o aprimoramento clínico com Inteligência Artificial estão disponíveis no <strong>Plano Premium</strong>.
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
                onClick={() => {
                  setShowUpgradeModal(false)
                }}
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