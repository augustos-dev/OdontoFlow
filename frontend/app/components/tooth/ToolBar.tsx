import React from 'react'

export type ActionType = 'carie' | 'restaurado' | 'canal' | 'protese' | 'missing' | 'clear'

interface ToolBarProps {
  activeAction: ActionType
  onSelectAction: (action: ActionType) => void
}

interface ActionConfig {
  id: ActionType
  label: string
  color: string
}

export const ToolBar: React.FC<ToolBarProps> = ({ activeAction, onSelectAction }) => {
  const actions: ActionConfig[] = [
    { id: 'carie', label: 'Cárie', color: '#ef4444' },         // Vermelho / Rosa
    { id: 'restaurado', label: 'Restaurado', color: '#3b82f6' }, // Azul
    { id: 'canal', label: 'Canal', color: '#a855f7' },      // Roxo
    { id: 'protese', label: 'Prótese/Coroa', color: '#f97316' }, // Laranja
    { id: 'missing', label: 'Ausente/Extraído', color: '#64748b' }, // Cinza
    { id: 'clear', label: 'Limpar Face', color: '#475569' },     // Cinza escuro
  ]

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      {actions.map((action) => {
        const isActive = activeAction === action.id

        return (
          <button
            key={action.id}
            type="button" // 👈 Impede o submit do formulário!
            onClick={(e) => {
              e.preventDefault()
              onSelectAction(action.id)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: isActive ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
            }}
          >
            {/* Bolinha de Cor da Ferramenta */}
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: action.color,
                display: 'inline-block',
              }}
            />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}