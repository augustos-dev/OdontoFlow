import { Router } from 'express'
import {
  createProcedureController,
  listProceduresController,
  getProcedureByIdController,
  updateProcedureController,
  deleteProcedureController,
} from '../controllers/procedureController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas do catálogo são privadas ──────────────────────────────────

router.use(authenticate)

// ─── Rotas Privadas — Leitura (todos os roles) ────────────────────────────────

router.get('/', listProceduresController)
router.get('/:id', getProcedureByIdController)

// ─── Rotas Privadas — Escrita (apenas ADMIN) ──────────────────────────────────

router.post('/', authorize('ADMIN'), createProcedureController)
router.put('/:id', authorize('ADMIN'), updateProcedureController)
router.delete('/:id', authorize('ADMIN'), deleteProcedureController)

export default router