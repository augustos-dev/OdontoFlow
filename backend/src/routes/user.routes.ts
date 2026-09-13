import { Router } from 'express'
import {
  createUserController,
  listUsersController,
  getUserByIdController,
  updateUserController,
  updateUserRoleController,
  updateUserStatusController,
  resetUserLockoutController,
  changePasswordController,
  deleteUserController,
  getRolePermissionsController,
  updateRolePermissionsController,
} from '../controllers/userController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { can } from '../middlewares/rbac.middleware'

const router = Router()

// Todas as rotas de usuários exigem autenticação
router.use(authenticate)

// Própria conta
router.patch('/me/change-password', changePasswordController)

// Permissões Granulares (RBAC - apenas ADMIN)
router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

// Desbloqueio manual de conta bloqueada por tentativas (apenas ADMIN)
router.patch('/:id/unlock', authorize('ADMIN'), resetUserLockoutController)

// Leitura
router.get('/', can('SETTINGS', 'READ'), listUsersController)
router.get('/:id', can('SETTINGS', 'READ'), getUserByIdController)

// Escrita e Modificação
router.post('/', can('SETTINGS', 'CREATE'), createUserController)
router.put('/:id', can('SETTINGS', 'UPDATE'), updateUserController)
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

// Exclusão (apenas ADMIN)
router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router