import { Router } from "express"
import {
  getMedicalRecordByPatientController,
  updateMedicalRecordController,
  getOdontogramController,
  upsertToothConditionController,
  deleteToothConditionController,
  CreateEvolutionController,
  updateEvolutionController,
  lockEvolutionController
} from '../../controllers/medicalRecordController'
import { authenticate, authorize } from "../../middlewares/authMiddlewares"
import { upload } from "../../middlewares/uploadMiddleware"

const medicalRecordRouter = Router()

// Aplica autenticação JWT para todas as rotas do prontuário
medicalRecordRouter.use(authenticate)

// ─── 1. SUB-ROTAS ESPECÍFICAS DE EVOLUÇÃO ──────────────────────────────────

// POST /api/medical-records/:patientId/evolutions
// Intercepta arquivos via multipart/form-data com a chave 'attachments'
medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  upload.array('attachments'), 
  CreateEvolutionController
)

// PUT /api/medical-records/evolutions/:evolutionId
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  updateEvolutionController
)

// PATCH /api/medical-records/evolutions/:evolutionId/lock
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  lockEvolutionController
)

// ─── 2. SUB-ROTAS ESPECÍFICAS DE ODONTOGRAMA ───────────────────────────────

// GET /api/medical-records/:medicalRecordId/odontogram
medicalRecordRouter.get(
  '/:medicalRecordId/odontogram', 
  getOdontogramController
)

// PUT /api/medical-records/:patientId/odontogram
medicalRecordRouter.put(
  '/:patientId/odontogram', 
  authorize('ADMIN', 'DENTIST'), 
  upsertToothConditionController
)

// DELETE /api/medical-records/:patientId/odontogram/:toothNumber
medicalRecordRouter.delete(
  '/:patientId/odontogram/:toothNumber', 
  authorize('ADMIN', 'DENTIST'), 
  deleteToothConditionController
)

// ─── 3. ROTAS GENÉRICAS DO PRONTUÁRIO (Sempre por último) ───────────────────

// GET /api/medical-records/:patientId
medicalRecordRouter.get(
  '/:patientId', 
  getMedicalRecordByPatientController
)

// PUT /api/medical-records/:patientId
medicalRecordRouter.put(
  '/:patientId', 
  authorize('ADMIN', 'DENTIST'), 
  updateMedicalRecordController
)

export default medicalRecordRouter