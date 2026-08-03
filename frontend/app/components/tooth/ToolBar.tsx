import React from 'react'

export type ActionType = 'carie' | 'restaurado' | 'canal' | 'protese' | 'missing' | 'clear'

interface ToolBarProps {
  activeAction: ActionType
  onSelectAction: (action: ActionType) => void
}

interface ActionConfig {
  id: ActionType
  label: string
  color?: string
  icon?: React.ReactNode
}

export const ToolBar: React.FC<ToolBarProps> = ({ activeAction, onSelectAction }) => {
  const actions: ActionConfig[] = [
    { id: 'carie', label: 'Cárie', color: '#ef4444' },         // Vermelho
    { id: 'restaurado', label: 'Restaurado', color: '#22c55e' }, // Verde (Finalizado)
    { id: 'canal', label: 'Canal', color: '#a855f7' },        // Roxo
    { id: 'protese', label: 'Prótese/Coroa', color: '#f97316' }, // Laranja
    { 
      id: 'missing', 
      label: 'Ausente/Extraído', 
      icon: <span className="icon-x-dot">✕</span> 
    },
    { 
      id: 'clear', 
      label: 'Limpar Face', 
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
          <line x1="18" y1="9" x2="12" y2="15" />
          <line x1="12" y1="9" x2="18" y2="15" />
        </svg>
      )
    },
  ]

  return (
    <div className="odontogram-toolbar">
      {actions.map((action) => {
        const isActive = activeAction === action.id

        return (
          <button
            key={action.id}
            type="button"
            className={`toolbar-btn ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              onSelectAction(action.id)
            }}
          >
            {/* Exibe o Ícone customizado ou o Dot de Cor da Ferramenta */}
            {action.icon ? (
              action.icon
            ) : (
              <span
                className="color-dot"
                style={{ backgroundColor: action.color }}
              />
            )}
            {action.label}
          </button>
        )
      })}
    </div>
  )
}