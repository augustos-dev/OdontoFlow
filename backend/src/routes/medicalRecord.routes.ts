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
import { upload } from "../middlewares/uploadMiddleware" // 👈 Descomente/Ajuste o caminho do seu multer

const medicalRecordRouter = Router()
const evolutionController = new EvolutionController()

// Aplica autenticação JWT para todas as rotas do prontuário
medicalRecordRouter.use(authenticate)

// ─── 1. SUB-ROTAS ESPECÍFICAS DE EVOLUÇÃO ──────────────────────────────────

// GET /api/medical-records/:patientId/evolutions
medicalRecordRouter.get(
  '/:patientId/evolutions', 
  (req, res, next) => evolutionController.getEvolutions(req, res, next)
)

// POST /api/medical-records/:patientId/evolutions
// (upload.array('files') intercepta anexos se enviados via Multipart/FormData)
medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  upload.array('files'), // 👈 Garante o parse correto de req.body e req.files
  (req, res, next) => evolutionController.createEvolution(req, res, next)
)

// PUT /api/medical-records/evolutions/:evolutionId
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  (req, res, next) => evolutionController.updateEvolution(req, res, next)
)

// PATCH /api/medical-records/evolutions/:evolutionId/lock
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  (req, res, next) => evolutionController.lockEvolution(req, res, next)
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

// ─── 3. ROTAS GENÉRICAS DO PRONTUÁRIO (Sempre por último) ─────────────────

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