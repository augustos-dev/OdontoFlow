// backend/src/routes/transaction.routes.ts

import { Router } from 'express'
import {
  createTransactionController,
  listTransactionsController,
  getTransactionByIdController,
  updateTransactionController,
  deleteTransactionController,
  getFinancialReportController,
} from '../../controllers/transactionController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de transações são privadas ────────────────────────────────

router.use(authenticate)

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
 */
router.get('/', listTransactionsController)

/**
 * @openapi
 * /transactions/report:
 *   get:
 *     summary: Relatório financeiro consolidado por período (apenas ADMIN)
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
 *     responses:
 *       200:
 *         description: Relatório com receitas, despesas e lucro do período
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialReport'
 *       400:
 *         description: startDate e endDate são obrigatórios
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/report', authorize('ADMIN'), getFinancialReportController)

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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getTransactionByIdController)

/**
 * @openapi
 * /transactions:
 *   post:
 *     summary: Cria uma transação (finaliza agendamento automaticamente se vinculado)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransactionDTO'
 *     responses:
 *       201:
 *         description: Transação criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Já existe transação vinculada a este agendamento
 */
router.post('/', authorize('ADMIN', 'SECRETARY'), createTransactionController)

/**
 * @openapi
 * /transactions/{id}:
 *   put:
 *     summary: Atualiza uma transação
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
 *             $ref: '#/components/schemas/CreateTransactionDTO'
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso
 *       400:
 *         description: Valor não pode ser alterado em transação vinculada a agendamento
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN', 'SECRETARY'), updateTransactionController)

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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteTransactionController)

export default router