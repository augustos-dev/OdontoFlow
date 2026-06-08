// backend/src/controllers/transaction.controller.ts

import type { Request, Response, NextFunction } from 'express'
import * as transactionService from '../services/transactionService'
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFiltersDTO,
  TransactionReportDTO,
} from '../types/transaction.types'

export async function createTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const transaction = await transactionService.createTransaction(tenantId, clinicId, req.body as CreateTransactionDTO)
    res.status(201).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function listTransactionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: TransactionFiltersDTO = {
      type: req.query.type as 'RECEITA' | 'DESPESA',
      paymentMethod: req.query.paymentMethod as string,
      category: req.query.category as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await transactionService.listTransactions(tenantId, clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getTransactionByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const transaction = await transactionService.getTransactionById(tenantId, clinicId, id as string)
    res.status(200).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function updateTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const transaction = await transactionService.updateTransaction(tenantId, clinicId, id as string, req.body as UpdateTransactionDTO)
    res.status(200).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function deleteTransactionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    await transactionService.deleteTransaction(tenantId, clinicId, id as string)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function getFinancialReportController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: TransactionReportDTO = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    }
    if (!filters.startDate || !filters.endDate) {
      res.status(400).json({ message: 'Informe startDate e endDate para o relatório.' })
      return
    }
    const report = await transactionService.getFinancialReport(tenantId, clinicId, filters)
    res.status(200).json(report)
  } catch (error) {
    next(error)
  }
}