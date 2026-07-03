// backend/src/routes/treatment.routes.ts

import { Router } from 'express'
import {
  createTreatmentPlanController,
  listTreatmentPlansController,
  getTreatmentPlanByIdController,
  updateTreatmentPlanController,
  updateTreatmentPlanStatusController,
  deleteTreatmentPlanController,
} from '../../controllers/treatmentController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /treatment-plans:
 *   get:
 *     summary: Lista os planos de tratamento e orçamentos
 *     tags: [Treatment Plans]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ORCAMENTO, APROVADO, EM_ANDAMENTO, CONCLUIDO, RECUSADO]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de planos de tratamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       title: { type: string }
 *                       status: { type: string }
 *                       totalAmount: { type: number }
 *                       createdAt: { type: string, format: date-time }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', listTreatmentPlansController)

/**
 * @openapi
 * /treatment-plans/{id}:
 *   get:
 *     summary: Busca um plano de tratamento por ID com procedimentos vinculados
 *     tags: [Treatment Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Plano de tratamento com lista de procedimentos
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getTreatmentPlanByIdController)

/**
 * @openapi
 * /treatment-plans:
 *   post:
 *     summary: Cria um novo plano de tratamento ou orçamento (ADMIN ou DENTIST)
 *     tags: [Treatment Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, dentistId, title, totalAmount]
 *             properties:
 *               patientId: { type: string, format: uuid }
 *               dentistId: { type: string, format: uuid }
 *               title: { type: string, example: 'Reabilitação Oral Superior' }
 *               totalAmount: { type: number, example: 3500.00 }
 *               notes: { type: string }
 *               procedures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [procedureId, quantity, actualPrice]
 *                   properties:
 *                     procedureId: { type: string, format: uuid }
 *                     quantity: { type: integer, example: 1 }
 *                     actualPrice: { type: number, example: 350.00 }
 *     responses:
 *       201:
 *         description: Plano de tratamento criado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', authorize('ADMIN', 'DENTIST'), createTreatmentPlanController)

/**
 * @openapi
 * /treatment-plans/{id}:
 *   put:
 *     summary: Atualiza um plano de tratamento (ADMIN ou DENTIST)
 *     tags: [Treatment Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               totalAmount: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN', 'DENTIST'), updateTreatmentPlanController)

/**
 * @openapi
 * /treatment-plans/{id}/status:
 *   patch:
 *     summary: Atualiza o status de um plano de tratamento
 *     tags: [Treatment Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ORCAMENTO, APROVADO, EM_ANDAMENTO, CONCLUIDO, RECUSADO]
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/status', authorize('ADMIN', 'DENTIST', 'SECRETARY'), updateTreatmentPlanStatusController)

/**
 * @openapi
 * /treatment-plans/{id}:
 *   delete:
 *     summary: Remove um plano de tratamento (apenas ADMIN)
 *     tags: [Treatment Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Plano removido com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteTreatmentPlanController)

export default router