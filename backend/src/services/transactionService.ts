import { Prisma, $Enums, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import { triggerAutoStockExit } from '../utils/stockAutoExit'
import { getTenantContext } from '../lib/tenantContext'
import { pick } from '../shared/pick'
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFiltersDTO,
  TransactionReportDTO,
  ReconcileTransactionDTO,
} from '../types/transaction.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

const TRANSACTION_INCLUDES = {
  appointment: {
    select: {
      id: true,
      dateTime: true,
      patient: { select: { id: true, name: true } },
      dentist: { select: { id: true, name: true } },
    },
  },
  supplier: {
    select: {
      id: true,
      name: true,
      cnpj: true,
    },
  },
  treatmentPlan: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.TransactionInclude

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTransaction(
  tenantId: string,
  clinicId: string,
  data: CreateTransactionDTO,
  actor: ActorContext
) {
  const {
    type,
    amount,
    paymentMethod,
    description,
    category,
    appointmentId,
    treatmentPlanId,
    supplierId,
    paidAt,
  } = data

  // Validação de vínculo com Agendamento
  // (a finalização do agendamento agora acontece DEPOIS de gravar a transação: antes, se a criação falhasse,
  //  o agendamento já tinha ficado FINALIZADO)
  let appointmentToFinalize: { id: string; procedureId: string | null } | null = null
  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, clinicId },
    })
    if (!appointment) throw new AppError('Agendamento não encontrado.', 404)

    const existing = await prisma.transaction.findUnique({ where: { appointmentId } })
    if (existing) throw new AppError('Já existe uma transação vinculada a este agendamento.', 409)

    if (appointment.status !== 'FINALIZADO') {
      appointmentToFinalize = { id: appointment.id, procedureId: appointment.procedureId }
    }
  }

  // Validação de vínculo com Fornecedor (comum em Despesas)
  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, clinicId },
    })
    if (!supplier) throw new AppError('Fornecedor não encontrado nesta unidade.', 404)
  }

  // Validação de vínculo com Plano de Tratamento
  // Enterprise: o pagamento pode ser recebido em outra unidade que não a do plano (a receita fica na unidade que recebeu).
  if (treatmentPlanId) {
    const ctx = await getTenantContext(tenantId)
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: treatmentPlanId, tenantId, ...(ctx.isNetwork ? {} : { clinicId }) },
    })
    if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)
  }

  const transaction = await prisma.transaction.create({
    data: {
      tenantId,
      clinicId,
      type,
      amount,
      paymentMethod,
      description,
      category,
      appointmentId: appointmentId || null,
      treatmentPlanId: treatmentPlanId || null,
      supplierId: supplierId || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
    include: TRANSACTION_INCLUDES,
  })

  if (appointmentToFinalize) {
    await prisma.appointment.update({
      where: { id: appointmentToFinalize.id },
      data: { status: 'FINALIZADO' },
    })

    // Exit Inteligente também quando o atendimento é finalizado pelo pagamento
    // (antes este caminho finalizava o agendamento SEM baixar estoque). A trava de idempotência evita baixa dupla.
    if (appointmentToFinalize.procedureId) {
      try {
        await triggerAutoStockExit({
          tenantId,
          clinicId,
          procedureId: appointmentToFinalize.procedureId,
          userId: actor.userId,
          appointmentId: appointmentToFinalize.id,
        })
      } catch (error) {
        console.error('[Exit Inteligente Error]: Falha na baixa de estoque via pagamento', error)
      }
    }
  }

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'CREATE',
    entity: 'TRANSACTION',
    entityId: transaction.id,
    details: `Registrou ${type}: R$ ${Number(amount).toFixed(2)} (${paymentMethod}) - ${description || category || 'Sem categoria'}${transaction.supplier ? ` | Fornecedor: ${transaction.supplier.name}` : ''}`,
  })

  return transaction
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTransactions(
  tenantId: string,
  clinicId: string,
  filters: TransactionFiltersDTO
) {
  const { type, paymentMethod, category, supplierId, startDate, endDate, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  let dateFilter: Prisma.TransactionWhereInput = {}
  if (startDate || endDate) {
    dateFilter = {
      paidAt: {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      },
    }
  }

  const where: Prisma.TransactionWhereInput = {
    tenantId,
    clinicId,
    ...dateFilter,
    ...(type && { type: type as $Enums.TransactionType }),
    ...(paymentMethod && { paymentMethod: paymentMethod as $Enums.PaymentMethod }),
    ...(category && { category: { contains: category, mode: 'insensitive' } }),
    ...(supplierId && { supplierId }),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paidAt: 'desc' },
      include: TRANSACTION_INCLUDES,
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    data: transactions,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getTransactionById(
  tenantId: string,
  clinicId: string,
  transactionId: string
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId, clinicId },
    include: TRANSACTION_INCLUDES,
  })

  if (!transaction) throw new AppError('Transação não encontrada.', 404)

  return transaction
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTransaction(
  tenantId: string,
  clinicId: string,
  transactionId: string,
  data: UpdateTransactionDTO,
  actor: ActorContext
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId, clinicId },
  })

  if (!transaction) throw new AppError('Transação não encontrada.', 404)

  if (transaction.appointmentId && data.amount !== undefined && Number(data.amount) !== Number(transaction.amount)) {
    throw new AppError('Não é possível alterar o valor de uma transação vinculada a um agendamento.', 400)
  }

  if (data.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId, clinicId },
    })
    if (!supplier) throw new AppError('Fornecedor não encontrado.', 404)
  }
  if (data.accountReceivableId) {
    const receivable = await prisma.accountReceivable.findFirst({
      where: { id: data.accountReceivableId, tenantId, clinicId },
      select: { id: true },
    })
    if (!receivable) throw new AppError('Recebível não encontrado nesta unidade.', 404)
  }

  // Lista explícita. O `...data` anterior deixava o cliente trocar tenantId/clinicId/appointmentId da transação
  // (o Prisma aceita FKs num update). Se o seu UpdateTransactionDTO tiver outro campo editável, inclua aqui.
  const editable = pick(data as Record<string, any>, [
    'type',
    'amount',
    'paymentMethod',
    'description',
    'category',
    'supplierId',
    'accountReceivableId',
    'treatmentPlanId',
    'costCenter',
    'isReconciled',
  ] as const)

  if (editable.treatmentPlanId) {
    const ctx = await getTenantContext(tenantId)
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: editable.treatmentPlanId, tenantId, ...(ctx.isNetwork ? {} : { clinicId }) },
      select: { id: true },
    })
    if (!plan) throw new AppError('Plano de tratamento não encontrado.', 404)
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...editable,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    },
    include: TRANSACTION_INCLUDES,
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'UPDATE',
    entity: 'TRANSACTION',
    entityId: transactionId,
    details: `Atualizou transação (${transaction.type}). Novo valor: R$ ${Number(updatedTransaction.amount).toFixed(2)}`,
  })

  return updatedTransaction
}

