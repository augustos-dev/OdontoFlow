'use client'

import React, { useState, useMemo } from 'react'
import './PatientFilesTab.css' // Importa os estilos CSS puros

export interface PatientFile {
  id: string
  name: string
  url: string
  size?: string
  createdAt?: string
  type: 'image' | 'pdf' | 'other'
}

interface PatientFilesTabProps {
  files?: PatientFile[] // Torna opcional para evitar crash
  onUploadNewFile: (files: FileList) => void
  onDeleteFile?: (fileId: string) => void
}

export function PatientFilesTab({ files = [], onUploadNewFile }: PatientFilesTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 🔴 LOG DE DIAGNÓSTICO: Abra o Console (F12) para checar o que está chegando aqui!
  console.log('📸 [PatientFilesTab] Arquivos recebidos na prop:', files)

  // Filtra arquivos por nome em tempo real (garante que files é um Array)
  const filteredFiles = useMemo(() => {
    if (!Array.isArray(files)) return []
    return files.filter((file) =>
      file && file.name && file.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [files, searchTerm])

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadNewFile(e.target.files)
    }
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

      {/* Control Bar */}
      <div className="files-control-bar">
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

      {/* Grid de Arquivos */}
      {filteredFiles.length > 0 ? (
        <div className="files-grid">
          {filteredFiles.map((file) => {
            const isSelected = selectedFileIds.includes(file.id)

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

                {/* Preview com Hover Actions */}
                <div
                  className="file-preview"
                  onClick={() => file.url && setPreviewUrl(file.url)}
                    >
                        <img
                            src={file.url}
                            alt={file.name}
                            onError={(e) => {
                                // Evita loop infinito desativando o próprio onError
                                e.currentTarget.onerror = null
                                // Fallback usando SVG base64 local (nunca vai dar erro de rede)
                                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>'
                            }}
                        />

                  <div className="file-overlay">
                    <button
                      type="button"
                      className="overlay-btn"
                      title="Visualizar"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewUrl(file.url)
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
                  <p className="file-name" title={file.name}>
                    {file.name}
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

      {/* Lightbox Modal */}
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