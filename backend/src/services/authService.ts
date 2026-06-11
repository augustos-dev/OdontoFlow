// backend/src/services/auth.service.ts

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { RegisterDTO, LoginDTO, AuthResponse, JwtPayload } from '../types/auth.types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(data: RegisterDTO): Promise<AuthResponse> {
  const { tenantId, clinicId, name, email, password, role, phone, cro } = data

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa.', 403)

  // Garante que a clínica pertence ao tenant (isolamento multi-tenant)
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId, isActive: true },
  })
  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { tenantId, clinicId, name, email, passwordHash, role, phone, cro },
    select: { id: true, name: true, email: true, role: true, tenantId: true, clinicId: true },
  })

  const token = generateToken({ sub: user.id, tenantId: user.tenantId, clinicId: user.clinicId, role: user.role })

  return { token, user }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(data: LoginDTO): Promise<AuthResponse> {
  const { email, password } = data

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      clinicId: true,
      passwordHash: true,
      isActive: true,
      tenant: { select: { isActive: true } },
    },
  })

  if (!user) throw new AppError('Credenciais inválidas.', 401)
  if (!user.tenant.isActive) throw new AppError('Assinatura inativa. Entre em contato com o suporte.', 403)
  if (!user.isActive) throw new AppError('Usuário inativo. Entre em contato com o administrador.', 403)

  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) throw new AppError('Credenciais inválidas.', 401)

  prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})

  const token = generateToken({ sub: user.id, tenantId: user.tenantId, clinicId: user.clinicId, role: user.role })

  const { passwordHash: _, tenant: __, ...userWithoutSensitiveData } = user

  return { token, user: userWithoutSensitiveData }
}

// ─── Me ──────────────────────────────────────────────────────────────────────

export async function getMe(userId: string, tenantId: string, clinicId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      cro: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: { select: { id: true, name: true, plan: true } },
      clinic: { select: { id: true, name: true, logoUrl: true } },
    },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return user
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}