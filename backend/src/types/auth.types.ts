// backend/src/types/auth.types.ts

export interface RegisterDTO {
  tenantId: string
  clinicId: string
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'DENTIST' | 'SECRETARY'
  phone?: string
  cro?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface JwtPayload {
  sub: string      // userId
  tenantId: string
  clinicId: string
  role: string
  name: string     // 🟢 Adicionado: garante o nome do usuário no log de auditoria
  plan?: string    // 🟢 Adicionado: permite verificar se é BASIC, PREMIUM ou ENTERPRISE
  iat?: number
  exp?: number
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
    tenantId: string
    clinicId: string
  }
}