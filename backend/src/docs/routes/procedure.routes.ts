// backend/src/routes/procedure.routes.ts

import { Router } from 'express'
import {
  createProcedureController,
  listProceduresController,
  getProcedureByIdController,
  updateProcedureController,
  deleteProcedureController,
} from '../../controllers/procedureController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /procedures:
 *   get:
 *     summary: Lista o catálogo de procedimentos da clínica
 *     tags: [Procedures]
 *     responses:
 *       200:
 *         description: Lista de procedimentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string, example: 'Profilaxia' }
 *                   code: { type: string, example: '81000014' }
 *                   basePrice: { type: number, example: 150.00 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', listProceduresController)

/**
 * @openapi
 * /procedures/{id}:
 *   get:
 *     summary: Busca um procedimento por ID
 *     tags: [Procedures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados do procedimento
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getProcedureByIdController)

/**
 * @openapi
 * /procedures:
 *   post:
 *     summary: Adiciona um procedimento ao catálogo (apenas ADMIN)
 *     tags: [Procedures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, basePrice]
 *             properties:
 *               name: { type: string, example: 'Restauração Estética' }
 *               code: { type: string, example: '81000022' }
 *               basePrice: { type: number, example: 350.00 }
 *     responses:
 *       201:
 *         description: Procedimento criado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Procedimento com mesmo nome já existe no tenant
 */
router.post('/', authorize('ADMIN'), createProcedureController)

/**
 * @openapi
 * /procedures/{id}:
 *   put:
 *     summary: Atualiza um procedimento do catálogo (apenas ADMIN)
 *     tags: [Procedures]
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
 *               name: { type: string }
 *               code: { type: string }
 *               basePrice: { type: number }
 *     responses:
 *       200:
 *         description: Procedimento atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN'), updateProcedureController)

/**
 * @openapi
 * /procedures/{id}:
 *   delete:
 *     summary: Remove um procedimento do catálogo (apenas ADMIN)
 *     tags: [Procedures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Procedimento removido com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteProcedureController)

export default router