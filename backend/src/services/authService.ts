import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type { UserRole, TenantPlan } from '@prisma/client'
import type { RegisterDTO, LoginDTO, AuthResponse, JwtPayload } from '../types/auth.types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

// Hash dummy estático para equalizar tempo de resposta (anti-timing attack quando email não existe)
const DUMMY_HASH = '$2a$12$e8wE4yqZmsU9N6Yn8fFmqubL9w11iGzX6E1sL/vE6Q3oJ37iF0JqS'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export async function register(data: RegisterDTO): Promise<AuthResponse> {
  const { tenantId, clinicId, name, email, password, role, phone, cro } = data

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa.', 403)

  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId, isActive: true },
  })
  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      tenantId,
      clinicId,
      name,
      email,
      passwordHash,
      role,
      phone,
      cro,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      clinicId: true,
      avatarUrl: true,
    },
  })

  const token = generateToken({
    sub: user.id,
    userId: user.id,
    tenantId: user.tenantId,
    clinicId: user.clinicId,
    role: user.role,
    name: user.name,
    plan: tenant.plan,
  })

  await auditLogService.createLog({
    tenantId: user.tenantId,
    clinicId: user.clinicId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    entity: 'USER',
    entityId: user.id,
    details: `Novo usuário registrado no sistema: ${user.name} (${user.email})`,
  })

  return {
    token,
    user: {
      ...user,
      plan: tenant.plan,
    },
  }
}

export async function login(data: LoginDTO): Promise<AuthResponse> {
  const { email, password } = data
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      clinicId: true,
      avatarUrl: true,
      passwordHash: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      tenant: { select: { isActive: true, plan: true } },
    },
  })

  // Prevenção de Timing Attack: se o usuário não existe, executa hash dummy para gastar CPU equivalente
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH)
    throw new AppError('Credenciais inválidas.', 401)
  }

  const now = new Date()

  // 1. Verificação de Bloqueio Ativo (Lockout progressivo anti-força bruta)
  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (1000 * 60))
    throw new AppError(
      `Conta bloqueada temporariamente devido a sucessivas falhas de login. Tente novamente em ${remainingMinutes} minuto(s).`,
      429
    )
  }

  // 2. Validação de Assinatura e Status de Conta
  if (!user.tenant.isActive) {
    throw new AppError('Assinatura do tenant inativa. Entre em contato com o administrador.', 403)
  }

  if (!user.isActive) {
    throw new AppError('Usuário inativo. Entre em contato com o administrador.', 403)
  }

  // 3. Verificação de Senha
  const passwordMatch = await bcrypt.compare(password, user.passwordHash)

  if (!passwordMatch) {
    const updatedAttempts = user.failedLoginAttempts + 1
    const shouldLock = updatedAttempts >= MAX_FAILED_ATTEMPTS
    const lockTime = shouldLock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000) : null

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : updatedAttempts,
        lockedUntil: lockTime,
      },
    })

    if (shouldLock) {
      await auditLogService.createLog({
        tenantId: user.tenantId,
        clinicId: user.clinicId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'UPDATE',
        entity: 'USER',
        entityId: user.id,
        details: `Conta temporariamente bloqueada por ${LOCKOUT_MINUTES} minutos após 5 falhas consecutivas de senha.`,
      })

      throw new AppError(
        `Limite de tentativas excedido. Por segurança, sua conta foi bloqueada por ${LOCKOUT_MINUTES} minutos.`,
        429
      )
    }

    throw new AppError('Credenciais inválidas.', 401)
  }

  // 4. Sucesso: Reseta tentativas de falha e atualiza último login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })

  const token = generateToken({
    sub: user.id,
    userId: user.id,
    tenantId: user.tenantId,
    clinicId: user.clinicId,
    role: user.role,
    name: user.name,
    plan: user.tenant.plan,
  })

  await auditLogService.createLog({
    tenantId: user.tenantId,
    clinicId: user.clinicId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN',
    entity: 'USER',
    entityId: user.id,
    details: 'Sessão iniciada (Login realizado com sucesso)',
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      clinicId: user.clinicId,
      avatarUrl: user.avatarUrl,
      plan: user.tenant.plan,
    },
  }
}

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

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}