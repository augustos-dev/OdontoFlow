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

const medicalRecordRouter = Router()

// Aplica autenticação JWT para todas as rotas
medicalRecordRouter.use(authenticate)

/**
 * @swagger
 * tags:
 *   name: MedicalRecords
 *   description: Gestão de Prontuários, Evoluções Clínicas e Odontograma
 */

// ─── 1. SUB-ROTAS ESPECÍFICAS DE EVOLUÇÃO ──────────────────────────────────

/**
 * @swagger
 * /medical-records/{patientId}/evolutions:
 *   get:
 *     summary: Lista o histórico de evoluções de um paciente
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente ou do prontuário
 *     responses:
 *       200:
 *         description: Lista de evoluções retornada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get(
  '/:patientId/evolutions',
  getEvolutionsController
)

/**
 * @swagger
 * /medical-records/{patientId}/evolutions:
 *   post:
 *     summary: Cria uma nova evolução clínica para o paciente (Dispara Exit Inteligente no Estoque)
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente ou do prontuário
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Realizado procedimento de restauração no dente 16 com resina."
 *               procedureId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-1234-56789abcdef0"
 *                 description: ID do procedimento realizado (Aciona a baixa automática de estoque)
 *               odontogramSnapshot:
 *                 type: string
 *                 description: JSON em string representando o snapshot do odontograma
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Até 20 arquivos em imagem/anexos
 *     responses:
 *       201:
 *         description: Evolução cadastrada com sucesso e estoque abatido
 *       400:
 *         description: Dados inválidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
medicalRecordRouter.post(
  '/:patientId/evolutions', 
  authorize('DENTIST', 'ADMIN'), 
  upload.array('attachments', 20), 
  createEvolutionController
)

/**
 * @swagger
 * /medical-records/evolutions/{evolutionId}:
 *   put:
 *     summary: Atualiza uma evolução clínica existente (Respeita a trava de imutabilidade)
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da evolução
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Ajuste na descrição da restauração."
 *     responses:
 *       200:
 *         description: Evolução atualizada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Registro bloqueado por imutabilidade ou permissão negada
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.put(
  '/evolutions/:evolutionId', 
  authorize('DENTIST', 'ADMIN'), 
  updateEvolutionController
)

/**
 * @swagger
 * /medical-records/evolutions/{evolutionId}/lock:
 *   patch:
 *     summary: Bloqueia manualmente uma evolução para edições (Trava de Imutabilidade LGPD/CFO)
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da evolução
 *     responses:
 *       200:
 *         description: Evolução trancada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
medicalRecordRouter.patch(
  '/evolutions/:evolutionId/lock', 
  authorize('DENTIST', 'ADMIN'), 
  lockEvolutionController
)

// ─── 2. SUB-ROTAS ESPECÍFICAS DE ODONTOGRAMA ───────────────────────────────

/**
 * @swagger
 * /medical-records/{medicalRecordId}/odontogram:
 *   get:
 *     summary: Obtém as condições dentárias e o odontograma por ID do Prontuário
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: medicalRecordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do prontuário médico ou paciente
 *     responses:
 *       200:
 *         description: Odontograma retornado com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get(
  '/:medicalRecordId/odontogram', 
  getOdontogramController
)

/**
 * @swagger
 * /medical-records/{patientId}/odontogram:
 *   put:
 *     summary: Atualiza ou insere a condição de um dente específico no odontograma (Upsert)
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente ou prontuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toothNumber
 *               - condition
 *             properties:
 *               toothNumber:
 *                 type: integer
 *                 example: 16
 *               condition:
 *                 type: string
 *                 example: "RESTAURADO"
 *               faces:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["MESIAL", "OCLUSAL"]
 *               notes:
 *                 type: string
 *                 example: "Resina composta realizada em 2026."
 *     responses:
 *       200:
 *         description: Condição do dente salva
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
medicalRecordRouter.put(
  '/:patientId/odontogram', 
  authorize('ADMIN', 'DENTIST'), 
  upsertToothConditionController
)

/**
 * @swagger
 * /medical-records/{patientId}/odontogram/{toothNumber}:
 *   delete:
 *     summary: Remove a condição registrada de um dente específico no odontograma
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente ou prontuário
 *       - in: path
 *         name: toothNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Número do dente (ex: 16, 21)
 *     responses:
 *       200:
 *         description: Condição removida
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
medicalRecordRouter.delete(
  '/:patientId/odontogram/:toothNumber', 
  authorize('ADMIN', 'DENTIST'), 
  deleteToothConditionController
)

// ─── 3. ROTAS GENÉRICAS DO PRONTUÁRIO (Sempre por último) ───────────────────

/**
 * @swagger
 * /medical-records/{patientId}:
 *   get:
 *     summary: Obtém os dados gerais do prontuário médico do paciente
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente
 *     responses:
 *       200:
 *         description: Dados do prontuário retornados com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get(
  '/:patientId', 
  getMedicalRecordByPatientController
)

/**
 * @swagger
 * /medical-records/{patientId}:
 *   put:
 *     summary: Atualiza as informações de anamnese e históricas do prontuário
 *     tags: [MedicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chiefComplaint:
 *                 type: string
 *                 example: "Dor ao mastigar do lado direito."
 *               historyNotes:
 *                 type: string
 *               allergies:
 *                 type: string
 *                 example: "Alergia a Penicilina"
 *               medications:
 *                 type: string
 *               bloodType:
 *                 type: string
 *                 example: "O+"
 *               habits:
 *                 type: string
 *               systemicDiseases:
 *                 type: string
 *                 example: "Hipertensão controlada."
 *     responses:
 *       200:
 *         description: Prontuário atualizado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
medicalRecordRouter.put(
  '/:patientId', 
  authorize('ADMIN', 'DENTIST'), 
  updateMedicalRecordController
)

export default medicalRecordRouter