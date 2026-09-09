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

const medicalRecordRouter = Router()

// Aplica autenticação JWT para todas as rotas
medicalRecordRouter.use(authenticate)

// ─── 1. SUB-ROTAS ESPECÍFICAS DE EVOLUÇÃO ──────────────────────────────────

medicalRecordRouter.get(
  '/:patientId/evolutions',
  getEvolutionsController
)

medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  upload.array('attachments', 20), 
  createEvolutionController
)

medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  updateEvolutionController
)

medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  lockEvolutionController
)

// ─── 2. SUB-ROTAS ESPECÍFICAS DE ODONTOGRAMA ───────────────────────────────

medicalRecordRouter.get(
  '/:medicalRecordId/odontogram', 
  getOdontogramController
)

medicalRecordRouter.put(
  '/:patientId/odontogram', 
  authorize('ADMIN', 'DENTIST'), 
  upsertToothConditionController
)

medicalRecordRouter.delete(
  '/:patientId/odontogram/:toothNumber', 
  authorize('ADMIN', 'DENTIST'), 
  deleteToothConditionController
)

// ─── 3. ROTAS GENÉRICAS DO PRONTUÁRIO (Sempre por último) ───────────────────

medicalRecordRouter.get(
  '/:patientId', 
  getMedicalRecordByPatientController
)

medicalRecordRouter.put(
  '/:patientId', 
  authorize('ADMIN', 'DENTIST'), 
  updateMedicalRecordController
)

export default medicalRecordRouter