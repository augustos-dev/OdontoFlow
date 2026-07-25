import React from 'react'
import './Tooth.css'

export type ToothFace = 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal'

export interface ToothFacesState {
  vestibular?: string // Ex: 'carie' (red), 'restaurado' (blue)
  lingual?: string
  mesial?: string
  distal?: string
  oclusal?: string
}

interface ToothProps {
  number: number
  faces?: ToothFacesState
  isMissing?: boolean
  readOnly?: boolean // 👈 Nova prop
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
    e.stopPropagation()
    // Se estiver em modo somente leitura, ignora o clique
    if (readOnly) return 
    if (onFaceClick) onFaceClick(number, face)
  }

  return (
    <div className={`tooth-wrapper ${isMissing ? 'missing' : ''}`}>
      {/* Rótulo com o Número Notação FDI */}
      <span className="tooth-number" onClick={() => onToothClick && onToothClick(number)}>
        {number}
      </span>

      {/* Representação Gráfica das 5 Faces em SVG */}
      <div className="tooth-svg-container">
        <svg viewBox="0 0 100 100" className="tooth-svg">
          {/* Topo / Vestibular (Superior) ou Lingual (Inferior) */}
          <polygon
            points="0,0 100,0 75,25 25,25"
            className={`face face-top ${faces.vestibular || ''}`}
            onClick={(e) => handleFaceClick(e, 'vestibular')}
          />

          {/* Direita / Distal ou Mesial */}
          <polygon
            points="100,0 100,100 75,75 75,25"
            className={`face face-right ${faces.distal || ''}`}
            onClick={(e) => handleFaceClick(e, 'distal')}
          />

          {/* Baixo / Lingual ou Vestibular */}
          <polygon
            points="0,100 100,100 75,75 25,75"
            className={`face face-bottom ${faces.lingual || ''}`}
            onClick={(e) => handleFaceClick(e, 'lingual')}
          />

          {/* Esquerda / Mesial ou Distal */}
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