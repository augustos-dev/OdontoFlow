import React, { useState, useEffect } from 'react'
import { Tooth, ToothFace, ToothFacesState } from './Tooth'
import { ToolBar, ActionType } from './ToolBar'
import './Odontogram.css'

export interface OdontogramData {
  [toothNumber: number]: {
    faces?: ToothFacesState
    isMissing?: boolean
    status?: 'EM_ABERTO' | 'FINALIZADO'
  }
}

interface OdontogramProps {
  patientId?: string
  value?: OdontogramData
  onChange?: (data: OdontogramData) => void
  readOnly?: boolean
}

// Arcada Permanente
const UPPER_PERMANENT = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_PERMANENT = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

// Arcada Decídua (Infantil)
const UPPER_DECIDUOUS = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const LOWER_DECIDUOUS = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

export const Odontogram: React.FC<OdontogramProps> = ({
  patientId,
  value,
  onChange,
  readOnly = false,
}) => {
  const [archType, setArchType] = useState<'permanentes' | 'deciduos'>('permanentes')
  const [activeAction, setActiveAction] = useState<ActionType>('carie')
  const [odontogramState, setOdontogramState] = useState<OdontogramData>(value || {})

  useEffect(() => {
    if (value) setOdontogramState(value)
  }, [value])

  const updateState = (newState: OdontogramData) => {
    setOdontogramState(newState)
    if (onChange) onChange(newState)
  }

  const handleFaceClick = (toothNumber: number, face: ToothFace) => {
    if (readOnly) return

    const currentTooth = odontogramState[toothNumber] || {}
    const currentFaces = { ...(currentTooth.faces || {}) }

    if (activeAction === 'missing') {
      updateState({
        ...odontogramState,
        [toothNumber]: {
          ...currentTooth,
          isMissing: !currentTooth.isMissing,
        },
      })
      return
    }

    if (activeAction === 'clear') {
      delete currentFaces[face]
      const hasRemainingFaces = Object.keys(currentFaces).length > 0
      
      if (!hasRemainingFaces && !currentTooth.isMissing) {
        const nextState = { ...odontogramState }
        delete nextState[toothNumber]
        updateState(nextState)
      } else {
        updateState({
          ...odontogramState,
          [toothNumber]: {
            ...currentTooth,
            faces: currentFaces,
          },
        })
      }
      return
    }

    updateState({
      ...odontogramState,
      [toothNumber]: {
        ...currentTooth,
        isMissing: false,
        faces: {
          ...currentFaces,
          [face]: activeAction,
        },
      },
    })
  }

  const handleToothClick = (toothNumber: number) => {
    if (readOnly) return

    const currentTooth = odontogramState[toothNumber] || {}

    if (activeAction === 'clear') {
      const nextState = { ...odontogramState }
      delete nextState[toothNumber]
      updateState(nextState)
      return
    }

    updateState({
      ...odontogramState,
      [toothNumber]: {
        ...currentTooth,
        isMissing: !currentTooth.isMissing,
      },
    })
  }

  const upperTeeth = archType === 'permanentes' ? UPPER_PERMANENT : UPPER_DECIDUOUS
  const lowerTeeth = archType === 'permanentes' ? LOWER_PERMANENT : LOWER_DECIDUOUS

  return (
    <div className={`odontogram-card ${readOnly ? 'is-readonly' : ''}`}>
      {/* Header com os seletores de Arcada e Legenda estilo Codental */}
      <div className="odontogram-header">
        <div className="arch-toggle-group">
          <button
            type="button"
            className={`toggle-btn ${archType === 'permanentes' ? 'active' : ''}`}
            onClick={() => setArchType('permanentes')}
          >
            Permanentes
          </button>
          <button
            type="button"
            className={`toggle-btn ${archType === 'deciduos' ? 'active' : ''}`}
            onClick={() => setArchType('deciduos')}
          >
            Decíduos
          </button>
        </div>

        <div className="odontogram-legend">
          <span className="legend-item">
            <span className="dot finalizado"></span> Finalizado
          </span>
          <span className="legend-item">
            <span className="dot em-aberto"></span> Em aberto
          </span>
          <span className="legend-item">
            <span className="icon-x">✕</span> Ausente
          </span>
        </div>
      </div>

      {!readOnly && (
        <ToolBar activeAction={activeAction} onSelectAction={setActiveAction} />
      )}

      {/* Grid Central do Odontograma */}
      <div className="odontogram-viewport">
        <div className="quadrant-line-vertical" />

        {/* Dentes Superiores */}
        <div className="teeth-row upper-row">
          {upperTeeth.map((num) => (
            <Tooth
              key={num}
              number={num}
              position="upper"
              faces={odontogramState[num]?.faces}
              isMissing={odontogramState[num]?.isMissing}
              readOnly={readOnly}
              onFaceClick={handleFaceClick}
              onToothClick={handleToothClick}
            />
          ))}
        </div>

        {/* Números Centrais (Estilo Codental) */}
        <div className="numbers-strip">
          <div className="numbers-row upper-numbers">
            {upperTeeth.map((num) => (
              <span key={num} className="tooth-num">{num}</span>
            ))}
          </div>
          <div className="numbers-row lower-numbers">
            {lowerTeeth.map((num) => (
              <span key={num} className="tooth-num">{num}</span>
            ))}
          </div>
        </div>

        {/* Dentes Inferiores */}
        <div className="teeth-row lower-row">
          {lowerTeeth.map((num) => (
            <Tooth
              key={num}
              number={num}
              position="lower"
              faces={odontogramState[num]?.faces}
              isMissing={odontogramState[num]?.isMissing}
              readOnly={readOnly}
              onFaceClick={handleFaceClick}
              onToothClick={handleToothClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}