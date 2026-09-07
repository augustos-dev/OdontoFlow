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
  getRolePermissionsController,
  updateRolePermissionsController,
} from '../controllers/userController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

// ─── Todas as rotas de usuários são privadas ──────────────────────────────────

router.use(authenticate)

// ─── Rota Privada — Própria conta (qualquer usuário autenticado) ────────────

router.patch('/me/change-password', changePasswordController)

// ─── Rotas Privadas — Permissões Granulares (RBAC / Apenas ADMIN) ────────────
// (Declaradas antes de /:id para evitar conflitos de rota dinâmica no Express)

router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

// ─── Rotas Privadas — Leitura de Usuários (Apenas ADMIN) ─────────────────────

router.get('/', authorize('ADMIN'), listUsersController)
router.get('/:id', authorize('ADMIN'), getUserByIdController)

// ─── Rotas Privadas — Escrita e Modificação (Apenas ADMIN) ───────────────────

router.post('/', authorize('ADMIN'), createUserController)
router.put('/:id', authorize('ADMIN'), updateUserController)
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

// ─── Rotas Privadas — Exclusão (Apenas ADMIN) ────────────────────────────────

router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router