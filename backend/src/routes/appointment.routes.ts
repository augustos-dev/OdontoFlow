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

// Todas as rotas de agendamento são privadas (exigem Token JWT)
appointmentRouter.use(authenticate)

// ─── 1. ROTAS DE LEITURA (Acesso: ADMIN, SECRETARY, DENTIST) ─────────────────
appointmentRouter.get('/', listAppointmentsController)
appointmentRouter.get('/:id', getAppointmentByIdController)

// ─── 2. ROTAS DE CRIAÇÃO E EDIÇÃO (Acesso: ADMIN, SECRETARY, DENTIST) ────────
appointmentRouter.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createAppointmentController)
appointmentRouter.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentController)

// ─── 3. ROTA DE MUDANÇA DE STATUS (Acesso: ADMIN, SECRETARY, DENTIST) ─────────
// 🚀 Nota: A transição para 'FINALIZADO' dispara a Baixa Automática de Estoque
appointmentRouter.patch('/:id/status', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentStatusController)

// ─── 4. ROTA DE EXCLUSÃO (Acesso: ADMIN, SECRETARY) ─────────────────────────
appointmentRouter.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteAppointmentController)

export default appointmentRouter