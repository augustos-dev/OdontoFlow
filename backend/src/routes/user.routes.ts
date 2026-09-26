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

router.use(authenticate)

// Troca da própria senha
router.patch('/me/change-password', changePasswordController)

// Gestão de permissões RBAC por módulo
router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

// Desbloqueio preventivo de conta bloqueada por tentativas inválidas
router.patch('/:id/unlock', authorize('ADMIN'), resetUserLockoutController)

// Listagem e visualização de equipe
router.get('/', can('SETTINGS', 'READ'), listUsersController)
router.get('/:id', can('SETTINGS', 'READ'), getUserByIdController)

// Criação e edição
router.post('/', can('SETTINGS', 'CREATE'), createUserController)
router.put('/:id', can('SETTINGS', 'UPDATE'), updateUserController)
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

// Exclusão definitiva (Apenas ADMIN)
router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router