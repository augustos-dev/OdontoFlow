import { Prisma, $Enums, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type {
  CreateTreatmentPlanDTO,
  UpdateTreatmentPlanDTO,
  UpdateTreatmentPlanStatusDTO,
  TreatmentPlanFiltersDTO,
  PlanProcedureItemDTO,
} from '../types/treatment.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcTotalAmount(procedures: PlanProcedureItemDTO[]): number {
  return procedures.reduce((sum, item) => sum + item.quantity * item.actualPrice, 0)
}

async function validateProcedures(tenantId: string, procedures: PlanProcedureItemDTO[]) {
  if (procedures.length === 0) {
    throw new AppError('O plano de tratamento deve ter ao menos um procedimento.', 400)
  }

  const procedureIds = procedures.map((p) => p.procedureId)
  const found = await prisma.procedure.findMany({
    where: { id: { in: procedureIds }, tenantId },
    select: { id: true },
  })

  if (found.length !== new Set(procedureIds).size) {
    throw new AppError('Um ou mais procedimentos informados não existem no catálogo.', 404)
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTreatmentPlan(
  tenantId: string,
  clinicId: string,
  data: CreateTreatmentPlanDTO,
  actor: ActorContext
) {
  const { patientId, dentistId, title, notes, procedures } = data

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId, clinicId, deletedAt: null },
  })
  if (!patient) throw new AppError('Paciente não encontrado.', 404)

  const dentist = await prisma.user.findFirst({
    where: { id: dentistId, tenantId, clinicId, role: 'DENTIST', isActive: true },
  })
  if (!dentist) throw new AppError('Dentista não encontrado ou inativo.', 404)

  await validateProcedures(tenantId, procedures)

  const totalAmount = calcTotalAmount(procedures)

  const treatmentPlan = await prisma.treatmentPlan.create({
    data: {
      tenantId,
      clinicId,
      patientId,
      dentistId,
      title,
      notes,
      totalAmount,
      planProcedures: {
        create: procedures.map((item) => ({
          tenantId,
          procedureId: item.procedureId,
          quantity: item.quantity,
          actualPrice: item.actualPrice,
        })),
      },
    },
    include: {
      patient: { select: { id: true, name: true } },
      dentist: { select: { id: true, name: true } },
      planProcedures: {
        include: { procedure: { select: { id: true, name: true, code: true } } },
      },
    },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'CREATE',
    entity: 'TREATMENT_PLAN',
    entityId: treatmentPlan.id,
    details: `Criou plano de tratamento "${treatmentPlan.title}" para o paciente ${patient.name} no valor de R$ ${totalAmount.toFixed(2)}`,
  })

  return treatmentPlan
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTreatmentPlans(
  tenantId: string,
  clinicId: string,
  filters: TreatmentPlanFiltersDTO
) {
  const { patientId, dentistId, status, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const where: Prisma.TreatmentPlanWhereInput = {
    tenantId,
    clinicId,
    ...(patientId && { patientId }),
    ...(dentistId && { dentistId }),
    ...(status && { status: status as $Enums.TreatmentStatus }),
  }

  const [plans, total] = await Promise.all([
    prisma.treatmentPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        planProcedures: {
          include: { procedure: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.treatmentPlan.count({ where }),
  ])

  return {
    data: plans,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getTreatmentPlanById(
  tenantId: string,
  clinicId: string,
  planId: string
) {
  const plan = await prisma.treatmentPlan.findFirst({
    where: { id: planId, tenantId, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      dentist: { select: { id: true, name: true, cro: true } },
      planProcedures: {
        include: { procedure: { select: { id: true, name: true, code: true, basePrice: true } } },
      },
    },
  })

  if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)

  return plan
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTreatmentPlan(
  tenantId: string,
  clinicId: string,
  planId: string,
  data: UpdateTreatmentPlanDTO,
  actor: ActorContext
) {
  const plan = await prisma.treatmentPlan.findFirst({
    where: { id: planId, tenantId, clinicId },
  })

  if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)

  if (['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(plan.status) && data.procedures) {
    throw new AppError('Não é possível alterar os procedimentos de um plano já aprovado.', 400)
  }

  let totalAmount = plan.totalAmount

  if (data.procedures) {
    await validateProcedures(tenantId, data.procedures)
    totalAmount = new Prisma.Decimal(calcTotalAmount(data.procedures))

    await prisma.planProcedure.deleteMany({ where: { treatmentPlanId: planId } })
    await prisma.planProcedure.createMany({
      data: data.procedures.map((item) => ({
        tenantId,
        treatmentPlanId: planId,
        procedureId: item.procedureId,
        quantity: item.quantity,
        actualPrice: item.actualPrice,
      })),
    })
  }

  const updatedPlan = await prisma.treatmentPlan.update({
    where: { id: planId },
    data: {
      title: data.title,
      notes: data.notes,
      totalAmount,
    },
    include: {
      patient: { select: { id: true, name: true } },
      dentist: { select: { id: true, name: true } },
      planProcedures: {
        include: { procedure: { select: { id: true, name: true } } },
      },
    },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'UPDATE',
    entity: 'TREATMENT_PLAN',
    entityId: planId,
    details: `Atualizou plano de tratamento "${updatedPlan.title}". Novo total: R$ ${Number(totalAmount).toFixed(2)}`,
  })

  return updatedPlan
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateTreatmentPlanStatus(
  tenantId: string,
  clinicId: string,
  planId: string,
  data: UpdateTreatmentPlanStatusDTO,
  actor: ActorContext
) {
  const plan = await prisma.treatmentPlan.findFirst({
    where: { id: planId, tenantId, clinicId },
  })

  if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)

  if (['CONCLUIDO', 'RECUSADO'].includes(plan.status)) {
    throw new AppError(`Plano de tratamento já está ${plan.status.toLowerCase()} e não pode mudar de status.`, 400)
  }

  const validTransitions: Record<string, string[]> = {
    ORCAMENTO: ['APROVADO', 'RECUSADO'],
    APROVADO: ['EM_ANDAMENTO', 'RECUSADO'],
    EM_ANDAMENTO: ['CONCLUIDO'],
  }

  if (!validTransitions[plan.status]?.includes(data.status)) {
    throw new AppError(
      `Transição inválida: não é possível mudar de ${plan.status} para ${data.status}.`,
      400
    )
  }

  const updatedPlan = await prisma.treatmentPlan.update({
    where: { id: planId },
    data: { status: data.status },
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'UPDATE',
    entity: 'TREATMENT_PLAN',
    entityId: planId,
    details: `Alterou status do orçamento "${plan.title}" de ${plan.status} para ${data.status}`,
  })

  return updatedPlan
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTreatmentPlan(
  tenantId: string,
  clinicId: string,
  planId: string,
  actor: ActorContext
) {
  const plan = await prisma.treatmentPlan.findFirst({
    where: { id: planId, tenantId, clinicId },
  })

  if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)

  if (['APROVADO', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(plan.status)) {
    throw new AppError('Não é possível deletar um plano já aprovado ou em andamento.', 400)
  }

  await prisma.treatmentPlan.delete({ where: { id: planId } })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'DELETE',
    entity: 'TREATMENT_PLAN',
    entityId: planId,
    details: `Deletou o orçamento em rascunho: "${plan.title}"`,
  })
}