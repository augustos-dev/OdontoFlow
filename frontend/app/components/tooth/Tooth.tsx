import React from 'react'
import { getToothCategory, ToothCategory } from './teethAnatomy'
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
  position?: 'upper' | 'lower' | string
  faces?: ToothFacesState
  isMissing?: boolean
  readOnly?: boolean
  onFaceClick?: (toothNumber: number, face: ToothFace) => void
  onToothClick?: (toothNumber: number) => void
}

// Subcomponente com o traçado vetorizado real para cada anatomia
const RealisticToothRoot: React.FC<{ category: ToothCategory; isUpper: boolean }> = ({ category, isUpper }) => {
  const transform = isUpper ? '' : 'rotate(180)'

  return (
    <svg viewBox="0 0 40 50" width="34" height="42" className="tooth-root-svg" style={{ transform }}>
      <g stroke="#64748b" strokeWidth="1.5" fill="#ffffff" strokeLinecap="round" strokeLinejoin="round">
        {category === 'molar' && (
          /* Molar (3 raízes anatômicas) */
          <path d="M 6,42 C 4,30 2,18 8,4 C 12,18 16,32 20,4 C 24,32 28,18 32,4 C 38,18 36,30 34,42 Z" />
        )}
        {category === 'premolar' && (
          /* Pré-Molar (2 raízes anatômicas) */
          <path d="M 8,42 C 6,28 8,6 14,4 C 18,20 22,20 26,4 C 32,6 34,28 32,42 Z" />
        )}
        {category === 'canino' && (
          /* Canino (1 raiz longa e pontiaguda) */
          <path d="M 9,42 C 7,25 14,3 20,2 C 26,3 33,25 31,42 Z" />
        )}
        {category === 'incisivo' && (
          /* Incisivo (1 raiz reta/fina) */
          <path d="M 10,42 C 9,25 15,4 20,3 C 25,4 31,25 30,42 Z" />
        )}
      </g>
    </svg>
  )
}

export const Tooth: React.FC<ToothProps> = ({
  number,
  position = 'upper',
  faces = {},
  isMissing = false,
  readOnly = false,
  onFaceClick,
  onToothClick,
}) => {
  const category = getToothCategory(number)
  const isUpper = position === 'upper'

  const handleFaceClick = (e: React.MouseEvent, face: ToothFace) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly) return
    if (onFaceClick) onFaceClick(number, face)
  }

  const handleToothClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly) return
    if (onToothClick) onToothClick(number)
  }

  return (
    <div className={`tooth-wrapper ${position} ${isMissing ? 'is-missing' : ''}`}>
      {/* 1. Raiz Anatômica Real do Dente (Sempre aceita clique para toggle de ausência) */}
      <div className="tooth-root-container" onClick={handleToothClick}>
        {isMissing ? (
          <span className="missing-cross">✕</span>
        ) : (
          <RealisticToothRoot category={category} isUpper={isUpper} />
        )}
      </div>

      {/* 2. Círculo de Faces Anatômicas Arredondadas */}
      <div className="tooth-faces-circle">
        <svg viewBox="0 0 100 100" className="tooth-svg">
          {/* Topo / Vestibular */}
          <path
            d="M 15,15 A 48,48 0 0,1 85,15 L 70,30 A 28,28 0 0,0 30,30 Z"
            className={`face face-top ${faces.vestibular || ''}`}
            onClick={(e) => handleFaceClick(e, 'vestibular')}
          />
          {/* Direita / Distal */}
          <path
            d="M 85,15 A 48,48 0 0,1 85,85 L 70,70 A 28,28 0 0,0 70,30 Z"
            className={`face face-right ${faces.distal || ''}`}
            onClick={(e) => handleFaceClick(e, 'distal')}
          />
          {/* Baixo / Lingual */}
          <path
            d="M 85,85 A 48,48 0 0,1 15,85 L 30,70 A 28,28 0 0,0 70,70 Z"
            className={`face face-bottom ${faces.lingual || ''}`}
            onClick={(e) => handleFaceClick(e, 'lingual')}
          />
          {/* Esquerda / Mesial */}
          <path
            d="M 15,85 A 48,48 0 0,1 15,15 L 30,30 A 28,28 0 0,0 30,70 Z"
            className={`face face-left ${faces.mesial || ''}`}
            onClick={(e) => handleFaceClick(e, 'mesial')}
          />
          {/* Centro / Oclusal */}
          <circle
            cx="50"
            cy="50"
            r="20"
            className={`face face-center ${faces.oclusal || ''}`}
            onClick={(e) => handleFaceClick(e, 'oclusal')}
          />
        </svg>
      </div>
    </div>
  )
}