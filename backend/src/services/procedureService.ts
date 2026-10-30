import { Prisma, UserRole, UnitType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import { getTenantContext, effectivePrice, type TenantContext } from '../lib/tenantContext'
import { pick } from '../shared/pick'
import type {
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureFiltersDTO,
  SetProcedureProductsDTO,
} from '../types/procedure.types'

interface ActorContext {
  clinicId?: string
  userId: string
  userName: string
  userRole?: UserRole
}

const PRODUCT_SELECT = {
  id: true,
  name: true,
  quantity: true,
  minQuantity: true,
  unit: true,
  costPrice: true,
  itemsPerPackage: true, // 🟢 Retorna itemsPerPackage para o cálculo do front
  lotNumber: true,
} satisfies Prisma.ProductSelect

/** Procedimento + receita DESTA clínica + preço/ativação desta clínica. */
function procedureInclude(clinicId: string) {
  return {
    procedureProducts: {
      where: { clinicId },
      include: { product: { select: PRODUCT_SELECT } },
    },
    clinicProcedures: {
      where: { clinicId },
      select: { price: true, isActive: true },
    },
  } satisfies Prisma.ProcedureInclude
}

type ProcedureWithClinic = Prisma.ProcedureGetPayload<{ include: ReturnType<typeof procedureInclude> }>

/** Acrescenta preço efetivo e status na unidade, sem expor a relação crua. */
function withClinicView(procedure: ProcedureWithClinic, ctx: TenantContext) {
  const { clinicProcedures, ...rest } = procedure
  const link = clinicProcedures[0]
  return {
    ...rest,
    effectivePrice: effectivePrice(procedure.basePrice, link?.price),
    clinicPrice: link?.price ?? null,
    // Fora do Enterprise não há catálogo por unidade: tudo está disponível.
    isActiveInClinic: ctx.isNetwork ? !!link?.isActive : true,
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProcedure(tenantId: string, data: CreateProcedureDTO, actor: ActorContext) {
  const { name, code, basePrice, durationMin, category } = data

  const existing = await prisma.procedure.findUnique({
    where: { tenantId_name: { tenantId, name } },
  })
  if (existing) throw new AppError('Já existe um procedimento com este nome.', 409)

  const ctx = await getTenantContext(tenantId)

  const procedure = await prisma.$transaction(async (tx) => {
    const created = await tx.procedure.create({
      data: {
        tenantId,
        name,
        code,
        basePrice,
        durationMin: durationMin || 30,
        category: category || 'Dentística / Estética',
      },
    })

    // Enterprise: o procedimento nasce ativo só na unidade que o cadastrou.
    // As demais unidades ativam por conta própria (ou via "copiar da unidade X").
    if (ctx.isNetwork && actor.clinicId) {
      await tx.clinicProcedure.create({
        data: { tenantId, clinicId: actor.clinicId, procedureId: created.id, isActive: true },
      })
    }
    return created
  })

  if (actor.clinicId) {
    await auditLogService.createLog({
      tenantId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'CREATE',
      entity: 'PROCEDURE',
      entityId: procedure.id,
      details: `Cadastrou o procedimento "${procedure.name}" (Código: ${procedure.code || 'N/A'}) no valor base de R$ ${Number(procedure.basePrice).toFixed(2)}`,
    })
  }

  return procedure
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProcedures(tenantId: string, clinicId: string, filters: ProcedureFiltersDTO) {
  const { name, category, scope, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit
  const ctx = await getTenantContext(tenantId)

  const where: Prisma.ProcedureWhereInput = {
    tenantId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(category && { category }),
    // Enterprise: por padrão só o que a unidade oferece. scope=catalog mostra o catálogo da rede (tela de configuração).
    ...(ctx.isNetwork &&
      scope !== 'catalog' && { clinicProcedures: { some: { clinicId, isActive: true } } }),
  }

  const [procedures, total] = await Promise.all([
    prisma.procedure.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: procedureInclude(clinicId),
    }),
    prisma.procedure.count({ where }),
  ])

  return {
    data: procedures.map((p) => withClinicView(p, ctx)),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getProcedureById(tenantId: string, clinicId: string, procedureId: string) {
  const ctx = await getTenantContext(tenantId)

  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
    include: procedureInclude(clinicId),
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  return withClinicView(procedure, ctx)
}

// ─── Update ───────────────────────────────────────────────────────────────────

const NETWORK_CATALOG_MSG =
  'No plano Enterprise o catálogo de procedimentos é compartilhado pela rede: somente o dono da rede altera ou exclui. ' +
  'A unidade ajusta ativação e preço em /clinics/:id/procedures e a receita em /procedures/:id/products.'

export async function updateProcedure(
  tenantId: string,
  procedureId: string,
  data: UpdateProcedureDTO,
  actor: ActorContext
) {
  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  const ctx = await getTenantContext(tenantId)
  if (ctx.isNetwork && actor.userRole !== 'OWNER') throw new AppError(NETWORK_CATALOG_MSG, 403)

  if (data.name && data.name !== procedure.name) {
    const existing = await prisma.procedure.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
    })
    if (existing) throw new AppError('Já existe um procedimento com este nome.', 409)
  }

  const updatedProcedure = await prisma.procedure.update({
    where: { id: procedureId },
    // Lista explícita (antes: `data` inteiro, inclusive tenantId vindo do cliente).
    data: pick(data, ['name', 'code', 'basePrice', 'durationMin', 'category'] as const),
  })

  if (actor.clinicId) {
    await auditLogService.createLog({
      tenantId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'UPDATE',
      entity: 'PROCEDURE',
      entityId: procedureId,
      details: `Atualizou o procedimento "${updatedProcedure.name}". Valor base: R$ ${Number(updatedProcedure.basePrice).toFixed(2)}`,
    })
  }

  return updatedProcedure
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProcedure(tenantId: string, procedureId: string, actor: ActorContext) {
  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  const ctx = await getTenantContext(tenantId)
  if (ctx.isNetwork && actor.userRole !== 'OWNER') throw new AppError(NETWORK_CATALOG_MSG, 403)

  const inUse = await prisma.planProcedure.findFirst({
    where: { procedureId },
  })
  if (inUse) {
    throw new AppError('Procedimento não pode ser excluído pois está vinculado a planos de tratamento.', 400)
  }

  await prisma.procedure.delete({ where: { id: procedureId } })

  if (actor.clinicId) {
    await auditLogService.createLog({
      tenantId,
      clinicId: actor.clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'DELETE',
      entity: 'PROCEDURE',
      entityId: procedureId,
      details: `Deletou o procedimento "${procedure.name}" do catálogo`,
    })
  }
}

// ─── Set Ficha Técnica (receita DA CLÍNICA / Exit Inteligente) ───────────────

export async function setProcedureProducts(
  tenantId: string,
  procedureId: string,
  data: SetProcedureProductsDTO,
  actor: ActorContext
) {
  const clinicId = actor.clinicId
  if (!clinicId) throw new AppError('Clínica ativa não informada.', 400)

  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  const rawItems = data.items || data.products || []

  // Só aceita insumos que pertencem a ESTA clínica (o banco também garante, via FK composta).
  const productIds = [...new Set(rawItems.map((i) => i.productId))]
  if (productIds.length !== rawItems.length) {
    throw new AppError('Há insumos repetidos na ficha técnica.', 400)
  }
  if (productIds.length > 0) {
    const owned = await prisma.product.count({ where: { id: { in: productIds }, tenantId, clinicId } })
    if (owned !== productIds.length) {
      throw new AppError('Um ou mais insumos não pertencem a esta unidade.', 400)
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.procedureProduct.deleteMany({
      where: { procedureId, tenantId, clinicId },
    })

    if (rawItems.length > 0) {
      await tx.procedureProduct.createMany({
        data: rawItems.map((item) => ({
          tenantId,
          clinicId,
          procedureId,
          productId: item.productId,
          quantity: Number(item.quantity),
          unit: (item.unit as UnitType) || 'UN',
        })),
      })
    }

    return tx.procedureProduct.findMany({
      where: { procedureId, tenantId, clinicId },
      include: { product: { select: PRODUCT_SELECT } },
    })
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'PROCEDURE',
    entityId: procedureId,
    details: `Atualizou a ficha técnica do procedimento "${procedure.name}" (${rawItems.length} insumos vinculados)`,
  })

  return result
}

// ─── Get Ficha Técnica (da clínica) ───────────────────────────────────────────

export async function getProcedureProducts(tenantId: string, clinicId: string, procedureId: string) {
  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  return prisma.procedureProduct.findMany({
    where: { procedureId, tenantId, clinicId },
    include: { product: { select: PRODUCT_SELECT } },
  })
}
