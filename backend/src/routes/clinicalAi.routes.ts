import { Router } from 'express'
import {
  createTranscriptionController,
  linkTranscriptionToEvolutionController,
} from '../controllers/clinicalAiController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { requireFeature } from '../middlewares/planMiddleware'
import { audioUpload } from '../middlewares/audioUpload.middleware'

const clinicalAiRouter = Router()

// Transcrição de IA e análise clínica disponível a partir do plano PREMIUM
clinicalAiRouter.use(authenticate)
clinicalAiRouter.use(requireFeature('AI_TRANSCRIPTION'))

clinicalAiRouter.post(
  '/transcribe',
  authorize('ADMIN', 'DENTIST'),
  audioUpload.single('audio'),
  createTranscriptionController
)

clinicalAiRouter.patch(
  '/evolutions/:evolutionId/link',
  authorize('ADMIN', 'DENTIST'),
  linkTranscriptionToEvolutionController
)

export default clinicalAiRouter