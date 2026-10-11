export type TenantPlan = 'BASIC' | 'PREMIUM' | 'ENTERPRISE'

export const PLAN_RANKS: Record<TenantPlan, number> = {
  BASIC: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
}

/**
 * Normaliza qualquer formato de string recebido do backend ou sessão
 * Ex: 'enterprise', 'Enterprise', 'PRO', 'pro'
 */
export function normalizePlan(rawPlan?: string | null): TenantPlan {
  if (!rawPlan) return 'BASIC'
  const upper = rawPlan.trim().toUpperCase()

  if (upper === 'ENTERPRISE') return 'ENTERPRISE'
  if (upper === 'PREMIUM' || upper === 'PRO') return 'PREMIUM'
  return 'BASIC'
}

/**
 * Verifica se o plano do utilizador cumpre o nível mínimo requerido
 */
export function checkPlanAccess(currentPlan?: string | null, requiredPlan: TenantPlan = 'BASIC'): boolean {
  const currentRank = PLAN_RANKS[normalizePlan(currentPlan)] ?? 1
  const requiredRank = PLAN_RANKS[requiredPlan] ?? 1
  return currentRank >= requiredRank
}

/**
 * Matriz de limites e capacidades por plano
 */
export const PLAN_LIMITS = {
  BASIC: {
    maxRooms: 1,
    maxDentists: 1,
    allowMultiRooms: false,
    allowExitIntelligent: false,
    allowAiTranscription: false,
    allowCommissions: false,
    allowAdvancedFinancial: false,
    allowWhiteLabel: false,
    allowCustomPermissions: false,
  },
  PREMIUM: {
    maxRooms: 2,
    maxDentists: 5,
    allowMultiRooms: false, // 3+ salas em simultâneo é exclusivo Enterprise
    allowExitIntelligent: true,
    allowAiTranscription: true,
    allowCommissions: true,
    allowAdvancedFinancial: true,
    allowWhiteLabel: true,
    allowCustomPermissions: false,
  },
  ENTERPRISE: {
    maxRooms: 999,
    maxDentists: 999,
    allowMultiRooms: true,
    allowExitIntelligent: true,
    allowAiTranscription: true,
    allowCommissions: true,
    allowAdvancedFinancial: true,
    allowWhiteLabel: true,
    allowCustomPermissions: true,
  },
} as const