// backend/src/services/clinic.service.ts

import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { CreateClinicDTO, UpdateClinicDTO, ClinicFiltersDTO } from '../types/clinics.types'

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createClinic(tenantId: string, data: CreateClinicDTO) {
  const { name, cnpj, phone, email, address, logoUrl } = data

  // Valida tenant existe e está ativo
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)
  if (!tenant.isActive) throw new AppError('Assinatura inativa. Não é possível criar novas clínicas.', 403)

  // CNPJ é único globalmente no sistema (não só por tenant)
  if (cnpj) {
    const existing = await prisma.clinic.findUnique({ where: { cnpj } })
    if (existing) throw new AppError('CNPJ já cadastrado em outra clínica.', 409)
  }

  return prisma.clinic.create({
    data: { tenantId, name, cnpj, phone, email, address, logoUrl },
  })
}

// ─── List ─────────────────────────────────────────────────────────────────────

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

// ─── Get by ID ────────────────────────────────────────────────────────────────

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

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateClinic(
  tenantId: string,
  clinicId: string,
  data: UpdateClinicDTO
) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  if (data.cnpj && data.cnpj !== clinic.cnpj) {
    const existing = await prisma.clinic.findUnique({ where: { cnpj: data.cnpj } })
    if (existing) throw new AppError('CNPJ já cadastrado em outra clínica.', 409)
  }

  return prisma.clinic.update({
    where: { id: clinicId },
    data,
  })
}

// ─── Deactivate ───────────────────────────────────────────────────────────────

export async function deactivateClinic(tenantId: string, clinicId: string) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)

  if (!clinic.isActive) throw new AppError('Clínica já está inativa.', 400)

  // Verifica se é a última clínica ativa do tenant — não pode desativar todas
  const activeClinicsCount = await prisma.clinic.count({
    where: { tenantId, isActive: true },
  })

  if (activeClinicsCount <= 1) {
    throw new AppError('Não é possível desativar a única clínica ativa do tenant.', 400)
  }

  return prisma.clinic.update({
    where: { id: clinicId },
    data: { isActive: false },
  })
}

// ─── Reactivate ───────────────────────────────────────────────────────────────

export async function reactivateClinic(tenantId: string, clinicId: string) {
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId },
  })

  if (!clinic) throw new AppError('Clínica não encontrada.', 404)
  if (clinic.isActive) throw new AppError('Clínica já está ativa.', 400)

  return prisma.clinic.update({
    where: { id: clinicId },
    data: { isActive: true },
  })
}