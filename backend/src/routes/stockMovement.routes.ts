import { Router } from 'express'
import * as stockMovementController from '../controllers/stockMovementController'
import { authenticate } from '../middlewares/authMiddlewares'
import { authorize } from '../middlewares/authMiddlewares'

const router = Router()

// Aplica autenticação JWT globalmente para as rotas de movimentação de estoque
router.use(authenticate)

/**
 * @route   GET /api/stock-movements
 * @desc    Lista o histórico de movimentações de estoque da clínica (Entradas e Saídas)
 * @access  Private (ADMIN, DENTIST, SECRETARY)
 */
router.get(
  '/',
  authorize('ADMIN', 'DENTIST', 'SECRETARY'),
  stockMovementController.listMovements
)

/**
 * @route   POST /api/stock-movements
 * @desc    Registra uma movimentação manual de estoque (ENTRY para reposição ou EXIT_MANUAL para perda/ajuste)
 * @access  Private (ADMIN, DENTIST, SECRETARY)
 */
router.post(
  '/',
  authorize('ADMIN', 'DENTIST', 'SECRETARY'),
  stockMovementController.createMovement
)

export default router