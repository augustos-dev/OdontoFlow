
import { Router } from 'express'
import {
  createUserController,
  listUsersController,
  getUserByIdController,
  updateUserController,
  updateUserRoleController,
  updateUserStatusController,
  changePasswordController,
  deleteUserController,
} from '../controllers/userController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de usuários são privadas ──────────────────────────────────

router.use(authenticate)

// ─── Rota Privada — Própria conta (qualquer usuário autenticado) ────────────

router.patch('/me/change-password', changePasswordController)

// ─── Rotas Privadas — Leitura (apenas ADMIN) ─────────────────────────────────

router.get('/', authorize('ADMIN'), listUsersController)
router.get('/:id', authorize('ADMIN'), getUserByIdController)

// ─── Rotas Privadas — Escrita (apenas ADMIN) ─────────────────────────────────

router.post('/', authorize('ADMIN'), createUserController)
router.put('/:id', authorize('ADMIN'), updateUserController)
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

// ─── Rotas Privadas — Exclusão (apenas ADMIN) ────────────────────────────────

router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router