import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
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

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createUser(tenantId: string, clinicId: string, data: CreateUserDTO) {
  const { name, email, password, role, phone, cro } = data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.user.create({
    data: { tenantId, clinicId, name, email, passwordHash, role, phone, cro },
    select: USER_SAFE_SELECT,
  })
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
  data: UpdateUserDTO
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SAFE_SELECT,
  })
}

// ─── Update Role (apenas ADMIN) ───────────────────────────────────────────────

export async function updateUserRole(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateUserRoleDTO,
  requesterId: string
) {
  // Impede que o próprio ADMIN altere sua role e perca acesso por engano
  if (userId === requesterId) {
    throw new AppError('Você não pode alterar sua própria permissão.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return prisma.user.update({
    where: { id: userId },
    data: { role: data.role },
    select: USER_SAFE_SELECT,
  })
}

// ─── Update Status (ativar/desativar) ────────────────────────────────────────

export async function updateUserStatus(
  tenantId: string,
  clinicId: string,
  userId: string,
  data: UpdateUserStatusDTO,
  requesterId: string
) {
  if (userId === requesterId) {
    throw new AppError('Você não pode desativar sua própria conta.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return prisma.user.update({
    where: { id: userId },
    data: { isActive: data.isActive },
    select: USER_SAFE_SELECT,
  })
}

// ─── Change Password (próprio usuário) ───────────────────────────────────────

export async function changePassword(userId: string, data: ChangePasswordDTO) {
  const { currentPassword, newPassword } = data

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!passwordMatch) throw new AppError('Senha atual incorreta.', 401)

  const newPasswordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteUser(
  tenantId: string,
  clinicId: string,
  userId: string,
  requesterId: string
) {
  if (userId === requesterId) {
    throw new AppError('Você não pode deletar sua própria conta.', 400)
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  // Verifica se o usuário possui agendamentos vinculados (como dentista)
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
}