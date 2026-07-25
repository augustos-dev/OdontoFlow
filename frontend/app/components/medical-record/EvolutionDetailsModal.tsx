import React from 'react'
import { Calendar, User, ShieldCheck, X } from 'lucide-react'
import { Odontogram, OdontogramData } from '../tooth/Odontogram' // 🦷 Import do Odontograma e Tipagem
import './EvolutionDetailsModal.css'

interface Evolution {
  type?: string
  createdAt: string | Date
  title?: string
  dentistName?: string
  description: string
  odontogramSnapshot?: OdontogramData // 📸 Snapshot congelado do Odontograma
}

interface EvolutionDetailsModalProps {
  evolution: Evolution | null
  onClose: () => void
}

export function EvolutionDetailsModal({ evolution, onClose }: EvolutionDetailsModalProps) {
  if (!evolution) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const hasSnapshot = evolution.odontogramSnapshot && Object.keys(evolution.odontogramSnapshot).length > 0

  return (
    <div className="sheet-backdrop" onClick={handleBackdropClick}>
      <div className="sheet-container">
        {/* Cabeçalho */}
        <div className="sheet-header">
          <div>
            <div className="sheet-meta">
              <span className="evolution-badge">{evolution.type || 'Anotação Clínica'}</span>
              <span className="evolution-date">
                <Calendar size={12} />
                {new Date(evolution.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <h2 className="sheet-title">{evolution.title || 'Evolução Clínica'}</h2>
          </div>

          <button className="sheet-close-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Scroll limpo */}
        <div className="sheet-body">
          {/* Info do Dentista */}
          <div className="evolution-doctor-info">
            <User size={16} className="doctor-icon" />
            <span>Registrado por: <strong>{evolution.dentistName || 'Dr. Vicente'}</strong></span>
          </div>

          {/* 🎯 ÁREA DO ODONTOGRAMA (READ-ONLY) */}
          <div className="evolution-odontogram-section" style={{ margin: '1.25rem 0' }}>
            <label className="evolution-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Registro Anatômico do Atendimento
            </label>
            
            {hasSnapshot ? (
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <Odontogram 
                  value={evolution.odontogramSnapshot} 
                  readOnly={true} 
                />
              </div>
            ) : (
              <div className="odontogram-preview-placeholder">
                <p className="placeholder-text">✦ Nenhum procedimento anatômico específico gravado nesta evolução.</p>
              </div>
            )}
          </div>

          {/* Descrição do Atendimento */}
          <div className="evolution-description-group">
            <label className="evolution-label">Descrição do Atendimento</label>
            <div className="evolution-description-box">
              {evolution.description}
            </div>
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
  )
}