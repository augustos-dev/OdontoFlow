import React from 'react'
import './Tooth.css'

export type ToothFace = 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal'

export interface ToothFacesState {
  vestibular?: string
  lingual?: string
  mesial?: string
  distal?: string
  oclusal?: string
}

interface ToothProps {
  number: number
  faces?: ToothFacesState
  isMissing?: boolean
  readOnly?: boolean
  onFaceClick?: (toothNumber: number, face: ToothFace) => void
  onToothClick?: (toothNumber: number) => void
}

export const Tooth: React.FC<ToothProps> = ({
  number,
  faces = {},
  isMissing = false,
  readOnly = false,
  onFaceClick,
  onToothClick,
}) => {
  const handleFaceClick = (e: React.MouseEvent, face: ToothFace) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly) return 
    if (onFaceClick) onFaceClick(number, face)
  }

  // Função para tratar clique direto no dente (número ou quando estiver com o X de ausente)
  const handleWrapperClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (readOnly) return
    if (onToothClick) onToothClick(number)
  }

  return (
    <div 
      className={`tooth-wrapper ${isMissing ? 'missing' : ''}`}
      onClick={handleWrapperClick} // 👈 Se clicar no dente (inclusive quando tiver o X), chama o onToothClick!
    >
      {/* Rótulo com o Número Notação FDI */}
      <span className="tooth-number">
        {number}
      </span>

      {/* Representação Gráfica das 5 Faces em SVG */}
      <div className="tooth-svg-container">
        <svg viewBox="0 0 100 100" className="tooth-svg">
          {/* Topo / Vestibular */}
          <polygon
            points="0,0 100,0 75,25 25,25"
            className={`face face-top ${faces.vestibular || ''}`}
            onClick={(e) => handleFaceClick(e, 'vestibular')}
          />

          {/* Direita / Distal */}
          <polygon
            points="100,0 100,100 75,75 75,25"
            className={`face face-right ${faces.distal || ''}`}
            onClick={(e) => handleFaceClick(e, 'distal')}
          />

          {/* Baixo / Lingual */}
          <polygon
            points="0,100 100,100 75,75 25,75"
            className={`face face-bottom ${faces.lingual || ''}`}
            onClick={(e) => handleFaceClick(e, 'lingual')}
          />

          {/* Esquerda / Mesial */}
          <polygon
            points="0,0 25,25 25,75 0,100"
            className={`face face-left ${faces.mesial || ''}`}
            onClick={(e) => handleFaceClick(e, 'mesial')}
          />

          {/* Centro / Oclusal */}
          <polygon
            points="25,25 75,25 75,75 25,75"
            className={`face face-center ${faces.oclusal || ''}`}
            onClick={(e) => handleFaceClick(e, 'oclusal')}
          />
        </svg>

        {/* Indicador em X caso o dente tenha sido extraído */}
        {isMissing && <div className="missing-cross">✕</div>}
      </div>
    </div>
  )
}