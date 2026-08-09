import { Router } from 'express'
import {
  createProcedureController,
  listProceduresController,
  getProcedureByIdController,
  updateProcedureController,
  deleteProcedureController,
  setProcedureProductsController,
  getProcedureProductsController,
} from '../controllers/procedureController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas do catálogo são privadas ──────────────────────────────────

router.use(authenticate)

// ─── Rotas Privadas — Leitura (todos os roles) ────────────────────────────────

router.get('/', listProceduresController)
router.get('/:id', getProcedureByIdController)
router.get('/:id/products', getProcedureProductsController)

// ─── Rotas Privadas — Escrita / Configuração (Apenas ADMIN) ───────────────────

router.post('/', authorize('ADMIN'), createProcedureController)
router.put('/:id', authorize('ADMIN'), updateProcedureController)
router.post('/:id/products', authorize('ADMIN'), setProcedureProductsController)
router.delete('/:id', authorize('ADMIN'), deleteProcedureController)

export default router