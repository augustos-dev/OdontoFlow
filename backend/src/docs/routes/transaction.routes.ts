// backend/src/routes/transaction.routes.ts

import { Router } from 'express'
import {
  createTransactionController,
  listTransactionsController,
  getTransactionByIdController,
  updateTransactionController,
  reconcileTransactionController,
  deleteTransactionController,
  getFinancialReportController,
} from '../../controllers/transactionController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { can } from '../../middlewares/rbac.middleware'

const router = Router()

// ─── Todas as rotas de transações são privadas ────────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /transactions/report:
 *   get:
 *     summary: Relatório financeiro e DRE consolidado por período
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [RECEITA, DESPESA] }
 *       - in: query
 *         name: costCenter
 *         schema: { type: string }
 *       - in: query
 *         name: isReconciled
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Relatório com receitas, despesas, margens e centros de custo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialReport'
 *       400:
 *         description: startDate e endDate são obrigatórios
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/report', can('FINANCIAL', 'READ'), getFinancialReportController)

/**
 * @openapi
 * /transactions:
 *   get:
 *     summary: Lista transações financeiras com filtros e paginação
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [RECEITA, DESPESA] }
 *       - in: query
 *         name: paymentMethod
 *         schema: { type: string, enum: [PIX, CREDITO, DEBITO, DINHEIRO, CONVENIO] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: costCenter
 *         schema: { type: string }
 *       - in: query
 *         name: isReconciled
 *         schema: { type: boolean }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de transações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Transaction' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', can('FINANCIAL', 'READ'), listTransactionsController)

/**
 * @openapi
 * /transactions/{id}:
 *   get:
 *     summary: Busca uma transação por ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos da transação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', can('FINANCIAL', 'READ'), getTransactionByIdController)

/**
 * @openapi
 * /transactions:
 *   post:
 *     summary: Cria uma transação financeira (receita ou despesa)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount, paymentMethod]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [RECEITA, DESPESA]
 *               amount:
 *                 type: number
 *                 example: 150.00
 *               paymentMethod:
 *                 type: string
 *                 enum: [PIX, CREDITO, DEBITO, DINHEIRO, CONVENIO]
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               costCenter:
 *                 type: string
 *               isReconciled:
 *                 type: boolean
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               treatmentPlanId:
 *                 type: string
 *                 format: uuid
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Transação criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Já existe transação vinculada a este agendamento
 */
router.post('/', can('FINANCIAL', 'CREATE'), createTransactionController)

/**
 * @openapi
 * /transactions/{id}:
 *   put:
 *     summary: Atualiza os dados de uma transação
 *     tags: [Transactions]
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
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [PIX, CREDITO, DEBITO, DINHEIRO, CONVENIO]
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               costCenter:
 *                 type: string
 *               isReconciled:
 *                 type: boolean
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso
 *       400:
 *         description: Valor não pode ser alterado em transação vinculada a agendamento
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', can('FINANCIAL', 'UPDATE'), updateTransactionController)

/**
 * @openapi
 * /transactions/{id}/reconcile:
 *   patch:
 *     summary: Alterna o status de conciliação bancária/caixa da transação
 *     tags: [Transactions]
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
 *             required: [isReconciled]
 *             properties:
 *               isReconciled: { type: boolean }
 *     responses:
 *       200:
 *         description: Status de conciliação atualizado com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/reconcile', can('FINANCIAL', 'UPDATE'), reconcileTransactionController)

/**
 * @openapi
 * /transactions/{id}:
 *   delete:
 *     summary: Remove uma transação (apenas ADMIN, bloqueado se vinculada a agendamento)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Transação removida com sucesso
 *       400:
 *         description: Transação vinculada a agendamento não pode ser deletada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default router