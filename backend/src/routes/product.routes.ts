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

productRouter.use(authenticate)

productRouter.get('/', listProductController)
productRouter.get('/low-stock', lowStockController)
productRouter.get('/expiring', expringProductController)
productRouter.get('/:id', productByIdController)

productRouter.post('/', authorize('ADMIN', 'SECRETARY'), createProductController)
productRouter.put('/:id', authorize('ADMIN', 'SECRETARY'), updateProductController)

productRouter.patch('/:id/stock', authorize('ADMIN', 'SECRETARY', 'DENTIST'), adjustStockController)
productRouter.delete('/:id', authorize('ADMIN'), deleteProductController)

export default productRouter