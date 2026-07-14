// app/components/ModalContext.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import NovoAgendamentoModal from './NovoAgendamentoModal'
import { useRouter } from 'next/navigation'

interface ModalContextType {
  openNovoAgendamento: () => void
}

const ModalContext = createContext<ModalContextType>({
  openNovoAgendamento: () => {},
})

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <ModalContext.Provider value={{ openNovoAgendamento: () => setOpen(true) }}>
      {children}
      <NovoAgendamentoModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
        setOpen(false)
         window.location.reload() // ← força recarregar os dados da página atual
        }}
        
      />
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)