import { Router } from "express"
import { EvolutionController } from "../../controllers/evolutionController"
import {
  getMedicalRecordByPatientController,
  getOdontogramController,
  lockEvolutionController,
  updateEvolutionController,
  upsertToothConditionController,
  UpdateMedicalRecordController,
  deleteToothConditionController
} from '../../controllers/medicalRecordController'
import { authenticate, authorize } from "../../middlewares/authMiddlewares"

const medicalRecordRouter = Router()
const evolutionController = new EvolutionController()

// Aplica autenticação JWT para todas as rotas
medicalRecordRouter.use(authenticate)

// ─── 1. EVOLUÇÕES CLÍNICAS ───────────────────────────────────────────────────

// GET /api/medical-records/:medicalRecordId/evolutions — buscar histórico
medicalRecordRouter.get(
  '/:medicalRecordId/evolutions', 
  evolutionController.getEvolutions
)

// POST /api/medical-records/:patientId/evolutions — registrar nova evolução
// ⚠️ Aponta para evolutionController.create e permite DENTIST / ADMIN
medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  evolutionController.create
)

// PUT /api/medical-records/evolutions/:evolutionId — editar evolução não travada
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  updateEvolutionController
)

// PATCH /api/medical-records/evolutions/:evolutionId/lock — travar evolução
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  lockEvolutionController
)

// ─── 2. ODONTOGRAMA ──────────────────────────────────────────────────────────

// GET /api/medical-records/:medicalRecordId/odontogram — snapshot atual
medicalRecordRouter.get(
  '/:medicalRecordId/odontogram', 
  evolutionController.getCurrentOdontogram
)

// PUT /api/medical-records/:patientId/odontogram — criar/atualizar dente
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

// ─── 3. PRONTUÁRIO ───────────────────────────────────────────────────────────

// GET /api/medical-records/:patientId — prontuário completo
medicalRecordRouter.get(
  '/:patientId', 
  getMedicalRecordByPatientController
)

// PUT /api/medical-records/:patientId — atualizar anamnese
medicalRecordRouter.put(
  '/:patientId', 
  authorize('ADMIN', 'DENTIST'), 
  UpdateMedicalRecordController
)

export default medicalRecordRouter