import { Router } from 'express'
import {
  getDentistProfileController,
  updateDentistProfileController,
} from '../controllers/DentistProfileController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const dentistProfileRouter = Router()

// Todas as rotas do perfil e consultório exigem autenticação via Token JWT
dentistProfileRouter.use(authenticate)

// ─── 1. ROTAS DE LEITURA (ADMIN, DENTIST) ────────────────────────────────────
// Obter dados do mocho, agenda pessoal, templates e CRO do profissional
dentistProfileRouter.get('/', authorize('ADMIN', 'DENTIST'), getDentistProfileController)

// ─── 2. ROTAS DE EDIÇÃO (ADMIN, DENTIST) ─────────────────────────────────────
// Atualizar especialidades, horários de atendimento, sala padrão e assinatura digital
dentistProfileRouter.put('/', authorize('ADMIN', 'DENTIST'), updateDentistProfileController)

export default dentistProfileRouter