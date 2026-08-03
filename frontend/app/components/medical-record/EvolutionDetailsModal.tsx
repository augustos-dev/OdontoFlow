import React, { useState } from 'react'
import { Calendar, User, ShieldCheck, X, Image as ImageIcon, ZoomIn, FileText } from 'lucide-react'
import { Odontogram, OdontogramData } from '../tooth/Odontogram'
import './EvolutionDetailsModal.css'

interface Evolution {
  id?: string
  type?: string
  createdAt: string | Date
  title?: string
  dentistName?: string
  description: string
  odontogramSnapshot?: OdontogramData
  attachments?: string[] // 📸 Array de URLs/caminhos das fotos
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

  return (
    <>
      <div className="sheet-backdrop" onClick={handleBackdropClick}>
        <div className="sheet-container">
          
          {/* Cabeçalho Fixo */}
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

          {/* Corpo da Drawer com Scroll */}
          <div className="sheet-body">
            
            {/* Info do Profissional */}
            <div className="evolution-doctor-info">
              <User size={15} className="doctor-icon" />
              <span>
                Registrado por: <strong>{evolution.dentistName || 'Dr. Vicente'}</strong>
              </span>
            </div>

            {/* 📝 DESCRITION GROUP (Suporta HTML/Rich Text e texto simples) */}
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

            {/* 📸 ANEXOS E FOTOS CLÍNICAS */}
            <div className="evolution-section">
              <label className="evolution-section-label">
                <ImageIcon size={15} />
                Anexos e Fotos Clínicas {hasAttachments ? `(${evolution.attachments?.length})` : ''}
              </label>

              {hasAttachments ? (
                <div className="attachments-grid">
                  {evolution.attachments?.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="attachment-thumb-card" 
                      onClick={() => setSelectedImage(url)}
                      title="Clique para ampliar"
                    >
                      <img src={url} alt={`Anexo ${idx + 1}`} className="attachment-img" />
                      <div className="attachment-overlay">
                        <ZoomIn size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="evolution-placeholder-box">
                  <p className="placeholder-text">✦ Nenhum anexo de foto gravado nesta evolução.</p>
                </div>
              )}
            </div>

            {/* 🎯 ODONTOGRAMA READ-ONLY (SNAPSHOT) */}
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

          {/* Rodapé Fixo */}
          <div className="sheet-footer">
            <div className="evolution-integrity-badge">
              <ShieldCheck size={16} />
              <span>Registro clínico finalizado e protegido contra alterações.</span>
            </div>
          </div>

        </div>
      </div>

      {/* 🔍 LIGHTBOX DE AMPLIAÇÃO DA IMAGEM */}
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