// backend/src/types/auth.types.ts

export interface RegisterDTO {
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
  clinicId: string
  role: string
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
    clinicId: string
  }
} 