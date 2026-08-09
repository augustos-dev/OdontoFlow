import { Router } from 'express'
import {
  createProductController,
  listProductController,
  adjustStockController,
  expringProductController,
  productByIdController,
  deleteProductController,
  lowStockController,
  updateProductController,
} from '../controllers/productController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const productRouter = Router()

// ─── Todas as rotas de produtos são privadas ──────────────────────────────────
productRouter.use(authenticate)

// ─── Rotas de Leitura Fixas (Sempre acima de /:id) ────────────────────────────
productRouter.get('/', listProductController)
productRouter.get('/low-stock', lowStockController)
productRouter.get('/expiring', expringProductController)
productRouter.get('/:id', productByIdController)

// ─── Rotas de Escrita (ADMIN e SECRETARY) ──────────────────────────────────────
productRouter.post('/', authorize('ADMIN', 'SECRETARY'), createProductController)
productRouter.put('/:id', authorize('ADMIN', 'SECRETARY'), updateProductController)

// ─── Rotas de Ajuste de Estoque (ADMIN, SECRETARY e DENTIST) ───────────────────
productRouter.patch('/:id/stock', authorize('ADMIN', 'SECRETARY', 'DENTIST'), adjustStockController)

// ─── Rotas de Exclusão (Apenas ADMIN) ──────────────────────────────────────────
productRouter.delete('/:id', authorize('ADMIN'), deleteProductController)

export default productRouter