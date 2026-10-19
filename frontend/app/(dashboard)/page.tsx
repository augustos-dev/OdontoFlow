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
        // Unifica as chaves de storage usadas na autenticação
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('odontoflow_token') ||
              localStorage.getItem('@odontoflow:token') ||
              localStorage.getItem('token')
            : null

        const storedUser =
          typeof window !== 'undefined'
            ? localStorage.getItem('odontoflow_user') ||
              localStorage.getItem('@odontoflow:user')
            : null

        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            if (parsed.role) {
              setRole(parsed.role)
              setLoading(false)
              return
            }
          } catch {}
        }

        if (token) {
          try {
            const payloadBase64 = token.split('.')[1]
            if (payloadBase64) {
              const decoded = JSON.parse(atob(payloadBase64))
              if (decoded?.role) {
                setRole(decoded.role)
                setLoading(false)
                return
              }
            }
          } catch {}
        }

        const res = await api.get('/auth/me').catch(() => ({ data: null }))
        if (res.data?.role) {
          setRole(res.data.role)
        } else {
          setRole('SECRETARY')
        }
      } catch (err) {
        console.error('Erro ao identificar role:', err)
        setRole('SECRETARY')
      } finally {
        setLoading(false)
      }
    }

    checkUserRole()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#64748b' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0082c9' }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Carregando visão personalizada...</span>
      </div>
    )
  }

  // 🛡️ ADMIN recebe a visão executiva completa alinhada ao Figma
  if (role === 'ADMIN') {
    return <DashboardAdmin />
  }

  // 🏥 DENTIST e SECRETARY recebem a visão operacional
  return <DashboardRecepcao />
}