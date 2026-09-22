import { Router } from 'express'
import {
  createTranscriptionController,
  linkTranscriptionToEvolutionController,
} from '../../controllers/clinicalAiController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /clinical-ai/transcribe:
 *   post:
 *     summary: Registra a transcrição de áudio capturada no mocho e processada por IA
 *     tags: [Clinical AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAiTranscriptionDTO'
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
 *         description: Texto de transcrição obrigatório
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/transcribe', authorize('ADMIN', 'DENTIST'), createTranscriptionController)

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