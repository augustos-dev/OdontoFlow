import { Router } from 'express'
import {
  createTreatmentPlanController,
  listTreatmentPlansController,
  getTreatmentPlanByIdController,
  updateTreatmentPlanController,
  updateTreatmentPlanStatusController,
  deleteTreatmentPlanController,
} from '../controllers/treatmentController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de planos de tratamento são privadas ─────────────────────

router.use(authenticate)

// ─── Rotas Privadas — Leitura (todos os roles) ────────────────────────────────

router.get('/', listTreatmentPlansController)
router.get('/:id', getTreatmentPlanByIdController)

// ─── Rotas Privadas — Escrita (ADMIN, DENTIST) ────────────────────────────────

router.post('/', authorize('ADMIN', 'DENTIST'), createTreatmentPlanController)
router.put('/:id', authorize('ADMIN', 'DENTIST'), updateTreatmentPlanController)

// ─── Rotas Privadas — Status (ADMIN, DENTIST, SECRETARY) ─────────────────────

router.patch('/:id/status', authorize('ADMIN', 'DENTIST', 'SECRETARY'), updateTreatmentPlanStatusController)

// ─── Rotas Privadas — Exclusão (apenas ADMIN) ────────────────────────────────

router.delete('/:id', authorize('ADMIN'), deleteTreatmentPlanController)

export default router