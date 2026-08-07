import bcrypt from 'bcryptjs'
import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
  ChangePasswordDTO,
  UserFiltersDTO,
} from '../types/user.types'

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  cro: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createUser(
  tenantId: string,
  clinicId: string,
  data: CreateUserDTO,
  actor: ActorContext
) {
  const { name, email, password, role, phone, cro } = data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const newUser = await prisma.user.create({
    data: { tenantId, clinicId, name, email, passwordHash, role, phone, cro },
    select: USER_SAFE_SELECT,
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'CREATE',
    entity: 'USER',
    entityId: newUser.id,
    details: `Novo usuário criado: ${newUser.name} (${newUser.role}) - E-mail: ${newUser.email}`,
  })

  return newUser
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listUsers(tenantId: string, clinicId: string, filters: UserFiltersDTO) {
  const { name, role, isActive, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.UserWhereInput = {
    tenantId,
    clinicId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: USER_SAFE_SELECT,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getUserById(tenantId: string, clinicId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
    select: USER_SAFE_SELECT,
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return user
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUser(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateUserDTO,
  actor: ActorContext
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SAFE_SELECT,
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Dados do usuário ${updatedUser.name} atualizados.`,
  })

  return updatedUser
}

// ─── Update Role (apenas ADMIN) ───────────────────────────────────────────────

export async function updateUserRole(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateUserRoleDTO,
  actor: ActorContext
) {
  if (userId === actor.userId) {
    throw new AppError('Você não pode alterar sua própria permissão.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: data.role },
    select: USER_SAFE_SELECT,
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Alterou o perfil do usuário ${user.name} de ${user.role} para ${data.role}`,
  })

  return updatedUser
}

// ─── Update Status (ativar/desativar) ────────────────────────────────────────

export async function updateUserStatus(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateUserStatusDTO,
  actor: ActorContext
) {
  if (userId === actor.userId) {
    throw new AppError('Você não pode desativar sua própria conta.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: data.isActive },
    select: USER_SAFE_SELECT,
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Status do usuário ${user.name} alterado para: ${data.isActive ? 'ATIVO' : 'INATIVO'}`,
  })

  return updatedUser
}

// ─── Change Password (próprio usuário) ───────────────────────────────────────

export async function changePassword(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: ChangePasswordDTO,
  userName: string
) {
  const { currentPassword, newPassword } = data

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, passwordHash: true, role: true },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!passwordMatch) throw new AppError('Senha atual incorreta.', 401)

  const newPasswordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId,
    userName,
    userRole: user.role,
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Usuário ${userName} alterou sua própria senha de acesso.`,
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteUser(
  tenantId: string,
  clinicId: string,
  userId: string,
  actor: ActorContext
) {
  if (userId === actor.userId) {
    throw new AppError('Você não pode deletar sua própria conta.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const hasAppointments = await prisma.appointment.findFirst({
    where: { dentistId: userId },
  })

  if (hasAppointments) {
    throw new AppError(
      'Não é possível deletar um usuário com agendamentos vinculados. Desative a conta em vez de deletar.',
      400
    )
  }

  await prisma.user.delete({ where: { id: userId } })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'DELETE',
    entity: 'USER',
    entityId: userId,
    details: `Excluiu permanentemente a conta do usuário: ${user.name} (${user.email})`,
  })
}