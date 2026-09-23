import { Router } from 'express'
import {
  listCommissionsController,
  createCommissionController,
  payCommissionController,
} from '../../controllers/commissionController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /commissions:
 *   get:
 *     summary: Lista comissões e repasses de cirurgiões-dentistas
 *     tags: [Commissions]
 *     parameters:
 *       - in: query
 *         name: dentistId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, PAID, CANCELED] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de repasses retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/DentistCommission' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', authorize('ADMIN', 'DENTIST'), listCommissionsController)

/**
 * @openapi
 * /commissions:
 *   post:
 *     summary: Calcula e lança comissão descontando custo real dos insumos da Ficha Técnica (Apenas ADMIN)
 *     tags: [Commissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommissionDTO'
 *     responses:
 *       201:
 *         description: Comissão calculada e lançada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/DentistCommission' }
 *       400:
 *         description: Valor bruto inválido
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', authorize('ADMIN'), createCommissionController)

/**
 * @openapi
 * /commissions/{id}/pay:
 *   patch:
 *     summary: Liquida e marca comissão como paga (Apenas ADMIN)
 *     tags: [Commissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Comissão liquidada com registro de data
 *       400:
 *         description: Comissão já liquidada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/pay', authorize('ADMIN'), payCommissionController)

export default router