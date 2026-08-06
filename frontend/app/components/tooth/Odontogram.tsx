import React, { useState, useEffect } from 'react'
import api from '../../../lib/api'
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
  const [loading, setLoading] = useState<boolean>(false)

  // 🎯 1. Atualiza estado se a prop `value` mudar externamente (ex: Modais)
  useEffect(() => {
    if (value) {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      setOdontogramState(parsed || {})
    }
  }, [value])

  // 🎯 2. CRUCIAL: Busca o estado acumulado atual do Odontograma do paciente via API
  useEffect(() => {
    if (value || !patientId) return

    async function fetchPatientOdontogram() {
      try {
        setLoading(true)
        const { data } = await api.get(`/patients/${patientId}`)
        
        // Puxa o odontograma do paciente (ou do prontuário se estiver lá)
        const rawData = data?.odontogram || data?.medicalRecord?.odontogram || {}
        const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData

        setOdontogramState(parsedData || {})
      } catch (err) {
        console.error('Erro ao carregar odontograma do paciente:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatientOdontogram()
  }, [patientId, value])

  const updateState = async (newState: OdontogramData) => {
    setOdontogramState(newState)
    if (onChange) onChange(newState)

    // Se estiver no modo interativo e tiver patientId, persiste o estado no paciente
    if (!readOnly && patientId) {
      try {
        await api.put(`/patients/${patientId}`, { odontogram: newState })
      } catch (err) {
        console.error('Erro ao salvar atualização do Odontograma:', err)
      }
    }
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

  if (loading) {
    return <div className="odontogram-card"><p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Carregando mapa bucal do paciente...</p></div>
  }

  return (
    <div className={`odontogram-card ${readOnly ? 'is-readonly' : ''}`}>
      {/* Header com os seletores de Arcada e Legenda */}
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

        {/* Números Centrais */}
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