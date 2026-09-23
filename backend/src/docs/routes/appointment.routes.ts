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

router.use(authenticate)

/**
 * @openapi
 * /appointments:
 *   get:
 *     summary: Lista agendamentos com filtros avançados
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, example: "2026-09-22" }
 *       - in: query
 *         name: dentistId
 *         schema: { type: string }
 *       - in: query
 *         name: patientId
 *         schema: { type: string }
 *       - in: query
 *         name: procedureId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: room
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Lista de consultas paginada }
 *   post:
 *     summary: Cria um novo agendamento com checagem anti-conflito de sala e horário
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, dentistId, dateTime]
 *             properties:
 *               patientId: { type: string }
 *               dentistId: { type: string }
 *               procedureId: { type: string }
 *               dateTime: { type: string, format: date-time }
 *               durationMin: { type: integer, default: 60 }
 *               type: { type: string }
 *               room: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Agendamento criado }
 *       409: { description: Conflito de agenda ou sala }
 */
router.get('/', listAppointmentsController)
router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createAppointmentController)

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     summary: Obtém detalhes completos de uma consulta
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Agendamento retornado }
 *       404: { description: Não encontrado }
 *   put:
 *     summary: Edita dados ou remarca a data de uma consulta
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateTime: { type: string, format: date-time }
 *               durationMin: { type: integer }
 *               room: { type: string }
 *               dentistId: { type: string }
 *               procedureId: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Atualizado com sucesso }
 *   delete:
 *     summary: Exclui um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deletado com sucesso }
 */
router.get('/:id', getAppointmentByIdController)
router.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentController)
router.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteAppointmentController)

/**
 * @openapi
 * /appointments/{id}/status:
 *   patch:
 *     summary: Atualiza status da consulta (dispara baixa de estoque se FINALIZADO)
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [AGENDADO, CONFIRMADO, ESPERA, EM_ATENDIMENTO, FINALIZADO, CANCELADO, FALTOU] }
 *               cancellationReason: { type: string }
 *               procedureId: { type: string }
 *     responses:
 *       200: { description: Status atualizado }
 */
router.patch('/:id/status', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentStatusController)

export default router