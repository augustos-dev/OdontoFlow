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

// Todas as rotas de transações são privadas
transactionRoute.use(authenticate)

// Rotas estáticas antes dos parâmetros dinâmicos (evita que /report caia em /:id)
transactionRoute.get('/report', authorize('ADMIN'), getFinancialReportController)

// Leitura
transactionRoute.get('/', listTransactionsController)
transactionRoute.get('/:id', getTransactionByIdController)

// Escrita (ADMIN, SECRETARY)
transactionRoute.post('/', authorize('ADMIN', 'SECRETARY'), createTransactionController)
transactionRoute.put('/:id', authorize('ADMIN', 'SECRETARY'), updateTransactionController)

// Exclusão (apenas ADMIN)
transactionRoute.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default transactionRoute