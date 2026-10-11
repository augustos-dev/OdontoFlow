'use client'

import { useMemo } from 'react'
import { TenantPlan, normalizePlan, PLAN_RANKS, PLAN_LIMITS, checkPlanAccess } from '@/lib/planAccess'

export function usePlanAccess() {
  const user = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem('odontoflow_user') || localStorage.getItem('@odontoflow:user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [])

  // Extrai o plano seja de user.plan ou user.tenant.plan e normaliza para maiúsculas
  const plan: TenantPlan = useMemo(() => {
    const raw = user?.plan || user?.tenant?.plan || 'BASIC'
    return normalizePlan(raw)
  }, [user])

  const access = useMemo(() => {
    const level = PLAN_RANKS[plan] ?? 1
    const limits = PLAN_LIMITS[plan]

    return {
      plan,
      level,
      isBasic: plan === 'BASIC',
      isPremium: level >= 2,
      isEnterprise: level >= 3,

      // Flags diretas de funcionalidades
      canMultiRooms: limits.allowMultiRooms,
      canExitIntelligent: limits.allowExitIntelligent,
      canAiTranscription: limits.allowAiTranscription,
      canCommissions: limits.allowCommissions,
      canAdvancedFinancial: limits.allowAdvancedFinancial,
      canWhiteLabel: limits.allowWhiteLabel,
      canCustomPermissions: limits.allowCustomPermissions,

      // Limites numéricos
      maxRooms: limits.maxRooms,
      maxDentists: limits.maxDentists,

      // Verificador genérico
      hasMinPlan: (minPlan: TenantPlan) => checkPlanAccess(plan, minPlan),
    }
  }, [plan])

  return access
}