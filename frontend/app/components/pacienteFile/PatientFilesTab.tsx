'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { PdfCanvasThumbnail } from './ThumbnailCanvas'
import './PatientFilesTab.css'

export interface PatientFile {
  id: string
  name: string
  url: string
  size?: string
  createdAt: string // Deve ser uma string ISO no formato "YYYY-MM-DDTHH:mm:ss.sssZ" ou timestamp
  type?: 'image' | 'pdf' | 'other'
}

interface PatientFilesTabProps {
  files?: PatientFile[]
  patientId?: string
  onUploadNewFile: (files: FileList) => void
  onDeleteFile?: (fileIds: string[]) => void
}

function formatFileName(fileName: string): string {
  if (!fileName) return 'Arquivo sem nome'
  const uuidOrHashRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[-_]?/i
  const longHashRegex = /^[a-f0-9]{20,}[-_]?/i

  let cleaned = fileName.replace(uuidOrHashRegex, '').replace(longHashRegex, '')
  if (!cleaned || cleaned.startsWith('.')) return fileName
  return cleaned
}

/**
  Valida se o arquivo foi criado há menos de 24 horas
 */
function isWithin24Hours(createdAtStr?: string): boolean {
  if (!createdAtStr) return true // Se não houver data, permite por padrão no MVP
  const createdAt = new Date(createdAtStr).getTime()
  if (isNaN(createdAt)) return true

  const now = new Date().getTime()
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000

  return now - createdAt <= twentyFourHoursInMs
}

