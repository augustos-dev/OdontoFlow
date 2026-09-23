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

router.patch('/me/change-password', changePasswordController)

router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

router.patch('/:id/unlock', authorize('ADMIN'), resetUserLockoutController)

router.get('/', can('SETTINGS', 'READ'), listUsersController)
router.get('/:id', can('SETTINGS', 'READ'), getUserByIdController)

router.post('/', can('SETTINGS', 'CREATE'), createUserController)
router.put('/:id', can('SETTINGS', 'UPDATE'), updateUserController)
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router