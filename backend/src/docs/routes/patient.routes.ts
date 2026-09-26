// backend/src/routes/patient.routes.ts

import { Router } from 'express'
import {
  createPatientController,
  listPatientsController,
  getPatientByIdController,
  updatePatientController,
  deletePatientController,
} from '../../controllers/patientController'
import { generateAnamnesisTokenController } from '../../controllers/medicalRecordController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { can } from '../../middlewares/rbac.middleware'

const router = Router()

// ─── Todas as rotas de pacientes são privadas ─────────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /patients:
 *   get:
 *     summary: Lista pacientes com filtros e paginação
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Filtra por nome (case-insensitive)
 *       - in: query
 *         name: cpf
 *         schema: { type: string }
 *         description: Filtra por dígitos do CPF
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *         description: Filtra por número de telefone
 *       - in: query
 *         name: insuranceName
 *         schema: { type: string }
 *         description: Filtra por nome da operadora/convênio
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Patient' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', can('PATIENTS', 'READ'), listPatientsController)

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     summary: Busca um paciente por ID com prontuário e histórico
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos do paciente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', can('PATIENTS', 'READ'), getPatientByIdController)

/**
 * @openapi
 * /patients:
 *   post:
 *     summary: Cria um novo paciente com prontuário vinculado
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatientDTO'
 *     responses:
 *       201:
 *         description: Paciente criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', can('PATIENTS', 'CREATE'), createPatientController)

/**
 * @openapi
 * /patients/{id}:
 *   put:
 *     summary: Atualiza os dados cadastrais e prontuário de um paciente
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePatientDTO'
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/:id', can('PATIENTS', 'UPDATE'), updatePatientController)

/**
 * @openapi
 * /patients/{id}/anamnesis-token:
 *   post:
 *     summary: Emite token seguro de anamnese digital com validade de 36 horas
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
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
  '/:id/anamnesis-token',
  authorize('ADMIN', 'SECRETARY', 'DENTIST'),
  generateAnamnesisTokenController
)

/**
 * @openapi
 * /patients/{id}:
 *   delete:
 *     summary: Remove um paciente (soft delete)
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Paciente removido com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deletePatientController)

export default router