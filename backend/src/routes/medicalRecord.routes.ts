import { Router } from "express";
import {
     getMedicalRecordByPatientController,
     getOdontogramController,
     lockEvolutionController,
     CreateEvolutionController,
     updateEvolutionController,
     upsertToothConditionController,
     UpdateMedicalRecordController,
     deleteToothConditionController
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from "../middlewares/authMiddlewares";

const medicalRecordRouter = Router()

medicalRecordRouter.use(authenticate)
 
// ─── Evoluções Clínicas (Declaradas antes para evitar conflito de prefixo com :patientId) ───
 
// PUT /medical-records/evolutions/:evolutionId — editar evolução não travada
medicalRecordRouter.put('/evolutions/:evolutionId', authorize('DENTIST'), updateEvolutionController)
 
// PATCH /medical-records/evolutions/:evolutionId/lock — travar evolução (registro legal)
medicalRecordRouter.patch('/evolutions/:evolutionId/lock', authorize('DENTIST', 'ADMIN'), lockEvolutionController)
 
// POST /medical-records/:patientId/evolutions — registrar evolução (apenas DENTIST)
medicalRecordRouter.post('/:patientId/evolutions', authorize('DENTIST'), CreateEvolutionController)
 
// ─── Prontuário (Anamnese) ───────────────────────────────────────────────────
 
// GET /medical-records/:patientId — visualizar prontuário completo
medicalRecordRouter.get('/:patientId', getMedicalRecordByPatientController)
 
// PUT /medical-records/:patientId — atualizar anamnese (apenas DENTIST e ADMIN)
medicalRecordRouter.put('/:patientId', authorize('ADMIN', 'DENTIST'), UpdateMedicalRecordController)
 
// ─── Odontograma ──────────────────────────────────────────────────────────────
 
// GET /medical-records/:patientId/odontogram — mapa completo dos 32 dentes
medicalRecordRouter.get('/:patientId/odontogram', getOdontogramController)
 
// PUT /medical-records/:patientId/odontogram — criar/atualizar condição de um dente
medicalRecordRouter.put('/:patientId/odontogram', authorize('ADMIN', 'DENTIST'), upsertToothConditionController)
 
// DELETE /medical-records/:patientId/odontogram/:toothNumber — remover registro do dente
medicalRecordRouter.delete('/:patientId/odontogram/:toothNumber', authorize('ADMIN', 'DENTIST'), deleteToothConditionController)
 
export default medicalRecordRouter