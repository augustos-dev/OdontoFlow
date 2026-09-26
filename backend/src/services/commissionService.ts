import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type { UserRole } from '@prisma/client'
import type {
  CalculateCommissionDTO,
  FilterCommissionDTO,
  PayCommissionDTO,
} from '../types/commission.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export async function list(tenantId: string, clinicId: string, filters: FilterCommissionDTO) {
  return prisma.dentistCommission.findMany({
    where: {
      tenantId,
      clinicId,
      ...(filters.dentistId && { dentistId: filters.dentistId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && filters.endDate && {
        createdAt: {
          gte: new Date(`${filters.startDate}T00:00:00.000Z`),
          lte: new Date(`${filters.endDate}T23:59:59.999Z`),
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
  data: CalculateCommissionDTO,
  actor?: ActorContext
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

  const netBaseAmount = Math.max(0, gross - materialsCost)
  const commissionAmount = Number(((netBaseAmount * percentage) / 100).toFixed(2))

  const commission = await prisma.dentistCommission.create({
    data: {
      tenantId,
      clinicId,
      dentistId: data.dentistId,
      treatmentPlanId: data.treatmentPlanId || null,
      procedureId: data.procedureId || null,
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

  if (actor) {
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'CREATE',
      entity: 'DENTIST_COMMISSION',
      entityId: commission.id,
      details: `Gerou comissão de R$ ${commissionAmount.toFixed(2)} para Dr(a). ${dentist.name}`,
    })
  }

  return commission
}

export async function markAsPaid(
  tenantId: string,
  clinicId: string,
  commissionId: string,
  data?: PayCommissionDTO,
  actor?: ActorContext
) {
  const commission = await prisma.dentistCommission.findFirst({
    where: { id: commissionId, tenantId, clinicId },
    include: { dentist: { select: { name: true } } },
  })

  if (!commission) {
    throw new AppError('Registro de comissão não encontrado.', 404)
  }

  if (commission.status === 'PAID') {
    throw new AppError('Esta comissão já foi liquidada.', 400)
  }

  const updatedCommission = await prisma.dentistCommission.update({
    where: { id: commissionId },
    data: {
      status: 'PAID',
      paidAt: data?.paymentDate ? new Date(data.paymentDate) : new Date(),
      paymentMethod: data?.paymentMethod || 'PIX',
      paymentNotes: data?.notes || null,
      receiptFileUrl: data?.receiptFileUrl || null,
    },
    include: {
      dentist: { select: { name: true } },
    },
  })

  if (actor) {
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'ADMIN',
      action: 'UPDATE',
      entity: 'DENTIST_COMMISSION',
      entityId: commissionId,
      details: `Liquidou repasse de R$ ${Number(updatedCommission.commissionAmount).toFixed(2)} para Dr(a). ${commission.dentist?.name}`,
    })
  }

  return updatedCommission
}