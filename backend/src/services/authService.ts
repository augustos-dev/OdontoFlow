//erros de sintaxe corrigidos 

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { RegisterDTO, LoginDTO, AuthResponse, JwtPayload } from '../types/auth.types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(data: RegisterDTO): Promise<AuthResponse> {
  const { clinicId, name, email, password, role, phone, cro } = data

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { clinicId, name, email, passwordHash, role, phone, cro },
    select: { id: true, name: true, email: true, role: true, clinicId: true },
  })

  const token = generateToken({ sub: user.id, clinicId: user.clinicId, role: user.role })

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
      clinicId: true,
      passwordHash: true,
      isActive: true,
    },
  })

  if (!user) throw new AppError('Credenciais inválidas.', 401)
  if (!user.isActive) throw new AppError('Usuário inativo. Entre em contato com o administrador.', 403)

  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) throw new AppError('Credenciais inválidas.', 401)

  prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {})

  const token = generateToken({ sub: user.id, clinicId: user.clinicId, role: user.role })

  const { passwordHash: _, ...userWithoutPassword } = user

  return { token, user: userWithoutPassword }
}

// ─── Me ──────────────────────────────────────────────────────────────────────

export async function getMe(userId: string, clinicId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, clinicId },
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
      clinic: { select: { id: true, name: true } },
    },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return user
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}