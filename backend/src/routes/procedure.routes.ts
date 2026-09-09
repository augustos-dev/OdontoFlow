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

const procedureRouter = Router()

// ─── Autenticação Global do Módulo ───────────────────────────────────────────
procedureRouter.use(authenticate)

// ─── Rotas de Leitura (Liberado para ADMIN, DENTIST e SECRETARY) ────────────
procedureRouter.get('/', listProceduresController)
procedureRouter.get('/:id', getProcedureByIdController)
procedureRouter.get('/:id/products', getProcedureProductsController)

// ─── Rotas de Escrita & Ficha Técnica (Apenas ADMIN) ─────────────────────────
procedureRouter.post('/', authorize('ADMIN'), createProcedureController)
procedureRouter.put('/:id', authorize('ADMIN'), updateProcedureController)
procedureRouter.post('/:id/products', authorize('ADMIN'), setProcedureProductsController)
procedureRouter.delete('/:id', authorize('ADMIN'), deleteProcedureController)

export default procedureRouter