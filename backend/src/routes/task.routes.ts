import { Router } from 'express'
import {
  listTasksController,
  createTaskController,
  updateTaskController,
  deleteTaskController,
} from '../controllers/taskController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const taskRouter = Router()

// Todas as rotas de tarefas exigem autenticação via Token JWT
taskRouter.use(authenticate)

// ─── 1. ROTAS DE LEITURA (ADMIN, SECRETARY, DENTIST) ─────────────────────────
// Listagem geral de pendências da equipe com filtros por status e responsável
taskRouter.get('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), listTasksController)

// ─── 2. CRIAÇÃO DE TAREFAS (ADMIN, SECRETARY, DENTIST) ───────────────────────
// Criação de tarefas associadas a próteses, compras de material ou retornos de pacientes
taskRouter.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createTaskController)

// ─── 3. EDIÇÃO E CONCLUSÃO (ADMIN, SECRETARY, DENTIST) ───────────────────────
// Atualização de prazo, reatribuição e finalização com registro de carimbo de tempo
taskRouter.patch('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateTaskController)

// ─── 4. ROTA DE EXCLUSÃO (ADMIN, SECRETARY) ──────────────────────────────────
// Exclusão definitiva de pendências operacionais
taskRouter.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteTaskController)

export default taskRouter