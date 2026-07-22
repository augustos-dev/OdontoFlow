// backend/src/routes/medicalRecord.routes.ts

import { Router } from "express"
import {
  getMedicalRecordByPatientController,
  getEvolutionsByPatientController,
  getOdontogramController,
  lockEvolutionController,
  CreateEvolutionController,
  updateEvolutionController,
  upsertToothConditionController,
  UpdateMedicalRecordController,
  deleteToothConditionController,
} from '../../controllers/medicalRecordController'
import { authenticate, authorize } from "../../middlewares/authMiddlewares"

const medicalRecordRouter = Router()

medicalRecordRouter.use(authenticate)

/**
 * @openapi
 * /medical-records/evolutions/{evolutionId}:
 *   put:
 *     summary: Edita uma evolução clínica não travada (apenas DENTIST)
 *     tags: [Medical Records]
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
 *             required: [description]
 *             properties:
 *               description: { type: string, example: 'Realizada extração do dente 48 sem intercorrências.' }
 *     responses:
 *       200:
 *         description: Evolução atualizada com sucesso
 *       400:
 *         description: Evolução já travada não pode ser editada
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.put('/evolutions/:evolutionId', authorize('DENTIST'), updateEvolutionController)

/**
 * @openapi
 * /medical-records/evolutions/{evolutionId}/lock:
 *   patch:
 *     summary: Trava uma evolução clínica (registro legal imutável)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: evolutionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Evolução travada com sucesso
 *       400:
 *         description: Evolução já está travada
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.patch('/evolutions/:evolutionId/lock', authorize('DENTIST', 'ADMIN'), lockEvolutionController)

/**
 * @openapi
 * /medical-records/{patientId}/evolutions:
 *   get:
 *     summary: Retorna o histórico de evoluções clínicas do paciente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de evoluções ordenadas da mais recente para a mais antiga
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   description: { type: string }
 *                   isLocked: { type: boolean }
 *                   lockedAt: { type: string, format: date-time, nullable: true }
 *                   createdAt: { type: string, format: date-time }
 *                   dentist:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       cro: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get('/:patientId/evolutions', getEvolutionsByPatientController)

/**
 * @openapi
 * /medical-records/{patientId}/evolutions:
 *   post:
 *     summary: Registra uma nova evolução clínica no prontuário (apenas DENTIST)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description: { type: string, example: 'Profilaxia realizada. Orientações de higiene bucal fornecidas.' }
 *     responses:
 *       201:
 *         description: Evolução registrada com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.post('/:patientId/evolutions', authorize('DENTIST'), CreateEvolutionController)

/**
 * @openapi
 * /medical-records/{patientId}:
 *   get:
 *     summary: Retorna o prontuário clínico completo do paciente
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Prontuário com anamnese, evoluções e odontograma
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 chiefComplaint: { type: string }
 *                 historyNotes: { type: string }
 *                 allergies: { type: string }
 *                 medications: { type: string }
 *                 bloodType: { type: string }
 *                 habits: { type: string }
 *                 systemicDiseases: { type: string }
 *                 evolutions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       description: { type: string }
 *                       isLocked: { type: boolean }
 *                       createdAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get('/:patientId', getMedicalRecordByPatientController)

/**
 * @openapi
 * /medical-records/{patientId}:
 *   put:
 *     summary: Atualiza a anamnese do prontuário (ADMIN ou DENTIST)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chiefComplaint: { type: string }
 *               historyNotes: { type: string }
 *               allergies: { type: string }
 *               medications: { type: string }
 *               bloodType: { type: string }
 *               habits: { type: string }
 *               systemicDiseases: { type: string }
 *     responses:
 *       200:
 *         description: Prontuário atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.put('/:patientId', authorize('ADMIN', 'DENTIST'), UpdateMedicalRecordController)

/**
 * @openapi
 * /medical-records/{patientId}/odontogram:
 *   get:
 *     summary: Retorna o odontograma completo do paciente (mapa dos 32 dentes)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de condições por dente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   toothNumber: { type: integer, example: 11 }
 *                   condition: { type: string, example: 'CARIE' }
 *                   faces: { type: array, items: { type: string } }
 *                   notes: { type: string }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.get('/:patientId/odontogram', getOdontogramController)

/**
 * @openapi
 * /medical-records/{patientId}/odontogram:
 *   put:
 *     summary: Cria ou atualiza a condição de um dente no odontograma (upsert)
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toothNumber, condition]
 *             properties:
 *               toothNumber: { type: integer, example: 16 }
 *               condition: { type: string, example: 'RESTAURADO' }
 *               faces: { type: array, items: { type: string }, example: ['OCLUSAL', 'MESIAL'] }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Condição do dente atualizada com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.put('/:patientId/odontogram', authorize('ADMIN', 'DENTIST'), upsertToothConditionController)

/**
 * @openapi
 * /medical-records/{patientId}/odontogram/{toothNumber}:
 *   delete:
 *     summary: Remove o registro de condição de um dente do odontograma
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: toothNumber
 *         required: true
 *         schema: { type: integer, example: 16 }
 *     responses:
 *       204:
 *         description: Registro removido com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
medicalRecordRouter.delete('/:patientId/odontogram/:toothNumber', authorize('ADMIN', 'DENTIST'), deleteToothConditionController)

export default medicalRecordRouter