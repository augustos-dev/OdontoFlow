'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { DashboardAdmin } from '@/app/components/dashboard/DashboardAdmin'
import { DashboardRecepcao } from '@/app/components/dashboard/DashboardRecepcao'

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUserRole() {
      try {
        // Tenta obter o perfil direto da API ou do token armazenado
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('@odontoflow:token') : null
        
        if (token) {
          try {
            // Decodificação rápida de payload JWT caso não queira fazer request extra
            const payloadBase64 = token.split('.')[1]
            if (payloadBase64) {
              const decoded = JSON.parse(atob(payloadBase64))
              if (decoded?.role) {
                setRole(decoded.role)
                setLoading(false)
                return
              }
            }
          } catch {
            // Fallback para rota de perfil se a decodificação falhar
          }
        }

        const res = await api.get('/auth/me').catch(() => ({ data: null }))
        if (res.data?.role) {
          setRole(res.data.role)
        } else {
          setRole('RECEPTIONIST')
        }
      } catch (err) {
        console.error('Erro ao identificar role:', err)
        setRole('RECEPTIONIST')
      } finally {
        setLoading(false)
      }
    }

    checkUserRole()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#64748b' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#06b6d4' }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Carregando visão personalizada...</span>
      </div>
    )
  }

  // 🛡️ ADMIN recebe visão executiva Omnia Hub SaaS
  if (role === 'ADMIN') {
    return <DashboardAdmin />
  }

  // 🏥 DENTIST e RECEPTIONIST recebem a visão operacional
  return <DashboardRecepcao />
}