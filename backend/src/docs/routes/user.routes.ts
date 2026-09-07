// backend/src/routes/user.routes.ts

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
} from '../../controllers/userController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /users/me/change-password:
 *   patch:
 *     summary: Altera a senha do usuário autenticado
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
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         description: Senha atual incorreta
 */
router.patch('/me/change-password', changePasswordController)

/**
 * @openapi
 * /users/permissions/{role}:
 *   get:
 *     summary: Lista permissões granulares de acesso para um determinado papel (apenas ADMIN)
 *     tags: [Users - RBAC]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ADMIN, DENTIST, SECRETARY]
 *     responses:
 *       200:
 *         description: Lista de módulos e permissões da role
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)

/**
 * @openapi
 * /users/permissions:
 *   put:
 *     summary: Atualiza permissões de acesso em lote para um papel do sistema (apenas ADMIN)
 *     tags: [Users - RBAC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [DENTIST, SECRETARY]
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [module]
 *                   properties:
 *                     module:
 *                       type: string
 *                       enum: [DASHBOARD, AGENDA, PATIENTS, RECORDS, STOCK, FINANCIAL, PROCEDURES, SUPPLIERS, SETTINGS, REPORTS]
 *                     canRead: { type: boolean }
 *                     canCreate: { type: boolean }
 *                     canUpdate: { type: boolean }
 *                     canDelete: { type: boolean }
 *     responses:
 *       200:
 *         description: Permissões atualizadas com sucesso
 *       400:
 *         description: Não é permitido alterar permissões de ADMIN ou dados inválidos
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista todos os usuários da clínica (apenas ADMIN)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   email: { type: string }
 *                   role: { type: string }
 *                   isActive: { type: boolean }
 *                   lastLoginAt: { type: string, format: date-time }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', authorize('ADMIN'), listUsersController)

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário por ID (apenas ADMIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos do usuário
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authorize('ADMIN'), getUserByIdController)

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Cria um novo usuário na clínica (apenas ADMIN)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDTO'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', authorize('ADMIN'), createUserController)

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Atualiza dados de um usuário (apenas ADMIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       200:
 *         description: Usuário atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN'), updateUserController)

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     summary: Altera o role de um usuário (apenas ADMIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DENTIST, SECRETARY]
 *     responses:
 *       200:
 *         description: Role atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Ativa ou desativa um usuário (apenas ADMIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       200:
 *         description: Status atualizado com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Remove um usuário da clínica (apenas ADMIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Usuário removido com sucesso
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN'), deleteUserController)

export default router