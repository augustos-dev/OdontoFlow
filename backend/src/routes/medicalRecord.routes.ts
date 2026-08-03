import { Router } from "express"
import { EvolutionController } from "../controllers/evolutionController"
import {
  getMedicalRecordByPatientController,
  getOdontogramController,
  updateMedicalRecordController,
  upsertToothConditionController,
  deleteToothConditionController,
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from "../middlewares/authMiddlewares"
// import { upload } from "../middlewares/uploadMiddleware" // 👈 Importe seu middleware do Multer se utilizar

const medicalRecordRouter = Router()
const evolutionController = new EvolutionController()

// Aplica autenticação JWT para todas as rotas de prontuário
medicalRecordRouter.use(authenticate)

// ─── 1. SUB-ROTAS ESPECÍFICAS DE EVOLUÇÃO (Devem vir primeiro!) ─────────────

// GET /api/medical-records/:patientId/evolutions
medicalRecordRouter.get(
  '/:patientId/evolutions', 
  evolutionController.getEvolutions
)

// POST /api/medical-records/:patientId/evolutions (Permite DENTIST e ADMIN)
medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  // upload.array('files'), // 👈 Descomente se passar o Multer aqui
  evolutionController.createEvolution
)

// PUT /api/medical-records/evolutions/:evolutionId
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  evolutionController.updateEvolution
)

// PATCH /api/medical-records/evolutions/:evolutionId/lock
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  evolutionController.lockEvolution
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

// ─── 3. ROTAS GENÉRICAS DO PRONTUÁRIO (Devem vir no FINAL!) ─────────────────

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