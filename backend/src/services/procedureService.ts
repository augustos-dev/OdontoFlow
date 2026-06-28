import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { CreateProcedureDTO, UpdateProcedureDTO, ProcedureFiltersDTO } from '../types/procedure.types'

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProcedure(tenantId: string, data: CreateProcedureDTO) {
  const { name, code, basePrice } = data

  // Nome único dentro do tenant — catálogo compartilhado entre todas as filiais
  const existing = await prisma.procedure.findUnique({
    where: { tenantId_name: { tenantId, name } },
  })
  if (existing) throw new AppError('Já existe um procedimento com este nome.', 409)

  return prisma.procedure.create({
    data: { tenantId, name, code, basePrice },
  })
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
  data: UpdateProcedureDTO
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

  return prisma.procedure.update({
    where: { id: procedureId },
    data,
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProcedure(tenantId: string, procedureId: string) {
  const procedure = await prisma.procedure.findFirst({
    where: { id: procedureId, tenantId },
  })

  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  // Verifica se o procedimento está em uso em algum plano de tratamento
  const inUse = await prisma.planProcedure.findFirst({
    where: { procedureId },
  })
  if (inUse) {
    throw new AppError('Procedimento não pode ser excluído pois está vinculado a planos de tratamento.', 400)
  }

  await prisma.procedure.delete({ where: { id: procedureId } })
}