import { UserRole, TenantPlan, BillingCycle, SubscriptionStatus } from '@prisma/client'

export { UserRole, TenantPlan, BillingCycle, SubscriptionStatus }

// ─── REGISTRO ATÔMICO DO SAAS (ONBOARDING & CONVERSÃO) ───
export interface RegisterTenantDTO {
  tenantName: string
  slug: string
  plan?: TenantPlan
  billingCycle?: BillingCycle
  phone?: string
  cnpjOrCpf?: string
  adminName: string
  email: string
  password: string
}

export interface RegisterTenantResponseDTO {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: UserRole
  }
  tenant: {
    id: string
    name: string
    slug: string
    plan: TenantPlan
    status: SubscriptionStatus
    trialEndsAt?: Date | null
    isBetaPartner: boolean
  }
  clinic: {
    id: string
    name: string
  }
}

// ─── CADASTRO DE USUÁRIO INTERNO NA CLÍNICA ───
export interface RegisterDTO {
  tenantId: string
  clinicId: string
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  cro?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface JwtPayload {
  sub: string         // userId
  userId?: string     // alias retrocompatível com middlewares
  tenantId: string
  clinicId: string
  role: UserRole
  name: string
  plan?: TenantPlan
  iat?: number
  exp?: number
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    tenantId: string
    clinicId: string
    avatarUrl?: string | null
    defaultRoom?: string | null // 👈 Adicione esta linha
    plan: TenantPlan
  }
}

export interface AuthUserSession {
  tenantId: string
  clinicId: string
  userId: string
  sub?: string
  name: string
  role: UserRole
  plan?: TenantPlan
  isBetaPartner?: boolean
}