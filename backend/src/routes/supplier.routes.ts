import { Router } from 'express'
import { authenticate } from '../middlewares/authMiddlewares' // Seu middleware JWT
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

router.post('/', createSupplierController)
router.get('/', listSuppliersController)
router.get('/:id', getSupplierByIdController)
router.put('/:id', updateSupplierController)
router.delete('/:id', deleteSupplierController)

export default router