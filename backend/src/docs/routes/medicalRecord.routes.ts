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
} from '../../controllers/medicalRecordController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { upload } from '../../middlewares/uploadMiddleware'

const router = Router()

router.use(authenticate)

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
 *               habits: { type: string }
 *               mainComplaint: { type: string }
 *     responses:
 *       200: { description: Prontuário atualizado }
 */
router.get('/:patientId', getMedicalRecordByPatientController)
router.put('/:patientId', authorize('ADMIN', 'DENTIST'), updateMedicalRecordController)

export default router