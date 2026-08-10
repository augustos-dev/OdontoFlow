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

// ─── Autenticação Global do Módulo ───────────────────────────────────────────
productRouter.use(authenticate)

// ─── Rotas de Leitura / Filtros Especiais (Rotas estáticas acima de /:id) ───
productRouter.get('/', listProductController)
productRouter.get('/low-stock', lowStockController)
productRouter.get('/expiring', expringProductController)
productRouter.get('/:id', productByIdController)

// ─── Rotas de Cadastro e Edição de Insumos (ADMIN e SECRETARY) ────────────────
productRouter.post('/', authorize('ADMIN', 'SECRETARY'), createProductController)
productRouter.put('/:id', authorize('ADMIN', 'SECRETARY'), updateProductController)

// ─── Rotas de Ajuste de Saldo / Exit Inteligente (ADMIN, SECRETARY e DENTIST) 
productRouter.patch('/:id/stock', authorize('ADMIN', 'SECRETARY', 'DENTIST'), adjustStockController)

// ─── Rotas de Exclusão Física (Apenas ADMIN) ──────────────────────────────────
productRouter.delete('/:id', authorize('ADMIN'), deleteProductController)

export default productRouter