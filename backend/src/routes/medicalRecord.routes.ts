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
  generateAnamnesisTokenController,
  getPublicAnamnesisController,
  updatePublicAnamnesisController,
} from '../controllers/medicalRecordController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { upload } from '../middlewares/uploadMiddleware'

const router = Router()

// ─── 1. ROTAS PÚBLICAS (Sem Authenticate - Validação por Token de 36 Horas) ────
// O paciente abre o link no WhatsApp e envia sem precisar logar
router.get('/public/anamnese', getPublicAnamnesisController)
router.put('/public/anamnese', updatePublicAnamnesisController)

// ─── MIDDLEWARE DE AUTENTICAÇÃO PARA TODAS AS ROTAS ABAIXO ───────────────────
router.use(authenticate)

// ─── 2. GERAÇÃO DE TOKEN SEGURO DE ANAMNESE (36 HORAS) ───────────────────────
// Usado pela recepção ou dentista ao clicar em "Enviar WhatsApp" ou "Copiar Link"
router.post(
  '/:patientId/anamnesis-token',
  authorize('ADMIN', 'SECRETARY', 'DENTIST'),
  generateAnamnesisTokenController
)

// ─── 3. SUB-ROTAS DE EVOLUÇÃO CLÍNICA ─────────────────────────────────────────
router.get('/:patientId/evolutions', getEvolutionsController)
router.post(
  '/:patientId/evolutions',
  authorize('DENTIST', 'ADMIN'),
  upload.array('attachments', 20),
  createEvolutionController
)
router.put('/evolutions/:evolutionId', authorize('DENTIST', 'ADMIN'), updateEvolutionController)
router.patch('/evolutions/:evolutionId/lock', authorize('DENTIST', 'ADMIN'), lockEvolutionController)

// ─── 4. SUB-ROTAS DE ODONTOGRAMA (MAPA BUCAL) ─────────────────────────────────
router.get('/:medicalRecordId/odontogram', getOdontogramController)
router.put('/:patientId/odontogram', authorize('ADMIN', 'DENTIST'), upsertToothConditionController)
router.delete('/:patientId/odontogram/:toothNumber', authorize('ADMIN', 'DENTIST'), deleteToothConditionController)

// ─── 5. ROTAS DE PRONTUÁRIO / ANAMNESE BASE ───────────────────────────────────
router.get('/:patientId', getMedicalRecordByPatientController)
router.put('/:patientId', authorize('ADMIN', 'DENTIST'), updateMedicalRecordController)

export default router