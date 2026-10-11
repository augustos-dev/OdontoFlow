import { Router } from 'express'
import {
  listCommissionsController,
  createCommissionController,
  payCommissionController,
} from '../controllers/commissionController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { can } from '../middlewares/rbac.middleware'
import { requireFeature } from '../middlewares/planMiddleware'

const commissionRouter = Router()

commissionRouter.use(authenticate)
// Módulo de repasses e comissões exige plano PREMIUM ou superior
commissionRouter.use(requireFeature('COMMISSIONS'))

commissionRouter.get('/', can('COMMISSIONS', 'READ'), listCommissionsController)
commissionRouter.post('/', authorize('ADMIN'), createCommissionController)
commissionRouter.patch('/:id/pay', authorize('ADMIN'), payCommissionController)

export default commissionRouter