// ToolBar.tsx
import React from 'react'

export type ActionType = 'carie' | 'restaurado' | 'canal' | 'coroa' | 'missing' | 'clear'

interface ToolBarProps {
  activeAction: ActionType
  onSelectAction: (action: ActionType) => void
}

export const ToolBar: React.FC<ToolBarProps> = ({ activeAction, onSelectAction }) => {
  const tools = [
    { id: 'carie', label: 'Cárie', color: '#f38ba8' },
    { id: 'restaurado', label: 'Restaurado', color: '#89b4fa' },
    { id: 'canal', label: 'Canal', color: '#cba6f7' },
    { id: 'coroa', label: 'Prótese/Coroa', color: '#fab387' },
    { id: 'missing', label: 'Ausente/Extraído', color: '#6c7086' },
    { id: 'clear', label: 'Limpar Face', color: '#313244' },
  ]

  return (
    <div className="odontogram-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`toolbar-btn ${activeAction === tool.id ? 'active' : ''}`}
          onClick={() => onSelectAction(tool.id as ActionType)}
        >
          <span className="color-dot" style={{ backgroundColor: tool.color }} />
          {tool.label}
        </button>
      ))}
    </div>
  )
}