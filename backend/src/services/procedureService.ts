import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type { CreateProcedureDTO, UpdateProcedureDTO, ProcedureFiltersDTO } from '../types/procedure.types'

interface ActorContext {
  clinicId?: string
  userId: string
  userName: string
  userRole?: UserRole
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProcedure(tenantId: string, data: CreateProcedureDTO, actor: ActorContext) {
  const { name, code, basePrice } = data

  const existing = await prisma.procedure.findUnique({
    where: { tenantId_name: { tenantId, name } },
  })
  if (existing) throw new AppError('Já existe um procedimento com este nome.', 409)

  const procedure = await prisma.procedure.create({
    data: { tenantId, name, code, basePrice },
  })

  // 🟢 Log de Auditoria
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

export async function listProcedures(tenantId: string, filters: ProcedureFiltersDTO) {
  const { name, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.ProcedureWhereInput = {
    tenantId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
  }

  const [procedures, total] = await Promise.all([
    prisma.procedure.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.procedure.count({ where }),
  ])

  return {
    data: procedures,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getProcedureById(tenantId: string, procedureId: string) {
  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  return procedure
}

// ─── Update ───────────────────────────────────────────────────────────────────

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

  if (data.name && data.name !== procedure.name) {
    const existing = await prisma.procedure.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
    })
    if (existing) throw new AppError('Já existe um procedimento com este nome.', 409)
  }

  const updatedProcedure = await prisma.procedure.update({
    where: { id: procedureId },
    data,
  })

  // 🟢 Log de Auditoria
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

  const inUse = await prisma.planProcedure.findFirst({
    where: { procedureId },
  })
  if (inUse) {
    throw new AppError('Procedimento não pode ser excluído pois está vinculado a planos de tratamento.', 400)
  }

  await prisma.procedure.delete({ where: { id: procedureId } })

  // 🟢 Log de Auditoria
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