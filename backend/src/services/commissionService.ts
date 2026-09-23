import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { CalculateCommissionDTO, FilterCommissionDTO } from '../types/commission.types'

export async function list(tenantId: string, clinicId: string, filters: FilterCommissionDTO) {
  return prisma.dentistCommission.findMany({
    where: {
      tenantId,
      clinicId,
      ...(filters.dentistId && { dentistId: filters.dentistId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && filters.endDate && {
        createdAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      }),
    },
    include: {
      dentist: { select: { id: true, name: true, cro: true } },
      procedure: { select: { id: true, name: true, code: true } },
      treatmentPlan: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function calculateAndCreate(
  tenantId: string,
  clinicId: string,
  data: CalculateCommissionDTO
) {
  const dentist = await prisma.user.findFirst({
    where: { id: data.dentistId, tenantId, clinicId },
  })

  if (!dentist) {
    throw new AppError('Dentista não encontrado na clínica.', 404)
  }

  const percentage = Number(data.percentage ?? dentist.defaultCommissionPercentage ?? 0)
  const gross = Number(data.grossAmount)
  const materialsCost = Number(data.materialsCost || 0)

  if (gross <= 0) {
    throw new AppError('O valor bruto do procedimento deve ser maior que zero.', 400)
  }

  // Base Líquida Real = Bruto - Custo dos Insumos
  const netBaseAmount = Math.max(0, gross - materialsCost)
  const commissionAmount = Number(((netBaseAmount * percentage) / 100).toFixed(2))

  return prisma.dentistCommission.create({
    data: {
      tenantId,
      clinicId,
      dentistId: data.dentistId,
      treatmentPlanId: data.treatmentPlanId,
      procedureId: data.procedureId,
      grossAmount: gross,
      materialsCost,
      netBaseAmount,
      percentage,
      commissionAmount,
      status: 'PENDING',
    },
    include: {
      dentist: { select: { name: true, cro: true } },
    },
  })
}

export async function markAsPaid(tenantId: string, clinicId: string, commissionId: string) {
  const commission = await prisma.dentistCommission.findFirst({
    where: { id: commissionId, tenantId, clinicId },
  })

  if (!commission) {
    throw new AppError('Registro de comissão não encontrado.', 404)
  }

  if (commission.status === 'PAID') {
    throw new AppError('Esta comissão já foi liquidada.', 400)
  }

  return prisma.dentistCommission.update({
    where: { id: commissionId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  })
}