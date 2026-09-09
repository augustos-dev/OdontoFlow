// backend/src/routes/clinic.routes.ts

import { Router } from 'express'
import {
  createClinicController,
  listClinicsController,
  getClinicByIdController,
  updateClinicController,
  deactivateClinicController,
  reactivateClinicController,
  getClinicCustomizationController,
  updateClinicCustomizationController,
} from '../controllers/clinicController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// Todas as rotas de clínicas são privadas
router.use(authenticate)

// White-Label & Customização Visual (declaradas antes de :id genérico ou ações específicas)
router.get('/:id/customization', getClinicCustomizationController)
router.put('/:id/customization', authorize('ADMIN'), updateClinicCustomizationController)

// Leitura (todos os papéis autenticados)
router.get('/', listClinicsController)
router.get('/:id', getClinicByIdController)

// Escrita e Ações de Status (apenas ADMIN)
router.post('/', authorize('ADMIN'), createClinicController)
router.put('/:id', authorize('ADMIN'), updateClinicController)
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router