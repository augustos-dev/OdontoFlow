import { Router } from 'express'
import {
  listCommissionsController,
  createCommissionController,
  payCommissionController,
} from '../controllers/commissionController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { can } from '../middlewares/rbac.middleware'

const commissionRouter = Router()

// Todas as rotas financeiras de repasse exigem autenticação via Token JWT
commissionRouter.use(authenticate)

// ─── 1. ROTAS DE LEITURA (ADMIN, DENTIST) ────────────────────────────────────
// Listagem de repasses (Administrador visualiza todos; dentista visualiza os seus)
commissionRouter.get('/', can('COMMISSIONS', 'READ'), listCommissionsController)

// ─── 2. CÁLCULO E LANÇAMENTO DE COMISSÃO (ADMIN) ─────────────────────────────
// Cálculo com base no valor líquido real (descontando insumos fracionados do procedimento)
commissionRouter.post('/', authorize('ADMIN'), createCommissionController)

// ─── 3. LIQUIDAÇÃO / PAGAMENTO DE REPASSE (ADMIN) ────────────────────────────
// Transição de status para liquidado (PAID), forma de pagamento e anexo de comprovante
commissionRouter.patch('/:id/pay', authorize('ADMIN'), payCommissionController)

export default commissionRouter