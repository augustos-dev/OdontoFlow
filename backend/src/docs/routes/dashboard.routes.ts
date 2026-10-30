import { Router } from 'express'
import {
  getDashboardSummaryController,
  getRevenueChartController,
  getUpcomingAppointmentsController,
  getTopDentistsController,
  getClinicsBreakdownController,
} from '../../controllers/dashboardController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate, authorize('ADMIN'))

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     summary: Retorna os indicadores de pacientes, agenda, financeiro e estoque
 *     description: Por padrão consulta a unidade ativa. OWNER pode enviar scope=network para consolidar a rede Enterprise.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [network] }
 *         description: Use network para visão consolidada; exclusiva do OWNER.
 *     responses:
 *       200:
 *         description: Resumo do dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     newThisMonth: { type: integer }
 *                 appointments:
 *                   type: object
 *                   properties:
 *                     today: { type: integer }
 *                     thisWeek: { type: integer }
 *                     thisMonth: { type: integer }
 *                     byStatus: { type: object, additionalProperties: { type: integer } }
 *                 financial:
 *                   type: object
 *                   properties:
 *                     todayRevenue: { type: number }
 *                     weekRevenue: { type: number }
 *                     monthRevenue: { type: number }
 *                     monthExpenses: { type: number }
 *                     monthProfit: { type: number }
 *                 inventory:
 *                   type: object
 *                   properties:
 *                     lowStockCount: { type: integer }
 *                     expiringCount: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas ADMIN/OWNER; scope=network é exclusivo do OWNER }
 */
router.get('/summary', getDashboardSummaryController)

/**
 * @openapi
 * /dashboard/revenue-chart:
 *   get:
 *     summary: Retorna receitas, despesas e lucro por dia no período
 *     description: Por padrão usa o mês atual. OWNER pode usar scope=network para consolidar todas as unidades Enterprise.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Data inicial inclusiva (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Data final inclusiva (YYYY-MM-DD)
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [network] }
 *         description: Use network para visão consolidada; exclusiva do OWNER.
 *     responses:
 *       200:
 *         description: Série diária de receitas, despesas e lucro
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date: { type: string, format: date }
 *                   receitas: { type: number }
 *                   despesas: { type: number }
 *                   lucro: { type: number }
 *       400: { description: Período inválido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas ADMIN/OWNER; scope=network é exclusivo do OWNER }
 */
router.get('/revenue-chart', getRevenueChartController)

/**
 * @openapi
 * /dashboard/upcoming-appointments:
 *   get:
 *     summary: Lista os próximos agendamentos da unidade ativa
 *     description: OWNER pode enviar scope=network para incluir todas as unidades Enterprise.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [network] }
 *         description: Use network para visão consolidada; exclusiva do OWNER.
 *     responses:
 *       200:
 *         description: Próximos agendamentos
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas ADMIN/OWNER; scope=network é exclusivo do OWNER }
 */
router.get('/upcoming-appointments', getUpcomingAppointmentsController)

/**
 * @openapi
 * /dashboard/top-dentists:
 *   get:
 *     summary: Retorna os dentistas com mais atendimentos no mês
 *     description: OWNER pode enviar scope=network para consolidar os resultados entre unidades Enterprise.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [network] }
 *         description: Use network para visão consolidada; exclusiva do OWNER.
 *     responses:
 *       200:
 *         description: Ranking de dentistas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   dentistId: { type: string, format: uuid }
 *                   name: { type: string }
 *                   cro: { type: string, nullable: true }
 *                   appointmentsCount: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas ADMIN/OWNER; scope=network é exclusivo do OWNER }
 */
router.get('/top-dentists', getTopDentistsController)

/**
 * @openapi
 * /dashboard/clinics-breakdown:
 *   get:
 *     summary: Compara indicadores financeiros e clínicos entre unidades
 *     description: Endpoint exclusivo do OWNER da rede Enterprise; os dados são referentes ao mês atual.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicadores do mês agrupados por unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   clinicId: { type: string, format: uuid }
 *                   name: { type: string }
 *                   revenue: { type: number }
 *                   expenses: { type: number }
 *                   profit: { type: number }
 *                   appointments: { type: integer }
 *                   newPatients: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Endpoint exclusivo do OWNER }
 */
router.get('/clinics-breakdown', getClinicsBreakdownController)

export default router
