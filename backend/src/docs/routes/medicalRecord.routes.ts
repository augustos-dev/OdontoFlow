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
} from '../../controllers/medicalRecordController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { upload } from '../../middlewares/uploadMiddleware'

const router = Router()

/**
 * @openapi
 * /medical-records/public/anamnese:
 *   get:
 *     summary: Recupera anamnese pública através de Magic Link com token assinado de 36 horas
 *     tags: [Medical Records Public]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Token JWT temporário assinado pelo backend
 *     responses:
 *       200:
 *         description: Dados clínicos da anamnese carregados
 *       400:
 *         description: Token ausente
 *       401:
 *         description: Token expirado ou assinatura inválida
 *   put:
 *     summary: Preenchimento público da ficha de saúde pelo paciente via Magic Link (Token 36h)
 *     tags: [Medical Records Public]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mainComplaint: { type: string }
 *               chiefComplaint: { type: string }
 *               allergies: { type: string }
 *               systemicDiseases: { type: string }
 *               medicationsInUse: { type: string }
 *               medications: { type: string }
 *               habits: { type: string }
 *               bloodType: { type: string }
 *               historyNotes: { type: string }
 *     responses:
 *       200:
 *         description: Anamnese salva com sucesso e vinculada ao prontuário
 *       401:
 *         description: Token expirado ou link inválido
 */
router.get('/public/anamnese', getPublicAnamnesisController)
router.put('/public/anamnese', updatePublicAnamnesisController)

// ─── ROTAS PRIVADAS (EXIGEM AUTENTICAÇÃO) ─────────────────────────────────────
router.use(authenticate)

/**
 * @openapi
 * /medical-records/{patientId}/anamnesis-token:
 *   post:
 *     summary: Emite token seguro de acesso à anamnese (Magic Link) válido por 36 horas
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Token gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 expiresInHours: { type: integer, example: 36 }
 *                 expiresAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:patientId/anamnesis-token',
  authorize('ADMIN', 'SECRETARY', 'DENTIST'),
  generateAnamnesisTokenController
)

/**
 * @openapi
 * /medical-records/{patientId}/evolutions:
 *   get:
 *     summary: Lista histórico de evoluções clínicas do paciente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Histórico retornado com sucesso }
 *   post:
 *     summary: Cria uma nova evolução clínica com suporte a upload de arquivos e snapshot do odontograma
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 *               procedureId: { type: string }
 *               aiTranscriptionId: { type: string }
 *               odontogramSnapshot: { type: string }
 *               appointmentId: { type: string }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Evolução clínica registrada }
 */
router.get('/:patientId/evolutions', getEvolutionsController)
router.post(
  '/:patientId/evolutions',
  authorize('DENTIST', 'ADMIN'),
  upload.array('attachments', 20),
  createEvolutionController
)

/**
 * @openapi
 * /medical-records/evolutions/{evolutionId}:
 *   put:
 *     summary: Edita anotação de evolução clínica (se não estiver bloqueada)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description: { type: string }
 *     responses:
 *       200: { description: Evolução atualizada }
 */
router.put('/evolutions/:evolutionId', authorize('DENTIST', 'ADMIN'), updateEvolutionController)

/**
 * @openapi
 * /medical-records/evolutions/{evolutionId}/lock:
 *   patch:
 *     summary: Tranca permanentemente uma evolução clínica (auditoria médica)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Evolução bloqueada }
 */
router.patch('/evolutions/:evolutionId/lock', authorize('DENTIST', 'ADMIN'), lockEvolutionController)

/**
 * @openapi
 * /medical-records/{medicalRecordId}/odontogram:
 *   get:
 *     summary: Obtém o mapa dos 32 dentes no padrão FDI do paciente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: medicalRecordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Mapa de dentes retornado }
 */
router.get('/:medicalRecordId/odontogram', getOdontogramController)

/**
 * @openapi
 * /medical-records/{patientId}/odontogram:
 *   put:
 *     summary: Atualiza ou insere anotações de faces/condição em um dente específico
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toothNumber, condition]
 *             properties:
 *               toothNumber: { type: integer, example: 16 }
 *               condition: { type: string, example: "CARIE" }
 *               faces:
 *                 type: array
 *                 items: { type: string, example: "O" }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Condição salva com sucesso }
 */
router.put('/:patientId/odontogram', authorize('ADMIN', 'DENTIST'), upsertToothConditionController)

/**
 * @openapi
 * /medical-records/{patientId}/odontogram/{toothNumber}:
 *   delete:
 *     summary: Limpa intervenções ou condições anotadas no dente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: toothNumber
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Marcação removida }
 */
router.delete('/:patientId/odontogram/:toothNumber', authorize('ADMIN', 'DENTIST'), deleteToothConditionController)

/**
 * @openapi
 * /medical-records/{patientId}:
 *   get:
 *     summary: Obtém o prontuário completo do paciente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Prontuário retornado }
 *   put:
 *     summary: Atualiza anamnese e campos clínicos do prontuário
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allergies: { type: string }
 *               systemicDiseases: { type: string }
 *               medicationsInUse: { type: string }
 *               medications: { type: string }
 *               habits: { type: string }
 *               mainComplaint: { type: string }
 *               chiefComplaint: { type: string }
 *               historyNotes: { type: string }
 *               bloodType: { type: string }
 *     responses:
 *       200: { description: Prontuário atualizado }
 */
router.get('/:patientId', getMedicalRecordByPatientController)
router.put('/:patientId', authorize('ADMIN', 'DENTIST'), updateMedicalRecordController)

export default router