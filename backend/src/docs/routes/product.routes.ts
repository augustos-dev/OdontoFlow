// backend/src/routes/product.routes.ts

import { Router } from 'express'
import {
  createProductController,
    listProductController,
    adjustStockController,
    expringProductController,
    productByIdController,
    deleteProductController,
    lowStockController,
    updateProductController
} from '../../controllers/productController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de produtos são privadas ──────────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Lista produtos do estoque com filtros e paginação
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *         description: Filtra apenas produtos com estoque crítico
 *       - in: query
 *         name: expiring
 *         schema: { type: boolean }
 *         description: Filtra apenas produtos vencendo em 30 dias
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de produtos com status de estoque (semáforo)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/',  listProductController)

/**
 * @openapi
 * /products/low-stock:
 *   get:
 *     summary: Lista produtos com estoque crítico (quantity <= minQuantity)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Lista de produtos em estoque crítico
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 */
router.get('/low-stock',  lowStockController)

/**
 * @openapi
 * /products/expiring:
 *   get:
 *     summary: Lista produtos vencendo nos próximos 30 dias
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Lista de produtos próximos do vencimento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 */
router.get('/expiring',   expringProductController)

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Busca um produto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos do produto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id',   productByIdController)

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Cria um novo produto no estoque
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductDTO'
 *     responses:
 *       201:
 *         description: Produto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Fornecedor informado não encontrado
 */
router.post('/', authorize('ADMIN', 'SECRETARY'), createProductController)

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Atualiza os dados de um produto
 *     tags: [Products]
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
 *             $ref: '#/components/schemas/CreateProductDTO'
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN', 'SECRETARY'), updateProductController)

/**
 * @openapi
 * /products/{id}/stock:
 *   patch:
 *     summary: Ajusta o estoque de um produto (entrada ou saída)
 *     tags: [Products]
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
 *             $ref: '#/components/schemas/AdjustStockDTO'
 *     responses:
 *       200:
 *         description: Estoque ajustado com sucesso
 *       400:
 *         description: Estoque insuficiente para a saída solicitada
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/stock', authorize('ADMIN', 'SECRETARY', 'DENTIST'), adjustStockController)

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Remove um produto (apenas ADMIN, exige estoque zerado)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Produto removido com sucesso
 *       400:
 *         description: Produto com estoque não pode ser removido
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteProductController)

export default router