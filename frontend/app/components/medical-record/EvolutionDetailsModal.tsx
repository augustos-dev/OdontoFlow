'use client'

import React, { useState } from 'react'
import { 
  Calendar, 
  User, 
  ShieldCheck, 
  X, 
  Image as ImageIcon, 
  ZoomIn, 
  FileText, 
  Download, 
  ExternalLink,
  Boxes,
  Edit2,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import api from '../../../lib/api'
import { Odontogram } from '../tooth/Odontogram'
import './EvolutionDetailsModal.css'

export interface ProcedureInfo {
  id: string
  name: string
  code?: string
}

export interface Evolution {
  id?: string
  medicalRecordId?: string
  dentistName?: string
  dentist?: { name: string }
  type?: string
  title?: string
  description: string
  procedureId?: string
  procedure?: ProcedureInfo
  isLocked?: boolean
  odontogramSnapshot?: any
  attachments?: string[]
  createdAt: string | Date
}

interface EvolutionDetailsModalProps {
  evolution: Evolution | null
  onClose: () => void
  onSuccess?: () => void
}

export function EvolutionDetailsModal({ evolution, onClose, onSuccess }: EvolutionDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // Estados para Edição LGPD / CFO
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [editReason, setEditReason] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  if (!evolution) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const hasSnapshot = evolution.odontogramSnapshot && Object.keys(evolution.odontogramSnapshot).length > 0
  const hasAttachments = evolution.attachments && evolution.attachments.length > 0
  const checkIsPdf = (url: string) => url.toLowerCase().includes('.pdf')

  // 🟢 NOVA LÓGICA RIGOROSA DE TRAVA (CFO / LGPD)
  const checkIsLocked = (): boolean => {
    // 1. Se a flag de bloqueio explícito no banco for verdadeira
    if (evolution.isLocked) return true

    // 2. Trava por janela de tempo (Tolerância legal de 24 horas da criação)
    if (evolution.createdAt) {
      const createdDate = new Date(evolution.createdAt).getTime()
      const now = new Date().getTime()
      const hoursDifference = (now - createdDate) / (1000 * 60 * 60)

      if (hoursDifference > 24) {
        return true // Já passaram mais de 24h -> Trancado automaticamente
      }
    }

    return false
  }

  const isLockedByPolicy = checkIsLocked()

  const handleStartEdit = () => {
    if (isLockedByPolicy) {
      alert('🔒 Ação Bloqueada: Esta evolução médica ultrapassou a janela legal de retificação de 24 horas (Norma CFO / LGPD) e está trancada inalteravelmente.')
      return
    }
    setEditedDescription(evolution.description)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editedDescription.trim()) {
      alert('A descrição não pode ficar vazia.')
      return
    }

    if (!editReason.trim()) {
      alert('Por exigência LGPD/CFO, informe a justificativa clínica para a retificação do prontuário.')
      return
    }

    setSavingEdit(true)
    try {
      await api.put(`/medical-records/evolutions/${evolution.id}`, {
        description: editedDescription,
        reason: editReason,
      })

      setIsEditing(false)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao atualizar evolução:', err)
      alert(err.response?.data?.message || 'Erro ao retificar registro clínico.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={handleBackdropClick}>
        <div className="sheet-container">
          
          <div className="sheet-header">
            <div>
              <div className="sheet-meta">
                <span className="evolution-badge">{evolution.type || 'Anotação Clínica'}</span>
                
                {/* 🟢 Status na barra do topo atualizado dinamicamente */}
                {isLockedByPolicy ? (
                  <span className="lock-badge locked" title="Registro inalterável conforme LGPD e Resolução CFO">
                    <Lock size={12} /> Assinado & Trancado (LGPD/CFO)
                  </span>
                ) : (
                  <span className="lock-badge unlocked" title="Janela de retificação aberta (até 24h)">
                    <CheckCircle2 size={12} /> Aberto para Edição (24h)
                  </span>
                )}

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isEditing && !isLockedByPolicy && (
                <button 
                  className="sheet-edit-btn" 
                  onClick={handleStartEdit}
                  title="Retificar Evolução (LGPD / CFO)"
                >
                  <Edit2 size={15} />
                  <span>Editar</span>
                </button>
              )}

              <button className="sheet-close-btn" onClick={onClose} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="sheet-body">
            
            {/* Medico / Responsável */}
            <div className="evolution-doctor-info">
              <User size={15} className="doctor-icon" />
              <span>
                Registrado por: <strong>{evolution.dentistName || evolution.dentist?.name || 'Dr. Vicente Augusto'}</strong>
              </span>
            </div>

            {/* Procedimento Realizado & Exit Inteligente */}
            {evolution.procedure && (
              <div className="evolution-procedure-card">
                <div className="proc-card-icon">
                  <Boxes size={20} color="#38bdf8" />
                </div>
                <div className="proc-card-content">
                  <span className="proc-card-label">PROCEDIMENTO REALIZADO (EXIT INTELIGENTE)</span>
                  <p className="proc-card-title">
                    {evolution.procedure.name} {evolution.procedure.code ? `(${evolution.procedure.code})` : ''}
                  </p>
                  <span className="proc-card-sub">
                    ✦ Insumos da Ficha Técnica foram abatidos do estoque na criação do registro.
                  </span>
                </div>
              </div>
            )}

            {/* Descrição do Atendimento ou Edição */}
            <div className="evolution-section">
              <label className="evolution-section-label">
                <FileText size={15} />
                Descrição do Atendimento
              </label>

              {!isEditing ? (
                <div 
                  className="evolution-description-box"
                  dangerouslySetInnerHTML={{ __html: evolution.description }}
                />
              ) : (
                <div className="edit-evolution-wrapper">
                  <textarea
                    className="edit-description-textarea"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={6}
                  />

                  <div className="lgpd-reason-box">
                    <label className="lgpd-reason-label">
                      <AlertCircle size={14} color="#f59e0b" />
                      Justificativa Obrigatória da Retificação (CFO / LGPD) *
                    </label>
                    <input
                      type="text"
                      className="lgpd-reason-input"
                      placeholder="Ex: Correção de digitação de dosagem / Inclusão de observação médica"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                    />
                  </div>

                  <div className="edit-actions-row">
                    <button 
                      type="button" 
                      className="btn-cancel-edit" 
                      onClick={() => setIsEditing(false)}
                      disabled={savingEdit}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      className="btn-save-edit" 
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Salvando...' : 'Salvar Retificação Auditorada'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Anexos e Fotos */}
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

            {/* Odontograma Read-Only */}
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
              <span>Registro clínico protegido e auditado em conformidade com as normas CFO e LGPD.</span>
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