export async function setTransactionReconciliation(
  tenantId: string,
  clinicId: string,
  transactionId: string,
  data: ReconcileTransactionDTO,
  actor: ActorContext
) {
  if (typeof data?.isReconciled !== 'boolean') {
    throw new AppError('Informe um valor booleano para isReconciled.', 400)
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId, clinicId },
  })
  if (!transaction) throw new AppError('Transação não encontrada.', 404)

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { isReconciled: data.isReconciled },
    include: TRANSACTION_INCLUDES,
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'UPDATE',
    entity: 'TRANSACTION',
    entityId: transactionId,
    details: `${data.isReconciled ? 'Conciliou' : 'Reabriu'} a transação`,
  })

  return updatedTransaction
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTransaction(
  tenantId: string,
  clinicId: string,
  transactionId: string,
  actor: ActorContext
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId, clinicId },
  })

  if (!transaction) throw new AppError('Transação não encontrada.', 404)

  if (transaction.appointmentId) {
    throw new AppError('Transações vinculadas a agendamentos não podem ser deletadas. Estorne via nova transação.', 400)
  }

  await prisma.transaction.delete({ where: { id: transactionId } })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole,
    action: 'DELETE',
    entity: 'TRANSACTION',
    entityId: transactionId,
    details: `Deletou transação de ${transaction.type} no valor de R$ ${Number(transaction.amount).toFixed(2)} (${transaction.description || 'Sem descrição'})`,
  })
}

// ─── Report ───────────────────────────────────────────────────────────────────

export async function getFinancialReport(
  tenantId: string,
  clinicId: string,
  filters: TransactionReportDTO
) {
  const { startDate, endDate } = filters

  const where: Prisma.TransactionWhereInput = {
    tenantId,
    clinicId,
    paidAt: {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  }

  const [receitas, despesas, byPaymentMethod] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: 'RECEITA' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'DESPESA' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: { ...where, type: 'RECEITA' },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalReceitas = Number(receitas._sum.amount ?? 0)
  const totalDespesas = Number(despesas._sum.amount ?? 0)

  return {
    period: { startDate, endDate },
    summary: {
      totalReceitas,
      totalDespesas,
      lucro: totalReceitas - totalDespesas,
      totalTransacoes: receitas._count + despesas._count,
    },
    receitas: { total: totalReceitas, count: receitas._count },
    despesas: { total: totalDespesas, count: despesas._count },
    receitasPorMetodoPagamento: byPaymentMethod.map((item) => ({
      paymentMethod: item.paymentMethod,
      total: Number(item._sum.amount ?? 0),
      count: item._count,
    })),
  }
}