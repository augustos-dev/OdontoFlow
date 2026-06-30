// backend/src/routes/dashboard.routes.ts

import { Router } from 'express'
import {
  getDashboardSummaryController,
  getRevenueChartController,
  getUpcomingAppointmentsController,
  getTopDentistsController,
} from '../../controllers/dashboardController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas do dashboard são privadas e exclusivas de ADMIN ─────────

router.use(authenticate)
router.use(authorize('ADMIN'))

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     summary: Retorna visão geral consolidada (pacientes, agendamentos, financeiro, estoque)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Resumo do dia, semana e mês
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSummary'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/summary', getDashboardSummaryController)

/**
 * @openapi
 * /dashboard/revenue-chart:
 *   get:
 *     summary: Retorna receita e despesa diária para gráfico no período informado
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Padrão é o início do mês atual
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Padrão é o fim do mês atual
 *     responses:
 *       200:
 *         description: Array com receitas, despesas e lucro por dia
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/revenue-chart', getRevenueChartController)

/**
 * @openapi
 * /dashboard/upcoming-appointments:
 *   get:
 *     summary: Lista os próximos 10 agendamentos confirmados ou agendados
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Lista de próximos agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Appointment' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/upcoming-appointments', getUpcomingAppointmentsController)

/**
 * @openapi
 * /dashboard/top-dentists:
 *   get:
 *     summary: Ranking dos 5 dentistas com mais atendimentos finalizados no mês
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Lista ordenada de dentistas por número de atendimentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   dentistId: { type: string, format: uuid }
 *                   name: { type: string }
 *                   cro: { type: string }
 *                   appointmentsCount: { type: integer }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/top-dentists', getTopDentistsController)

export default router