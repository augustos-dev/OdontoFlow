import { Router } from 'express'
import {
  createProcedureController,
  listProceduresController,
  getProcedureByIdController,
  updateProcedureController,
  deleteProcedureController,
  setProcedureProductsController,
  getProcedureProductsController,
} from '../../controllers/procedureController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas do catálogo são privadas ──────────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /procedures:
 *   get:
 *     summary: Lista o catálogo de procedimentos
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Filtrar procedimentos pelo nome
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista de procedimentos com seus insumos vinculados
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', listProceduresController)

/**
 * @openapi
 * /procedures/{id}:
 *   get:
 *     summary: Busca detalhes de um procedimento por ID
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados detalhados do procedimento
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getProcedureByIdController)

/**
 * @openapi
 * /procedures/{id}/products:
 *   get:
 *     summary: Lista a Ficha Técnica (insumos do estoque) de um procedimento
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de produtos/insumos associados
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/products', getProcedureProductsController)

// ─── Rotas de Escrita (Apenas ADMIN) ──────────────────────────────────────────

/**
 * @openapi
 * /procedures:
 *   post:
 *     summary: Cadastra um novo procedimento no catálogo
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, basePrice]
 *             properties:
 *               name: { type: string, example: "Limpeza / Profilaxia" }
 *               code: { type: string, example: "PROC-01" }
 *               basePrice: { type: number, example: 180.00 }
 *     responses:
 *       201:
 *         description: Procedimento cadastrado com sucesso
 *       409:
 *         description: Já existe um procedimento com este nome
 */
router.post('/', authorize('ADMIN'), createProcedureController)

/**
 * @openapi
 * /procedures/{id}:
 *   put:
 *     summary: Atualiza um procedimento existente
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
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
 *         description: Procedimento atualizado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN'), updateProcedureController)

/**
 * @openapi
 * /procedures/{id}/products:
 *   post:
 *     summary: Configura a Ficha Técnica do procedimento (associa insumos do estoque)
 *     description: Define quais produtos e quantidades serão consumidos do estoque ao realizar este procedimento.
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
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
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     quantity: { type: integer, example: 2 }
 *     responses:
 *       200:
 *         description: Ficha técnica vinculada com sucesso
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/products', authorize('ADMIN'), setProcedureProductsController)

/**
 * @openapi
 * /procedures/{id}:
 *   delete:
 *     summary: Deleta um procedimento do catálogo
 *     tags: [Procedures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Procedimento removido com sucesso
 *       400:
 *         description: Procedimento vinculado a um plano de tratamento não pode ser excluído
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteProcedureController)

export default router