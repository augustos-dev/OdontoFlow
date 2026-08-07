import { Prisma, $Enums, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFiltersDTO,
  TransactionReportDTO,
} from '../types/transaction.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTransaction(
  tenantId: string,
  clinicId: string,
  data: CreateTransactionDTO,
  actor: ActorContext
) {
  const { type, amount, paymentMethod, description, category, appointmentId, paidAt } = data

  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, clinicId },
    })
    if (!appointment) throw new AppError('Agendamento não encontrado.', 404)

    const existing = await prisma.transaction.findUnique({ where: { appointmentId } })
    if (existing) throw new AppError('Já existe uma transação vinculada a este agendamento.', 409)

    if (appointment.status !== 'FINALIZADO') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'FINALIZADO' },
      })
    }
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
      appointmentId: appointmentId ?? null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    },
    include: {
      appointment: {
        select: {
          id: true,
          dateTime: true,
          patient: { select: { id: true, name: true } },
        },
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
    entity: 'TRANSACTION',
    entityId: transaction.id,
    details: `Registrou ${type}: R$ ${Number(amount).toFixed(2)} (${paymentMethod}) - ${description || category}`,
  })

  return transaction
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTransactions(
  tenantId: string,
  clinicId: string,
  filters: TransactionFiltersDTO
) {
  const { type, paymentMethod, category, startDate, endDate, page = 1, limit = 20 } = filters
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
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paidAt: 'desc' },
      include: {
        appointment: {
          select: {
            id: true,
            dateTime: true,
            patient: { select: { id: true, name: true } },
          },
        },
      },
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
    include: {
      appointment: {
        select: {
          id: true,
          dateTime: true,
          type: true,
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
      },
    },
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

  if (transaction.appointmentId && data.amount) {
    throw new AppError('Não é possível alterar o valor de uma transação vinculada a um agendamento.', 400)
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...data,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
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
    entity: 'TRANSACTION',
    entityId: transactionId,
    details: `Atualizou transação (${transaction.type}). Novo valor: R$ ${Number(updatedTransaction.amount).toFixed(2)}`,
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