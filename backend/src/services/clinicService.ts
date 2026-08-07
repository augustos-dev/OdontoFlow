import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type { CreateClinicDTO, UpdateClinicDTO, ClinicFiltersDTO } from '../types/clinics.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export async function createClinic(tenantId: string, data: CreateClinicDTO, actor: ActorContext) {
  const { name, cnpj, phone, email, address, logoUrl } = data

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa. Não é possível criar novas clínicas.', 403)

  if (cnpj) {
    const existing = await prisma.clinic.findUnique({ where: { cnpj } })
    if (existing) throw new AppError('CNPJ já cadastrado em outra clínica.', 409)
  }

  const clinic = await prisma.clinic.create({
    data: { tenantId, name, cnpj, phone, email, address, logoUrl },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId: clinic.id,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'CREATE',
    entity: 'CLINIC',
    entityId: clinic.id,
    details: `Cadastrou nova unidade/clínica: "${clinic.name}" (CNPJ: ${clinic.cnpj || 'Não informado'})`,
  })

  return clinic
}

export async function listClinics(tenantId: string, filters: ClinicFiltersDTO) {
  const { name, isActive, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.ClinicWhereInput = {
    tenantId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(isActive !== undefined && { isActive }),
  }

  const [clinics, total] = await Promise.all([
    prisma.clinic.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, patients: true, appointments: true },
        },
      },
    }),
    prisma.clinic.count({ where }),
  ])

  return {
    data: clinics,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getClinicById(tenantId: string, clinicId: string) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
    include: {
      _count: {
        select: {
          users: true,
          patients: true,
          appointments: true,
          products: true,
          suppliers: true,
        },
      },
    },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  return clinic
}

export async function updateClinic(
  tenantId: string,
  clinicId: string,
  data: UpdateClinicDTO,
  actor: ActorContext
) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  if (data.cnpj && data.cnpj !== clinic.cnpj) {
    const existing = await prisma.clinic.findUnique({ where: { cnpj: data.cnpj } })
    if (existing) throw new AppError('CNPJ já cadastrado em outra clínica.', 409)
  }

  const updatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data,
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'CLINIC',
    entityId: clinicId,
    details: `Atualizou os dados cadastrais da clínica "${updatedClinic.name}"`,
  })

  return updatedClinic
}

export async function deactivateClinic(tenantId: string, clinicId: string, actor: ActorContext) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)
  if (!clinic.isActive) throw new AppError('Clínica já está inativa.', 400)

  const activeClinicsCount = await prisma.clinic.count({
    where: { tenantId, isActive: true },
  })

  if (activeClinicsCount <= 1) {
    throw new AppError('Não é possível desativar a única clínica ativa do tenant.', 400)
  }

  const deactivatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: { isActive: false },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'CLINIC',
    entityId: clinicId,
    details: `Desativou a unidade/clínica "${clinic.name}"`,
  })

  return deactivatedClinic
}

export async function reactivateClinic(tenantId: string, clinicId: string, actor: ActorContext) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)
  if (clinic.isActive) throw new AppError('Clínica já está ativa.', 400)

  const reactivatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: { isActive: true },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'CLINIC',
    entityId: clinicId,
    details: `Reativou a unidade/clínica "${clinic.name}"`,
  })

  return reactivatedClinic
}