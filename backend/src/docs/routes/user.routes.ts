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
} from '../../controllers/userController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { can } from '../../middlewares/rbac.middleware'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /users/me/change-password:
 *   patch:
 *     summary: Altera a senha do usuário atualmente autenticado
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Senha alterada com sucesso }
 *       401: { description: Senha atual incorreta }
 */
router.patch('/me/change-password', changePasswordController)

/**
 * @openapi
 * /users/permissions/{role}:
 *   get:
 *     summary: Consulta as permissões por módulo de uma role específica
 *     tags: [Users RBAC]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string, enum: [ADMIN, DENTIST, SECRETARY] }
 *     responses:
 *       200: { description: Matriz de permissões retornada }
 */
router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)

/**
 * @openapi
 * /users/permissions:
 *   put:
 *     summary: Atualiza permissões em lote para um papel de usuário
 *     tags: [Users RBAC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role: { type: string }
 *               clinicId: { type: string }
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module: { type: string }
 *                     canRead: { type: boolean }
 *                     canCreate: { type: boolean }
 *                     canUpdate: { type: boolean }
 *                     canDelete: { type: boolean }
 *     responses:
 *       200: { description: Permissões atualizadas com sucesso }
 */
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

/**
 * @openapi
 * /users/{id}/unlock:
 *   patch:
 *     summary: Remove o bloqueio temporário de tentativas de login de um usuário
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conta desbloqueada }
 */
router.patch('/:id/unlock', authorize('ADMIN'), resetUserLockoutController)

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista usuários da clínica com filtros
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Lista retornada com paginação }
 *   post:
 *     summary: Cria um novo colaborador na clínica
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string }
 *               phone: { type: string }
 *               cro: { type: string }
 *     responses:
 *       201: { description: Usuário cadastrado com sucesso }
 */
router.get('/', can('SETTINGS', 'READ'), listUsersController)
router.post('/', can('SETTINGS', 'CREATE'), createUserController)

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Retorna detalhes de um colaborador por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Dados do usuário }
 *   put:
 *     summary: Atualiza perfil do colaborador
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               cro: { type: string }
 *               avatarUrl: { type: string }
 *     responses:
 *       200: { description: Perfil atualizado }
 *   delete:
 *     summary: Remove permanentemente o usuário (caso não possua vínculos clínicos)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Excluído com sucesso }
 */
router.get('/:id', can('SETTINGS', 'READ'), getUserByIdController)
router.put('/:id', can('SETTINGS', 'UPDATE'), updateUserController)
router.delete('/:id', authorize('ADMIN'), deleteUserController)

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     summary: Altera o cargo/função de um usuário
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string }
 *     responses:
 *       200: { description: Cargo alterado com sucesso }
 */
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Ativa ou inativa o acesso de um usuário
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Status alterado com sucesso }
 */
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

export default router