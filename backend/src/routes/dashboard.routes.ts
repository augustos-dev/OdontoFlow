
import { Router } from 'express'
import {
  getDashboardSummaryController,
  getRevenueChartController,
  getUpcomingAppointmentsController,
  getTopDentistsController,
} from '../controllers/dashboardController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas do dashboard são privadas e exclusivas de ADMIN ─────────

router.use(authenticate)
router.use(authorize('ADMIN'))

router.get('/summary', getDashboardSummaryController)
router.get('/revenue-chart', getRevenueChartController)
router.get('/upcoming-appointments', getUpcomingAppointmentsController)
router.get('/top-dentists', getTopDentistsController)

export default router