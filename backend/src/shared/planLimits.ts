import { TenantPlan } from '@prisma/client'

export const PLAN_RANKS: Record<TenantPlan, number> = {
  BASIC: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
}

export type PlanFeature =
  | 'MULTI_ROOMS'
  | 'EXIT_INTELLIGENT'
  | 'AI_TRANSCRIPTION'
  | 'COMMISSIONS'
  | 'ADVANCED_FINANCIAL'
  | 'WHITE_LABEL'
  | 'WHATSAPP_INTEGRATION'
  | 'CUSTOM_PERMISSIONS'

export const FEATURE_MIN_PLAN: Record<PlanFeature, TenantPlan> = {
  AI_TRANSCRIPTION: 'PREMIUM',      // IA Clínica e transcrição a partir do Premium
  COMMISSIONS: 'PREMIUM',           // Gestão de comissões/repasses a partir do Premium
  ADVANCED_FINANCIAL: 'PREMIUM',    // Relatórios de DRE e conciliação
  EXIT_INTELLIGENT: 'PREMIUM',      // Dedução fracionada/automática de estoque
  WHITE_LABEL: 'PREMIUM',           // Identidade visual customizada
  WHATSAPP_INTEGRATION: 'PREMIUM',  // Envio de lembretes e links automáticos
  CUSTOM_PERMISSIONS: 'ENTERPRISE', // Edição granular da matriz RBAC
  MULTI_ROOMS: 'ENTERPRISE',        // Modo multi-salas/cadeiras simultâneas
}

export function isPlanSufficient(userPlan: TenantPlan = 'BASIC', requiredPlan: TenantPlan): boolean {
  const currentRank = PLAN_RANKS[userPlan] ?? 1
  const requiredRank = PLAN_RANKS[requiredPlan] ?? 1
  return currentRank >= requiredRank
}