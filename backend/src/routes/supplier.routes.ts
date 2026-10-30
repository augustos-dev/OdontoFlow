import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import {
  createSupplierController,
  listSuppliersController,
  getSupplierByIdController,
  updateSupplierController,
  deleteSupplierController,
} from '../controllers/supplierController'

const router = Router()

// Todas as rotas de fornecedor exigem autenticação
router.use(authenticate)

router.post('/', authorize('ADMIN', 'SECRETARY'), createSupplierController)
router.get('/', listSuppliersController)
router.get('/:id', getSupplierByIdController)
router.put('/:id', authorize('ADMIN', 'SECRETARY'), updateSupplierController)
router.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteSupplierController)

export default router