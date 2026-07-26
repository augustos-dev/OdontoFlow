import { Router } from "express"
import { EvolutionController } from "../controllers/evolutionController"
import {
  getMedicalRecordByPatientController,
  getOdontogramController,
  lockEvolutionController,
  updateEvolutionController,
  upsertToothConditionController,
  UpdateMedicalRecordController,
  deleteToothConditionController
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from "../middlewares/authMiddlewares"

const medicalRecordRouter = Router()

// Instância do controller de evoluções
const evolutionController = new EvolutionController()

// Exige autenticação em todas as rotas do prontuário
medicalRecordRouter.use(authenticate)

// ─── Evoluções Clínicas ──────────────────────────────────────────────────────

// GET /medical-records/:medicalRecordId/evolutions — buscar histórico de evoluções
medicalRecordRouter.get(
  '/:medicalRecordId/evolutions', 
  evolutionController.getEvolutions
)

// POST /medical-records/evolutions — registrar nova evolução (apenas DENTIST)
medicalRecordRouter.post(
  '/evolutions', 
  authorize('DENTIST'), 
  evolutionController.create
)

// PUT /medical-records/evolutions/:evolutionId — editar evolução não travada (apenas DENTIST)
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST'), 
  updateEvolutionController
)

// PATCH /medical-records/evolutions/:evolutionId/lock — travar evolução (registro legal imutável)
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  lockEvolutionController
)

// ─── Prontuário (Anamnese Base) ──────────────────────────────────────────────

// GET /medical-records/:patientId — visualizar prontuário completo do paciente
medicalRecordRouter.get(
  '/:patientId', 
  getMedicalRecordByPatientController
)

// PUT /medical-records/:patientId — atualizar anamnese (ADMIN e DENTIST)
medicalRecordRouter.put(
  '/:patientId', 
  authorize('ADMIN', 'DENTIST'), 
  UpdateMedicalRecordController
)

// ─── Odontograma ─────────────────────────────────────────────────────────────

// GET /medical-records/:medicalRecordId/odontogram — mapa atual/snapshot do odontograma
medicalRecordRouter.get(
  '/:medicalRecordId/odontogram', 
  evolutionController.getCurrentOdontogram
)

// PUT /medical-records/:patientId/odontogram — criar/atualizar condição de um dente
medicalRecordRouter.put(
  '/:patientId/odontogram', 
  authorize('ADMIN', 'DENTIST'), 
  upsertToothConditionController
)

// DELETE /medical-records/:patientId/odontogram/:toothNumber — remover registro do dente
medicalRecordRouter.delete(
  '/:patientId/odontogram/:toothNumber', 
  authorize('ADMIN', 'DENTIST'), 
  deleteToothConditionController
)

export default medicalRecordRouter