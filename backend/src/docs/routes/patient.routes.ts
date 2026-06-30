// backend/src/routes/patient.routes.ts

import { Router } from 'express'
import {
  createPatientController,
  listPatientsController,
  getPatientByIdController,
  updatePatientController,
  deletePatientController,
} from '../../controllers/patientController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

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
 *         description: Filtra por CPF
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
 */
router.get('/', listPatientsController)

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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getPatientByIdController)

/**
 * @openapi
 * /patients:
 *   post:
 *     summary: Cria um novo paciente (e prontuário vinculado)
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createPatientController)

/**
 * @openapi
 * /patients/{id}:
 *   put:
 *     summary: Atualiza os dados de um paciente
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
 *             $ref: '#/components/schemas/CreatePatientDTO'
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updatePatientController)

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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deletePatientController)

export default router