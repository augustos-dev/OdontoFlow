
import { Router } from 'express'
import {
  createTransactionController,
  listTransactionsController,
  getTransactionByIdController,
  updateTransactionController,
  deleteTransactionController,
  getFinancialReportController,
} from '../controllers/transactionController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const transactionRoute = Router()

// ─── Todas as rotas de transações são privadas ────────────────────────────────

transactionRoute.use(authenticate)

// ─── Rotas Privadas — Leitura ─────────────────────────────────────────────────

transactionRoute.get('/', listTransactionsController)
transactionRoute.get('/report', authorize('ADMIN'), getFinancialReportController)
transactionRoute.get('/:id', getTransactionByIdController)

// ─── Rotas Privadas — Escrita (ADMIN, SECRETARY) ──────────────────────────────

transactionRoute.post('/', authorize('ADMIN', 'SECRETARY'), createTransactionController)
transactionRoute.put('/:id', authorize('ADMIN', 'SECRETARY'), updateTransactionController)

// ─── Rotas Privadas — Exclusão (apenas ADMIN) ────────────────────────────────

transactionRoute.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default transactionRoute