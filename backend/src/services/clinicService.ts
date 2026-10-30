import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { getTenantContext } from '../lib/tenantContext'
import { pick } from '../shared/pick'
import { auditLogService } from './auditLog.service'
import type {
  CreateClinicDTO,
  UpdateClinicDTO,
  ClinicFiltersDTO,
  UpdateClinicCustomizationDTO,
} from '../types/clinics.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export async function createClinic(tenantId: string, data: CreateClinicDTO, actor: ActorContext) {
  const { name, cnpj, phone, email, address, logoUrl, paymentIntegrationActive } = data

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa. Não é possível criar novas clínicas.', 403)

  if (cnpj) {
    const existing = await prisma.clinic.findUnique({ where: { cnpj } })
    if (existing) throw new AppError('CNPJ já cadastrado em outra clínica.', 409)
  }

  const ctx = await getTenantContext(tenantId)

  // Rede (Enterprise): só o dono da rede abre novas unidades.
  if (ctx.isNetwork && actor.userRole !== 'OWNER') {
    throw new AppError('Somente o dono da rede (OWNER) pode cadastrar novas unidades.', 403)
  }

  const clinic = await prisma.$transaction(async (tx) => {
    // Trava por tenant: duas criações simultâneas não furam o limite do pacote.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`

    const activeCount = await tx.clinic.count({ where: { tenantId, isActive: true } })
    if (activeCount >= ctx.maxClinics) {
      throw new AppError(
        `Limite de clínicas do plano atingido (${ctx.maxClinics}). Para abrir uma nova unidade, solicite a ampliação do pacote Enterprise.`,
        403
      )
    }

    return tx.clinic.create({
    data: {
      tenantId,
      name,
      cnpj,
      phone,
      email,
      address,
      logoUrl,
      paymentIntegrationActive: paymentIntegrationActive ?? false,
      customization: {
        create: {
          primaryColor: '#06b6d4',
          accentColor: '#0891b2',
          secondaryColor: '#0f172a',
          fontFamily: 'Inter',
          darkModeDefault: false,
          customLogoUrl: logoUrl || null,
        },
      },
    },
    include: {
      customization: true,
    },
    })
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
    details: `Cadastrou nova unidade: "${clinic.name}" (CNPJ: ${clinic.cnpj || 'Não informado'})`,
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
        customization: true,
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
      customization: true,
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

  // `isActive` não pode ser alterado por aqui: reativar por PUT burlaria o limite do pacote e a regra do OWNER.
  if (data.isActive !== undefined && data.isActive !== clinic.isActive) {
    throw new AppError('Para ativar ou desativar uma unidade use as ações /deactivate e /reactivate.', 400)
  }

  // Lista explícita: o `data` anterior ia inteiro para o Prisma (o cliente podia trocar o tenantId da clínica).
  const editable = pick(data, ['name', 'cnpj', 'phone', 'email', 'address', 'logoUrl', 'paymentIntegrationActive'] as const)

  const updatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: editable,
    include: {
      customization: true,
    },
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

  const networkCtx = await getTenantContext(tenantId)
  if (networkCtx.isNetwork && actor.userRole !== 'OWNER') {
    throw new AppError('Somente o dono da rede pode desativar unidades.', 403)
  }

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

  const ctx = await getTenantContext(tenantId)
  if (ctx.isNetwork && actor.userRole !== 'OWNER') {
    throw new AppError('Somente o dono da rede pode reativar unidades.', 403)
  }
  const activeCount = await prisma.clinic.count({ where: { tenantId, isActive: true } })
  if (activeCount >= ctx.maxClinics) {
    throw new AppError(`Limite de clínicas do plano atingido (${ctx.maxClinics}).`, 403)
  }

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

export async function getClinicCustomization(tenantId: string, clinicId: string) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
    select: { id: true },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  return prisma.clinicCustomization.upsert({
    where: { clinicId },
    update: {},
    create: {
      clinicId,
      primaryColor: '#06b6d4',
      accentColor: '#0891b2',
      secondaryColor: '#0f172a',
      fontFamily: 'Inter',
      darkModeDefault: false,
    },
  })
}

export async function updateClinicCustomization(
  tenantId: string,
  clinicId: string,
  data: UpdateClinicCustomizationDTO,
  actor: ActorContext
) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
    select: { id: true, name: true },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  const updatedCustomization = await prisma.clinicCustomization.upsert({
    where: { clinicId },
    update: {
      clinicName: data.clinicName,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      secondaryColor: data.secondaryColor,
      fontFamily: data.fontFamily,
      darkModeDefault: data.darkModeDefault,
      customLogoUrl: data.customLogoUrl,
      customFavicon: data.customFavicon,
    },
    create: {
      clinicId,
      clinicName: data.clinicName,
      primaryColor: data.primaryColor || '#06b6d4',
      accentColor: data.accentColor || '#0891b2',
      secondaryColor: data.secondaryColor || '#0f172a',
      fontFamily: data.fontFamily || 'Inter',
      darkModeDefault: data.darkModeDefault ?? false,
      customLogoUrl: data.customLogoUrl || null,
      customFavicon: data.customFavicon || null,
    },
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
    details: `Atualizou a identidade visual (White-Label) da clínica "${clinic.name}"`,
  })

  return updatedCustomization
}