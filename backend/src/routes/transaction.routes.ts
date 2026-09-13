import { Router } from 'express'
import {
  createTransactionController,
  listTransactionsController,
  getTransactionByIdController,
  updateTransactionController,
  reconcileTransactionController,
  deleteTransactionController,
  getFinancialReportController,
} from '../controllers/transactionController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { can } from '../middlewares/rbac.middleware'

const transactionRoute = Router()

// Todas as rotas de transações exigem autenticação
transactionRoute.use(authenticate)

// Relatórios / DRE (rota estática antes de /:id)
transactionRoute.get('/report', can('FINANCIAL', 'READ'), getFinancialReportController)

// Leitura
transactionRoute.get('/', can('FINANCIAL', 'READ'), listTransactionsController)
transactionRoute.get('/:id', can('FINANCIAL', 'READ'), getTransactionByIdController)

// Escrita / Conciliação
transactionRoute.post('/', can('FINANCIAL', 'CREATE'), createTransactionController)
transactionRoute.put('/:id', can('FINANCIAL', 'UPDATE'), updateTransactionController)
transactionRoute.patch('/:id/reconcile', can('FINANCIAL', 'UPDATE'), reconcileTransactionController)

// Exclusão (apenas ADMIN)
transactionRoute.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default transactionRoute