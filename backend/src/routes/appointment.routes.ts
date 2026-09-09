import { Router } from 'express'
import {
  createAppointmentController,
  listAppointmentsController,
  getAppointmentByIdController,
  updateAppointmentController,
  updateAppointmentStatusController,
  deleteAppointmentController,
} from '../controllers/apponitmentController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const appointmentRouter = Router()

// Todas as rotas de agendamento exigem autenticação via Token JWT
appointmentRouter.use(authenticate)

// ─── 1. ROTAS DE LEITURA (ADMIN, SECRETARY, DENTIST) ─────────────────────────
// Listagem com filtros por data, dentista, paciente, procedimento e status
appointmentRouter.get('/', listAppointmentsController)

// Detalhes completos do agendamento por ID
appointmentRouter.get('/:id', getAppointmentByIdController)

// ─── 2. ROTAS DE CRIAÇÃO E EDIÇÃO (ADMIN, SECRETARY, DENTIST) ────────────────
// Cadastro de nova consulta com validação de conflitos de sala/agenda
appointmentRouter.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createAppointmentController)

// Edição/Remarcação de agendamento (somente para consultas não finalizadas/canceladas)
appointmentRouter.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentController)

// ─── 3. TRANSIÇÃO DE STATUS & EXIT INTELIGENTE (ADMIN, SECRETARY, DENTIST) ────
// 🚀 Ao transitar para 'FINALIZADO', dispara a baixa automática com trava de idempotência
appointmentRouter.patch('/:id/status', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentStatusController)

// ─── 4. ROTA DE EXCLUSÃO (ADMIN, SECRETARY) ──────────────────────────────────
// Exclusão permitida apenas se o agendamento não estiver em andamento ou finalizado
appointmentRouter.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteAppointmentController)

export default appointmentRouter