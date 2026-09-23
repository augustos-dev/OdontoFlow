import { Router } from 'express'
import {
  getMedicalRecordByPatientController,
  updateMedicalRecordController,
  getOdontogramController,
  upsertToothConditionController,
  deleteToothConditionController,
  getEvolutionsController,
  createEvolutionController,
  updateEvolutionController,
  lockEvolutionController,
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { upload } from '../middlewares/uploadMiddleware'

const router = Router()

router.use(authenticate)

// 1. Sub-rotas de evolução
router.get('/:patientId/evolutions', getEvolutionsController)
router.post(
  '/:patientId/evolutions',
  authorize('DENTIST', 'ADMIN'),
  upload.array('attachments', 20),
  createEvolutionController
)
router.put('/evolutions/:evolutionId', authorize('DENTIST', 'ADMIN'), updateEvolutionController)
router.patch('/evolutions/:evolutionId/lock', authorize('DENTIST', 'ADMIN'), lockEvolutionController)

// 2. Sub-rotas de odontograma
router.get('/:medicalRecordId/odontogram', getOdontogramController)
router.put('/:patientId/odontogram', authorize('ADMIN', 'DENTIST'), upsertToothConditionController)
router.delete('/:patientId/odontogram/:toothNumber', authorize('ADMIN', 'DENTIST'), deleteToothConditionController)

// 3. Rotas genéricas do prontuário
router.get('/:patientId', getMedicalRecordByPatientController)
router.put('/:patientId', authorize('ADMIN', 'DENTIST'), updateMedicalRecordController)

export default router