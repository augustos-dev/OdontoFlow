// app/components/ModalContext.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import NovoAgendamentoModal from './NovoAgendamentoModal'

interface ModalContextType {
  openNovoAgendamento: () => void
}

const ModalContext = createContext<ModalContextType>({
  openNovoAgendamento: () => {},
})

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <ModalContext.Provider value={{ openNovoAgendamento: () => setOpen(true) }}>
      {children}
      <NovoAgendamentoModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)