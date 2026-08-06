import React, { useState } from 'react'
import { Calendar, User, ShieldCheck, X, Image as ImageIcon, ZoomIn, FileText, Download, ExternalLink } from 'lucide-react'
import { Odontogram } from '../tooth/Odontogram'
import './EvolutionDetailsModal.css'

export interface Evolution {
  id?: string
  medicalRecordId?: string
  dentistName?: string
  dentist?: { name: string }
  type?: string
  title?: string
  description: string
  odontogramSnapshot?: any
  attachments?: string[]
  createdAt: string | Date
}

interface EvolutionDetailsModalProps {
  evolution: Evolution | null
  onClose: () => void
}

export function EvolutionDetailsModal({ evolution, onClose }: EvolutionDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!evolution) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const hasSnapshot = evolution.odontogramSnapshot && Object.keys(evolution.odontogramSnapshot).length > 0
  const hasAttachments = evolution.attachments && evolution.attachments.length > 0

  const checkIsPdf = (url: string) => url.toLowerCase().includes('.pdf')

  return (
    <>
      <div className="sheet-backdrop" onClick={handleBackdropClick}>
        <div className="sheet-container">
          
          <div className="sheet-header">
            <div>
              <div className="sheet-meta">
                <span className="evolution-badge">{evolution.type || 'Anotação Clínica'}</span>
                <span className="evolution-date">
                  <Calendar size={13} />
                  {new Date(evolution.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h2 className="sheet-title">{evolution.title || 'Evolução Clínica'}</h2>
            </div>

            <button className="sheet-close-btn" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          <div className="sheet-body">
            <div className="evolution-doctor-info">
              <User size={15} className="doctor-icon" />
              <span>
                Registrado por: <strong>{evolution.dentistName || evolution.dentist?.name || 'Dr. Vicente'}</strong>
              </span>
            </div>

            <div className="evolution-section">
              <label className="evolution-section-label">
                <FileText size={15} />
                Descrição do Atendimento
              </label>
              
              <div 
                className="evolution-description-box"
                dangerouslySetInnerHTML={{ __html: evolution.description }}
              />
            </div>

            <div className="evolution-section">
              <label className="evolution-section-label">
                <ImageIcon size={15} />
                Anexos e Fotos Clínicas {hasAttachments ? `(${evolution.attachments?.length})` : ''}
              </label>

              {hasAttachments ? (
                <div className="attachments-grid">
                  {evolution.attachments?.map((url, idx) => {
                    const isPdf = checkIsPdf(url)

                    if (isPdf) {
                      return (
                        <div key={idx} className="attachment-pdf-card">
                          <div className="pdf-card-icon">
                            <FileText size={28} className="text-red-400" />
                            <span className="pdf-badge-tag">PDF</span>
                          </div>
                          <div className="pdf-card-actions">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pdf-btn-action"
                              title="Abrir Laudo"
                            >
                              <ExternalLink size={14} /> Abrir
                            </a>
                            <a
                              href={url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pdf-btn-action download"
                              title="Baixar PDF"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div 
                        key={idx} 
                        className="attachment-thumb-card" 
                        onClick={() => setSelectedImage(url)}
                        title="Clique para ampliar"
                      >
                        <img 
                          src={url} 
                          alt={`Anexo ${idx + 1}`} 
                          className="attachment-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>'
                          }} 
                        />
                        <div className="attachment-overlay">
                          <ZoomIn size={18} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="evolution-placeholder-box">
                  <p className="placeholder-text">✦ Nenhum anexo de foto/documento gravado nesta evolução.</p>
                </div>
              )}
            </div>

            <div className="evolution-section">
              <label className="evolution-section-label">
                Registro Anatômico do Atendimento (Odontograma)
              </label>

              {hasSnapshot ? (
                <div className="odontogram-readonly-box">
                  <Odontogram 
                    value={evolution.odontogramSnapshot} 
                    readOnly={true} 
                  />
                </div>
              ) : (
                <div className="evolution-placeholder-box">
                  <p className="placeholder-text">✦ Nenhum procedimento anatômico específico gravado nesta evolução.</p>
                </div>
              )}
            </div>

          </div>

          <div className="sheet-footer">
            <div className="evolution-integrity-badge">
              <ShieldCheck size={16} />
              <span>Registro clínico finalizado e protegido contra alterações.</span>
            </div>
          </div>

        </div>
      </div>

      {selectedImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setSelectedImage(null)}>
              <X size={22} />
            </button>
            <img src={selectedImage} alt="Foto Clínica Ampliada" className="lightbox-image" />
          </div>
        </div>
      )}
    </>
  )
}