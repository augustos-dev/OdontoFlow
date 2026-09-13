import type { Request, Response, NextFunction } from 'express'
import * as transactionService from '../services/transactionService'
import type { UserRole, TransactionType, PaymentMethod } from '@prisma/client'
import type { AuthUserSession } from '../types/auth.types'
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFiltersDTO,
  TransactionReportDTO,
  ReconcileTransactionDTO,
} from '../types/transaction.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

function getActor(user: AuthUserSession) {
  return {
    userId: user.userId || (user.sub as string),
    userName: user.name || 'Usuário',
    userRole: user.role,
  }
}

export async function createTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(user)

    const transaction = await transactionService.createTransaction(
      user.tenantId,
      user.clinicId,
      req.body as CreateTransactionDTO,
      actor
    )
    res.status(201).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function listTransactionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const filters: TransactionFiltersDTO = {
      type: req.query.type as TransactionType | undefined,
      paymentMethod: req.query.paymentMethod as PaymentMethod | undefined,
      category: req.query.category as string | undefined,
      costCenter: req.query.costCenter as string | undefined,
      isReconciled: req.query.isReconciled !== undefined ? req.query.isReconciled === 'true' : undefined,
      supplierId: req.query.supplierId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await transactionService.listTransactions(user.tenantId, user.clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getTransactionByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const transaction = await transactionService.getTransactionById(user.tenantId, user.clinicId, id as string)
    res.status(200).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function updateTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(user)
    const { id } = req.params

    const transaction = await transactionService.updateTransaction(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateTransactionDTO,
      actor
    )
    res.status(200).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function reconcileTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(user)
    const { id } = req.params

    const transaction = await transactionService.setTransactionReconciliation(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as ReconcileTransactionDTO,
      actor
    )
    res.status(200).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function deleteTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(user)
    const { id } = req.params

    await transactionService.deleteTransaction(user.tenantId, user.clinicId, id as string, actor)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function getFinancialReportController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const filters: TransactionReportDTO = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      type: req.query.type as TransactionType | undefined,
      costCenter: req.query.costCenter as string | undefined,
      isReconciled: req.query.isReconciled !== undefined ? req.query.isReconciled === 'true' : undefined,
    }

    if (!filters.startDate || !filters.endDate) {
      res.status(400).json({ message: 'Informe startDate e endDate para o relatório.' })
      return
    }

    const report = await transactionService.getFinancialReport(user.tenantId, user.clinicId, filters)
    res.status(200).json(report)
  } catch (error) {
    next(error)
  }
}