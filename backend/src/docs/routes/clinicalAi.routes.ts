import { Router } from 'express'
import {
  createTranscriptionController,
  linkTranscriptionToEvolutionController,
} from '../../controllers/clinicalAiController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { audioUpload } from '../../middlewares/audioUpload.middleware'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /clinical-ai/transcribe:
 *   post:
 *     summary: Envia áudio gravado no mocho para transcrição (Whisper) e estruturação clínica via IA
 *     tags: [Clinical AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de áudio gravado (máximo 120s / 20MB)
 *               durationSeconds:
 *                 type: integer
 *                 example: 45
 *                 description: Duração total em segundos da gravação
 *     responses:
 *       201:
 *         description: Transcrição salva com dados clínicos estruturados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/ClinicalAiTranscription' }
 *       400:
 *         description: Arquivo ausente ou duração acima do limite permitido
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/transcribe',
  authorize('ADMIN', 'DENTIST'),
  audioUpload.single('audio'),
  createTranscriptionController
)

/**
 * @openapi
 * /clinical-ai/evolutions/{evolutionId}/link:
 *   patch:
 *     summary: Associa a transcrição de voz à evolução clínica do prontuário (valida trava de 24h CFO)
 *     tags: [Clinical AI]
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transcriptionId]
 *             properties:
 *               transcriptionId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transcrição vinculada à evolução com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Evolução trancada por compliance temporal (24h)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/evolutions/:evolutionId/link', authorize('ADMIN', 'DENTIST'), linkTranscriptionToEvolutionController)

export default router