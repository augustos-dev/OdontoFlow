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
import { requireFeature } from '../middlewares/planMiddleware'

const transactionRoute = Router()

transactionRoute.use(authenticate)

// Relatório DRE analítico disponível a partir do plano PREMIUM
transactionRoute.get(
  '/report',
  requireFeature('ADVANCED_FINANCIAL'),
  can('FINANCIAL', 'READ'),
  getFinancialReportController
)

transactionRoute.get('/', can('FINANCIAL', 'READ'), listTransactionsController)
transactionRoute.get('/:id', can('FINANCIAL', 'READ'), getTransactionByIdController)

transactionRoute.post('/', can('FINANCIAL', 'CREATE'), createTransactionController)
transactionRoute.put('/:id', can('FINANCIAL', 'UPDATE'), updateTransactionController)
transactionRoute.patch('/:id/reconcile', can('FINANCIAL', 'UPDATE'), reconcileTransactionController)
transactionRoute.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default transactionRoute