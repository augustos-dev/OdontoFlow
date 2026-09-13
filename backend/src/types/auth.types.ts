// backend/src/types/auth.types.ts

import { UserRole, TenantPlan } from '@prisma/client'

export { UserRole, TenantPlan }

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
  sub: string        // userId
  userId?: string    // alias retrocompatível com middlewares
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
    plan?: TenantPlan
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
}