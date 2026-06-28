// backend/src/routes/clinic.routes.ts

import { Router } from 'express'
import {
  createClinicController,
  listClinicsController,
  getClinicByIdController,
  updateClinicController,
  deactivateClinicController,
  reactivateClinicController,
} from '../controllers/clinicController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de clínicas são privadas ──────────────────────────────────

router.use(authenticate)

// ─── Rotas Privadas — Leitura (todos os roles autenticados) ──────────────────

router.get('/', listClinicsController)
router.get('/:id', getClinicByIdController)

// ─── Rotas Privadas — Escrita (apenas ADMIN) ─────────────────────────────────

router.post('/', authorize('ADMIN'), createClinicController)
router.put('/:id', authorize('ADMIN'), updateClinicController)
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router