export function PatientFilesTab({ files = [], patientId, onUploadNewFile, onDeleteFile }: PatientFilesTabProps) {
  const [localFiles, setLocalFiles] = useState<PatientFile[]>(files)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sincroniza localFiles quando as props externas mudarem
  useEffect(() => {
    setLocalFiles(files)
  }, [files])

  // Filtra os arquivos locais pelo termo de busca
  const filteredFiles = useMemo(() => {
    if (!Array.isArray(localFiles)) return []
    return localFiles.filter((file) => {
      if (!file || !file.name) return false
      const displayName = formatFileName(file.name)
      return (
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [localFiles, searchTerm])

  // Verifica se TODOS os selecionados estão dentro do limite de 24 horas
  const selectedAreDeletable = useMemo(() => {
    if (selectedFileIds.length === 0) return false
    return selectedFileIds.every((id) => {
      const file = localFiles.find((f) => f.id === id)
      return file ? isWithin24Hours(file.createdAt) : false
    })
  }, [selectedFileIds, localFiles])

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(filteredFiles.map((f) => f.id))
    }
    setSelectAll(!selectAll)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // DELEÇÃO NO BACKEND COM TRAVA DE 24 HORAS
  const handleDeleteSelected = async () => {
    if (selectedFileIds.length === 0) return

    // Trava de segurança no frontend
    if (!selectedAreDeletable) {
      alert('Atenção: Alguns arquivos selecionados têm mais de 24 horas de envio e não podem mais ser excluídos.')
      return
    }

    if (window.confirm(`Tem certeza que deseja excluir ${selectedFileIds.length} arquivo(s) permanentemente do banco de dados?`)) {
      setIsDeleting(true)

      try {
        // Chamada de API para o Backend (Next.js App Router API Route)
        const response = await fetch('/api/patients/files/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileIds: selectedFileIds,
            patientId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Falha ao excluir arquivos do banco.')
        }

        // Remoção otimista do estado visual após resposta do banco
        setLocalFiles((prev) => prev.filter((file) => !selectedFileIds.includes(file.id)))
        
        if (onDeleteFile) {
          onDeleteFile(selectedFileIds)
        }

        setSelectedFileIds([])
        setSelectAll(false)
      } catch (error: any) {
        console.error('Erro na deleção de arquivos:', error)
        alert(error.message || 'Erro ao tentar deletar os arquivos. Tente novamente.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadNewFile(e.target.files)
    }
  }

  const checkIsPdf = (file: PatientFile) => {
    if (file.type === 'pdf') return true
    const urlLower = file.url?.toLowerCase() || ''
    const nameLower = file.name?.toLowerCase() || ''
    return urlLower.includes('.pdf') || nameLower.endsWith('.pdf')
  }

  return (
    <div className="files-tab-container">
      {/* Header com busca e botão (+) */}
      <div className="files-tab-header">
        <h2 className="files-tab-title">Arquivos do Paciente</h2>

        <div className="files-tab-actions">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <label className="btn-upload" title="Adicionar novo arquivo">
            <svg viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <input
              type="file"
              multiple
              className="hidden-file-input"
              onChange={handleFileInputChange}
              accept="image/*,application/pdf"
            />
          </label>
        </div>
      </div>

      {/* Control Bar com Ação de Excluir */}
      <div className="files-control-bar">
        <div className="control-bar-left">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleToggleSelectAll}
              className="checkbox-input"
            />
            <span>Selecionar todos</span>
          </label>

          {selectedFileIds.length > 0 && (
            <span className="selected-count">
              {selectedFileIds.length} arquivo(s) selecionado(s)
            </span>
          )}
        </div>

        {/* Botão de Excluir */}
        {selectedFileIds.length > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedAreDeletable || isDeleting}
            className={`btn-delete-selected ${!selectedAreDeletable ? 'disabled' : ''}`}
            title={
              !selectedAreDeletable
                ? 'Arquivos com mais de 24 horas não podem ser excluídos'
                : 'Excluir do banco de dados'
            }
          >
            <svg viewBox="0 0 24 24" className="btn-delete-icon">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>
              {isDeleting
                ? 'Excluindo...'
                : !selectedAreDeletable
                ? 'Exclusão expirada (>24h)'
                : `Excluir selecionados (${selectedFileIds.length})`}
            </span>
          </button>
        )}
      </div>

      {/* Grid de Arquivos */}
      {filteredFiles.length > 0 ? (
        <div className="files-grid">
          {filteredFiles.map((file) => {
            const isSelected = selectedFileIds.includes(file.id)
            const isPdf = checkIsPdf(file)
            const displayName = formatFileName(file.name)
            const canBeDeleted = isWithin24Hours(file.createdAt)

            return (
              <div
                key={file.id}
                className={`file-card ${isSelected ? 'selected' : ''}`}
              >
                {/* Checkbox Individual */}
                <div className="card-checkbox-container">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(file.id)}
                    className="checkbox-input"
                  />
                </div>

                {/* Badge de Expiração / Trava se passou de 24h */}
                {!canBeDeleted && (
                  <span
                    className="lock-badge"
                    title="Este arquivo tem mais de 24 horas e não pode ser removido."
                  >
                    🔒 +24h
                  </span>
                )}

                {/* Preview */}
                <div
                  className="file-preview"
                  onClick={() => {
                    if (isPdf) {
                      window.open(file.url, '_blank')
                    } else if (file.url) {
                      setPreviewUrl(file.url)
                    }
                  }}
                >
                  {isPdf ? (
                    <div className="pdf-preview-box overflow-hidden flex items-center justify-center w-full h-full">
                      <PdfCanvasThumbnail url={file.url} />
                    </div>
                  ) : (
                    <img
                      src={file.url}
                      alt={displayName}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>'
                      }}
                    />
                  )}

                  {/* Overlay de Ações no Hover */}
                  <div className="file-overlay">
                    <button
                      type="button"
                      className="overlay-btn"
                      title={isPdf ? 'Abrir PDF' : 'Visualizar'}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isPdf) {
                          window.open(file.url, '_blank')
                        } else {
                          setPreviewUrl(file.url)
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <a
                      href={file.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="overlay-btn"
                      title="Baixar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="file-info">
                  <p className="file-name" title={displayName}>
                    {displayName}
                  </p>
                  {file.size && <span className="file-size">{file.size}</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="files-empty-state">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>Nenhum arquivo encontrado.</p>
        </div>
      )}

      {/* Lightbox Modal para Imagens */}
      {previewUrl && (
        <div className="lightbox-backdrop" onClick={() => setPreviewUrl(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Ampliado" />
          </div>
        </div>
      )}
    </div>
  )
}