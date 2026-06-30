// backend/src/routes/appointment.routes.ts

import { Router } from 'express'
import {
  createAppointmentController,
  listAppointmentsController,
  getAppointmentByIdController,
  updateAppointmentController,
  updateAppointmentStatusController,
  deleteAppointmentController,
} from '../../controllers/apponitmentController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de agendamentos são privadas ──────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /appointments:
 *   get:
 *     summary: Lista agendamentos com filtros e paginação
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filtra agendamentos de um dia específico (YYYY-MM-DD)
 *       - in: query
 *         name: dentistId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AGENDADO, CONFIRMADO, EM_ATENDIMENTO, FINALIZADO, CANCELADO, FALTOU, ESPERA]
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *           enum: [SALA_1, SALA_2, SALA_3, SALA_4]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Appointment' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', listAppointmentsController)

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     summary: Busca um agendamento por ID
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos do agendamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getAppointmentByIdController)

/**
 * @openapi
 * /appointments:
 *   post:
 *     summary: Cria um novo agendamento (valida conflito de sala e dentista)
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentDTO'
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Data no passado ou dados inválidos
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflito de sala ou dentista no horário informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createAppointmentController)

/**
 * @openapi
 * /appointments/{id}:
 *   put:
 *     summary: Atualiza um agendamento (revalida conflitos)
 *     tags: [Appointments]
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
 *             $ref: '#/components/schemas/CreateAppointmentDTO'
 *     responses:
 *       200:
 *         description: Agendamento atualizado com sucesso
 *       400:
 *         description: Agendamento finalizado/cancelado não pode ser editado
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflito de sala ou dentista no novo horário
 */
router.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentController)

/**
 * @openapi
 * /appointments/{id}/status:
 *   patch:
 *     summary: Atualiza o status de um agendamento
 *     tags: [Appointments]
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
 *             $ref: '#/components/schemas/UpdateAppointmentStatusDTO'
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       400:
 *         description: Status final ou motivo de cancelamento ausente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/status', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentStatusController)

/**
 * @openapi
 * /appointments/{id}:
 *   delete:
 *     summary: Remove um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Agendamento removido com sucesso
 *       400:
 *         description: Não é possível deletar agendamento em andamento ou finalizado
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteAppointmentController)

export default router