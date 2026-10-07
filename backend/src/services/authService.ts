import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import {
  RegisterTenantDTO,
  RegisterTenantResponseDTO,
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  JwtPayload,
  TenantPlan,
  SubscriptionStatus
} from '../types/auth.types'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h'

const DUMMY_HASH = '$2a$12$e8wE4yqZmsU9N6Yn8fFmqubL9w11iGzX6E1sL/vE6Q3oJ37iF0JqS'
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

// ─── 1. ONBOARDING LANDING PAGE (SAAS) ───
export async function registerTenant(data: RegisterTenantDTO): Promise<RegisterTenantResponseDTO> {
  const {
    tenantName,
    slug,
    plan,
    phone,
    cnpjOrCpf,
    adminName,
    email,
    password,
  } = data

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    throw new AppError('E-mail já registrado no sistema.', 409)
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: normalizedSlug } })
  if (existingTenant) {
    throw new AppError('Este endereço/subdomínio já se encontra em uso. Escolha outro.', 409)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  const { tenant, clinic, user } = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name: tenantName.trim(),
        slug: normalizedSlug,
        plan: plan ?? TenantPlan.PREMIUM,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        isBetaPartner: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        trialEndsAt: true,
        isBetaPartner: true,
      },
    })

    const newClinic = await tx.clinic.create({
      data: {
        tenantId: newTenant.id,
        name: tenantName.trim(),
        cnpj: cnpjOrCpf?.trim() || null,
        phone: phone?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const newUser = await tx.user.create({
      data: {
        tenantId: newTenant.id,
        clinicId: newClinic.id,
        name: adminName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
        phone: phone?.trim() || null,
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
      },
    })

    return { tenant: newTenant, clinic: newClinic, user: newUser }
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
    entity: 'TENANT',
    entityId: tenant.id,
    details: `Novo onboarding concluído: ${tenant.name} (${user.email})`,
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      isBetaPartner: tenant.isBetaPartner,
    },
    clinic: {
      id: clinic.id,
      name: clinic.name,
    },
  }
}

// ─── 2. CADASTRO DE COLABORADOR (EQUIPE) ───
export async function register(data: RegisterDTO): Promise<AuthResponse> {
  const { tenantId, clinicId, name, email, password, role, phone, cro } = data
  const normalizedEmail = email.trim().toLowerCase()

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa.', 403)

  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId, isActive: true },
  })
  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      tenantId,
      clinicId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      phone: phone?.trim() || null,
      cro: cro?.trim() || null,
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
    details: `Novo membro adicionado à equipe: ${user.name} (${user.email})`,
  })

  return {
    token,
    user: {
      ...user,
      plan: tenant.plan,
    },
  }
}

// ─── 3. LOGIN ───
export async function login(data: LoginDTO): Promise<AuthResponse> {
  const { email, password } = data
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      tenant: {
        select: {
          isActive: true,
          plan: true,
        },
      },
    },
  })

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH)
    throw new AppError('Credenciais inválidas.', 401)
  }

  const now = new Date()

  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (1000 * 60))
    throw new AppError(
      `Conta bloqueada temporariamente devido a sucessivas falhas de login. Tente novamente em ${remainingMinutes} minuto(s).`,
      429
    )
  }

  if (!user.tenant?.isActive) {
    throw new AppError('Assinatura do tenant inativa. Entre em contato com o suporte.', 403)
  }

  if (!user.isActive) {
    throw new AppError('Usuário inativo. Entre em contato com o administrador.', 403)
  }

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
        details: `Conta bloqueada temporariamente por 15 minutos após 5 erros sucessivos de senha.`,
      })

      throw new AppError(
        `Limite de tentativas excedido. Por segurança, sua conta foi bloqueada por ${LOCKOUT_MINUTES} minutos.`,
        429
      )
    }

    throw new AppError('Credenciais inválidas.', 401)
  }

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

// ─── 4. PERFIL DO USUÁRIO (/auth/me) ───
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
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          trialEndsAt: true,
          isBetaPartner: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          cnpj: true,
          phone: true,
        },
      },
    },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return user
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}