import bcrypt from 'bcryptjs'
import { Prisma, UserRole, SystemModule } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { getTenantContext, assertProfessionalLimit } from '../lib/tenantContext'
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
  tenantId: true,
  clinicId: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  cro: true,
  avatarUrl: true,
  isActive: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

/** OWNER só existe no Enterprise e só quem já é OWNER concede/retira esse papel. */
async function assertCanAssignRole(tenantId: string, role: UserRole, actor: ActorContext) {
  if (role !== 'OWNER') return
  const ctx = await getTenantContext(tenantId)
  if (!ctx.isNetwork) throw new AppError('O papel OWNER existe apenas no plano Enterprise.', 400)
  if (actor.userRole !== 'OWNER') throw new AppError('Somente o dono da rede pode atribuir o papel OWNER.', 403)
}

function assertNotOwnerTarget(target: { role: UserRole }, actor: ActorContext) {
  if (target.role === 'OWNER' && actor.userRole !== 'OWNER') {
    throw new AppError('Somente o dono da rede pode alterar outro dono.', 403)
  }
}

export async function createUser(
  tenantId: string,
  clinicId: string,
  data: CreateUserDTO,
  actor: ActorContext
) {
  const { name, password, role, phone, cro } = data
  // O login normaliza o e-mail (trim + minúsculas). Sem isso, um e-mail cadastrado com maiúscula nunca consegue entrar.
  const email = data.email.trim().toLowerCase()

  await assertCanAssignRole(tenantId, role, actor)
  if (role === 'DENTIST') await assertProfessionalLimit(tenantId)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError('E-mail já cadastrado.', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const newUser = await prisma.user.create({
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
    select: USER_SAFE_SELECT,
  })

  if (role !== 'OWNER') await ensureDefaultRolePermissions(tenantId, clinicId, role)

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

export async function getUserById(tenantId: string, clinicId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
    select: USER_SAFE_SELECT,
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return user
}

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
    data: {
      name: data.name,
      phone: data.phone,
      cro: data.cro,
      avatarUrl: data.avatarUrl,
    },
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

  assertNotOwnerTarget(user, actor)
  await assertCanAssignRole(tenantId, data.role, actor)
  if (data.role === 'DENTIST' && user.role !== 'DENTIST' && user.isActive) await assertProfessionalLimit(tenantId)

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

  assertNotOwnerTarget(user, actor)
  if (data.isActive && !user.isActive && user.role === 'DENTIST') await assertProfessionalLimit(tenantId)

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

export async function resetUserLockout(
  tenantId: string,
  clinicId: string,
  userId: string,
  actor: ActorContext
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, clinicId },
  })

  if (!user) throw new AppError('Usuário não encontrado.', 404)

  const unlockedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
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
    details: `Desbloqueio de segurança efetuado manualmente para a conta: ${user.email}`,
  })

  return unlockedUser
}

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
    data: {
      passwordHash: newPasswordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
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

  assertNotOwnerTarget(user, actor)

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

export async function getRolePermissions(tenantId: string, clinicId: string, role: UserRole) {
  await ensureDefaultRolePermissions(tenantId, clinicId, role)

  return prisma.rolePermission.findMany({
    where: {
      tenantId,
      role,
      OR: [{ clinicId }, { clinicId: null }],
    },
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
  const targetClinicId = data.clinicId !== undefined ? data.clinicId : clinicId

  if (role === 'ADMIN' || role === 'OWNER') {
    throw new AppError('As permissões dos perfis ADMINISTRADOR e DONO DA REDE são fixas e irrestritas.', 400)
  }

  const operations = permissions.map((perm) =>
    prisma.rolePermission.upsert({
      where: {
        tenantId_clinicId_role_module: {
          tenantId,
          clinicId: targetClinicId as string,
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
        clinicId: targetClinicId,
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

async function ensureDefaultRolePermissions(tenantId: string, clinicId: string, role: UserRole) {
  const existingCount = await prisma.rolePermission.count({
    where: {
      tenantId,
      role,
      OR: [{ clinicId }, { clinicId: null }],
    },
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
    'AI_TRANSCRIPTION',
    'COMMISSIONS',
    'TASKS',
    'MY_OFFICE',
    'RECEIVABLES',
    'INSURANCE_BATCHES',
  ]

  const defaults = allModules.map((module) => {
    const isSecretaryRestricted =
      role === 'SECRETARY' &&
      ['FINANCIAL', 'SETTINGS', 'REPORTS', 'COMMISSIONS', 'RECEIVABLES', 'INSURANCE_BATCHES'].includes(module)

    return {
      tenantId,
      clinicId,
      role,
      module,
      canRead: role === 'ADMIN' ? true : !isSecretaryRestricted,
      canCreate:
        role === 'ADMIN'
          ? true
          : role === 'SECRETARY'
          ? ['AGENDA', 'PATIENTS'].includes(module)
          : true,
      canUpdate:
        role === 'ADMIN'
          ? true
          : role === 'SECRETARY'
          ? ['AGENDA', 'PATIENTS'].includes(module)
          : true,
      canDelete: role === 'ADMIN',
    }
  })

  await prisma.rolePermission.createMany({
    data: defaults,
    skipDuplicates: true,
  })
}

// ─── Vínculo de usuário a várias unidades (Enterprise) ────────────────────────

export async function listUserClinics(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      clinicId: true,
      clinic: { select: { id: true, name: true } },
      clinics: { select: { clinic: { select: { id: true, name: true } } } },
    },
  })
  if (!user) throw new AppError('Usuário não encontrado.', 404)

  return {
    primary: user.clinic,
    additional: user.clinics.map((c) => c.clinic),
  }
}

export async function assignUserToClinic(
  tenantId: string,
  userId: string,
  clinicId: string,
  actor: ActorContext
) {
  const ctx = await getTenantContext(tenantId)
  if (!ctx.isNetwork) throw new AppError('Atuar em mais de uma unidade exige o plano Enterprise.', 403)
  if (actor.userRole !== 'OWNER') throw new AppError('Somente o dono da rede pode vincular usuários a unidades.', 403)

  const [user, clinic] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, tenantId } }),
    prisma.clinic.findFirst({ where: { id: clinicId, tenantId, isActive: true } }),
  ])
  if (!user) throw new AppError('Usuário não encontrado.', 404)
  if (!clinic) throw new AppError('Clínica não encontrada.', 404)
  if (user.clinicId === clinicId) throw new AppError('Esta já é a unidade principal do usuário.', 400)

  const link = await prisma.userClinic.upsert({
    where: { userId_clinicId: { userId, clinicId } },
    create: { tenantId, userId, clinicId },
    update: {},
  })

  // Garante as permissões padrão do papel também nesta unidade.
  if (user.role !== 'OWNER') await ensureDefaultRolePermissions(tenantId, clinicId, user.role)

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'OWNER',
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Vinculou ${user.name} à unidade "${clinic.name}"`,
  })

  return link
}

export async function removeUserFromClinic(
  tenantId: string,
  userId: string,
  clinicId: string,
  actor: ActorContext
) {
  if (actor.userRole !== 'OWNER') throw new AppError('Somente o dono da rede pode desvincular usuários de unidades.', 403)

  const { count } = await prisma.userClinic.deleteMany({ where: { tenantId, userId, clinicId } })
  if (count === 0) throw new AppError('Vínculo não encontrado (a unidade principal não pode ser removida por aqui).', 404)

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'OWNER',
    action: 'UPDATE',
    entity: 'USER',
    entityId: userId,
    details: `Removeu o vínculo do usuário ${userId} com a unidade ${clinicId}`,
  })
}
