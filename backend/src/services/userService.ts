import bcrypt from 'bcryptjs'
import { Prisma, UserRole, SystemModule } from '@prisma/client'
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
import type { BulkUpdateRolePermissionsDTO } from '../types/permission.types'

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

  // 🟢 Inicializa permissões padrões da role se ainda não existirem para o tenant
  await ensureDefaultRolePermissions(tenantId, role)

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

// ─── RBAC: Permissões por Role (Novo) ─────────────────────────────────────────

export async function getRolePermissions(tenantId: string, role: UserRole) {
  await ensureDefaultRolePermissions(tenantId, role)

  return prisma.rolePermission.findMany({
    where: { tenantId, role },
    orderBy: { module: 'asc' },
  })
}

export async function updateRolePermissions(
  tenantId: string,
  clinicId: string,
  data: BulkUpdateRolePermissionsDTO,
  actor: ActorContext
) {
  const { role, permissions } = data

  if (role === 'ADMIN') {
    throw new AppError('As permissões do perfil ADMINISTRADOR são fixas e irrestritas.', 400)
  }

  const operations = permissions.map((perm) =>
    prisma.rolePermission.upsert({
      where: {
        tenantId_role_module: {
          tenantId,
          role,
          module: perm.module,
        },
      },
      update: {
        canRead: perm.canRead ?? true,
        canCreate: perm.canCreate ?? false,
        canUpdate: perm.canUpdate ?? false,
        canDelete: perm.canDelete ?? false,
      },
      create: {
        tenantId,
        role,
        module: perm.module,
        canRead: perm.canRead ?? true,
        canCreate: perm.canCreate ?? false,
        canUpdate: perm.canUpdate ?? false,
        canDelete: perm.canDelete ?? false,
      },
    })
  )

  const updatedPermissions = await prisma.$transaction(operations)

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'ROLE_PERMISSION',
    details: `Permissões de acesso granulares atualizadas para o perfil: ${role}`,
  })

  return updatedPermissions
}

// Auxiliar para criar o mapa padrão de permissões caso o tenant não tenha inicializado
async function ensureDefaultRolePermissions(tenantId: string, role: UserRole) {
  const existingCount = await prisma.rolePermission.count({
    where: { tenantId, role },
  })

  if (existingCount > 0) return

  const allModules: SystemModule[] = [
    'DASHBOARD',
    'AGENDA',
    'PATIENTS',
    'RECORDS',
    'STOCK',
    'FINANCIAL',
    'PROCEDURES',
    'SUPPLIERS',
    'SETTINGS',
    'REPORTS',
  ]

  const defaults = allModules.map((module) => {
    const isSecretaryRestricted =
      role === 'SECRETARY' && ['FINANCIAL', 'SETTINGS', 'REPORTS'].includes(module)

    return {
      tenantId,
      role,
      module,
      canRead: role === 'ADMIN' ? true : !isSecretaryRestricted,
      canCreate: role === 'ADMIN' ? true : role === 'SECRETARY' ? ['AGENDA', 'PATIENTS'].includes(module) : true,
      canUpdate: role === 'ADMIN' ? true : role === 'SECRETARY' ? ['AGENDA', 'PATIENTS'].includes(module) : true,
      canDelete: role === 'ADMIN',
    }
  })

  await prisma.rolePermission.createMany({
    data: defaults,
    skipDuplicates: true,
  })
}