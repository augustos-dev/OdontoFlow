import { Router } from "express";
import {
    getMedicalRecordByPatientController,
    getOdontogramController,
    lockEvolutionController,
    CreateEvolutionController,
    updateEvolutionController,
    getEvolutionsByPatientController, // <-- Certifique-se de importar o controller de listagem
    upsertToothConditionController,
    UpdateMedicalRecordController,
    deleteToothConditionController
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from "../middlewares/authMiddlewares";

const medicalRecordRouter = Router()

medicalRecordRouter.use(authenticate)

// ─── Evoluções Clínicas ──────────────────────────────────────────────────────

// GET /medical-records/:patientId/evolutions — buscar histórico de evoluções do paciente
medicalRecordRouter.get(
    '/:patientId/evolutions', 
    getEvolutionsByPatientController
)

// POST /medical-records/:patientId/evolutions — registrar nova evolução (apenas DENTIST)
medicalRecordRouter.post(
    '/:patientId/evolutions', 
    authorize('DENTIST'), 
    CreateEvolutionController
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

// GET /medical-records/:patientId/odontogram — mapa completo dos dentes
medicalRecordRouter.get(
    '/:patientId/odontogram', 
    getOdontogramController
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