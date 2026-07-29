import React, { useState, useEffect } from 'react'
import { Tooth, ToothFace, ToothFacesState } from './Tooth'
import { ToolBar, ActionType } from './ToolBar'
import './Odontogram.css'

export interface OdontogramData {
  [toothNumber: number]: {
    faces?: ToothFacesState
    isMissing?: boolean
  }
}

interface OdontogramProps {
  patientId?: string
  value?: OdontogramData // Permite passar estado inicial/externo (ex: snapshot)
  onChange?: (data: OdontogramData) => void // Notifica o pai quando houver alterações
  readOnly?: boolean // Desativa edições e oculta a ToolBar
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const Odontogram: React.FC<OdontogramProps> = ({
  patientId,
  value,
  onChange,
  readOnly = false,
}) => {
  const [activeAction, setActiveAction] = useState<ActionType>('carie')
  const [odontogramState, setOdontogramState] = useState<OdontogramData>(value || {})

  // Sincroniza estado interno caso uma prop `value` seja passada externamente
  useEffect(() => {
    if (value) {
      setOdontogramState(value)
    }
  }, [value])

  // Exemplo de busca na API se passar apenas o patientId sem um value estático
  useEffect(() => {
    if (patientId && !value) {
      // api.get(`/patients/${patientId}/odontogram`).then(res => setOdontogramState(res.data))
    }
  }, [patientId, value])

  // Helper centralizado para atualizar estado local e disparar onChange
  const updateState = (newState: OdontogramData) => {
    setOdontogramState(newState)
    if (onChange) {
      onChange(newState)
    }
  }

  const handleFaceClick = (toothNumber: number, face: ToothFace) => {
    if (readOnly) return

    const currentTooth = odontogramState[toothNumber] || {}
    const currentFaces = { ...(currentTooth.faces || {}) }

    // 1. Ferramenta "Ausente/Extraído": Alterna o estado do dente (Toggle)
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

    // 2. Ferramenta "Limpar Face": Remove a marcação da face e o status de ausente
    if (activeAction === 'clear') {
      delete currentFaces[face]

      const hasRemainingFaces = Object.keys(currentFaces).length > 0
      
      // Se não sobrou nenhuma face marcada e não está ausente, limpa a chave do dente
      if (!hasRemainingFaces) {
        const nextState = { ...odontogramState }
        delete nextState[toothNumber]
        updateState(nextState)
      } else {
        updateState({
          ...odontogramState,
          [toothNumber]: {
            faces: currentFaces,
            isMissing: false,
          },
        })
      }
      return
    }

    // 3. Aplica a ferramenta selecionada (Cárie, Restaurado, Canal, Prótese)
    updateState({
      ...odontogramState,
      [toothNumber]: {
        ...currentTooth,
        isMissing: false, // Se aplicou procedimento na face, remove a marcação de ausente
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

    // Ao clicar no número do dente com a borracha/limpar ativa: reseta o dente por completo
    if (activeAction === 'clear') {
      const nextState = { ...odontogramState }
      delete nextState[toothNumber]
      updateState(nextState)
      return
    }

    // Caso contrário, faz o toggle do estado isMissing (marcar/desmarcar ausência)
    updateState({
      ...odontogramState,
      [toothNumber]: {
        ...currentTooth,
        isMissing: !currentTooth.isMissing,
      },
    })
  }

  return (
    <div className={`odontogram-container ${readOnly ? 'is-readonly' : ''}`}>
      {/* Oculta a barra de ferramentas se for somente leitura */}
      {!readOnly && (
        <ToolBar activeAction={activeAction} onSelectAction={setActiveAction} />
      )}

      <div className="arch-section">
        <h4 className="arch-title">Arcada Superior</h4>
        <div className="teeth-row">
          {UPPER_TEETH.map((num) => (
            <Tooth
              key={num}
              number={num}
              faces={odontogramState[num]?.faces}
              isMissing={odontogramState[num]?.isMissing}
              readOnly={readOnly}
              onFaceClick={handleFaceClick}
              onToothClick={handleToothClick}
            />
          ))}
        </div>
      </div>

      <div className="arch-divider" />

      <div className="arch-section">
        <h4 className="arch-title">Arcada Inferior</h4>
        <div className="teeth-row">
          {LOWER_TEETH.map((num) => (
            <Tooth
              key={num}
              number={num}
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