import { Router } from 'express'
import {
  createTranscriptionController,
  linkTranscriptionToEvolutionController,
} from '../controllers/clinicalAiController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { audioUpload } from '../middlewares/audioUpload.middleware'

const clinicalAiRouter = Router()

// Todas as operações de IA clínica exigem autenticação via Token JWT
clinicalAiRouter.use(authenticate)

// ─── 1. TRANSCRIÇÃO & PROCESSAMENTO DE VOZ (ADMIN, DENTIST) ──────────────────
// Registra o áudio capturado no mocho, gera transcrição e payload clínico estruturado
clinicalAiRouter.post('/transcribe',
  authorize('ADMIN', 'DENTIST'),
  audioUpload.single('audio'),
  createTranscriptionController
)

// ─── 2. VÍNCULO COM PRONTUÁRIO & EVOLUÇÃO (ADMIN, DENTIST) ──────────────────
// Associa a transcrição processada à evolução clínica respeitando a janela CFO (24h)
clinicalAiRouter.patch(
  '/evolutions/:evolutionId/link',
  authorize('ADMIN', 'DENTIST'),
  linkTranscriptionToEvolutionController
)

export default clinicalAiRouter