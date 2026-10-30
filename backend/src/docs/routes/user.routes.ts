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
  listUserClinicsController,
  assignUserClinicController,
  removeUserClinicController,
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
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 6 }
 *     responses:
 *       200: { description: Senha alterada com sucesso }
 *       400: { description: Senha atual incorreta ou nova senha inválida }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.patch('/me/change-password', changePasswordController)

/**
 * @openapi
 * /users/permissions/{role}:
 *   get:
 *     summary: Consulta as permissões de um perfil
 *     description: Requer ADMIN; OWNER também é aceito.
 *     tags: [Users, RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *     responses:
 *       200: { description: Matriz de permissões do perfil }
 *       400: { description: Perfil inválido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/permissions/:role', authorize('ADMIN'), getRolePermissionsController)

/**
 * @openapi
 * /users/permissions:
 *   put:
 *     summary: Atualiza permissões por perfil e módulo
 *     description: Requer ADMIN e o recurso CUSTOM_PERMISSIONS habilitado no plano.
 *     tags: [Users, RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *               clinicId: { type: string, format: uuid, nullable: true }
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [module]
 *                   properties:
 *                     module:
 *                       type: string
 *                       enum: [DASHBOARD, AGENDA, PATIENTS, RECORDS, STOCK, FINANCIAL, PROCEDURES, SUPPLIERS, SETTINGS, REPORTS, AI_TRANSCRIPTION, COMMISSIONS, TASKS, MY_OFFICE, INSURANCE_BATCHES, RECEIVABLES]
 *                     canRead: { type: boolean }
 *                     canCreate: { type: boolean }
 *                     canUpdate: { type: boolean }
 *                     canDelete: { type: boolean }
 *     responses:
 *       200: { description: Permissões atualizadas }
 *       400: { description: Papel ou permissões inválidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas ADMIN e planos com permissões personalizadas }
 */
router.put('/permissions', authorize('ADMIN'), updateRolePermissionsController)

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista usuários da unidade ativa
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 20 }
 *     responses:
 *       200: { description: Lista paginada de usuários }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     summary: Cria um usuário na unidade ativa
 *     description: Requer ADMIN. tenantId e clinicId são derivados da sessão; não devem ser enviados no corpo. A criação de OWNER é restrita ao OWNER da rede Enterprise.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 6 }
 *               role: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *               phone: { type: string }
 *               cro: { type: string }
 *               defaultCommissionPercentage: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       201: { description: Usuário criado }
 *       400: { description: Dados inválidos ou limite de profissionais atingido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Papel sem permissão ou operação restrita ao OWNER }
 *       409: { description: E-mail já cadastrado }
 */
router.get('/', authorize('ADMIN'), listUsersController)
router.post('/', authorize('ADMIN'), createUserController)

/**
 * @openapi
 * /users/{id}/clinics:
 *   get:
 *     summary: Lista a unidade principal e os vínculos de unidade de um usuário
 *     description: Requer ADMIN; OWNER também é aceito.
 *     tags: [Users, Clinic network]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unidades principal e adicionais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 primary: { type: object }
 *                 additional: { type: array, items: { type: object } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id/clinics', authorize('ADMIN'), listUserClinicsController)

/**
 * @openapi
 * /users/{id}/clinics/{clinicId}:
 *   post:
 *     summary: Vincula um usuário a uma unidade adicional
 *     description: Requer ADMIN na rota; a operação exige Enterprise e é autorizada somente ao OWNER pelo serviço. A unidade principal não deve ser vinculada novamente.
 *     tags: [Users, Clinic network]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: clinicId
 *         required: true
 *         description: ID da unidade adicional
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Vínculo criado ou existente retornado }
 *       400: { description: Unidade já é a principal do usuário }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Requer plano Enterprise e papel OWNER }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Remove o vínculo de um usuário com uma unidade adicional
 *     description: Requer ADMIN na rota; a operação exige Enterprise e é autorizada somente ao OWNER pelo serviço. Não remove a unidade principal.
 *     tags: [Users, Clinic network]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: clinicId
 *         required: true
 *         description: ID da unidade adicional
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Vínculo removido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Operação exclusiva do OWNER }
 *       404: { description: Vínculo não encontrado }
 */
router.post('/:id/clinics/:clinicId', authorize('ADMIN'), assignUserClinicController)
router.delete('/:id/clinics/:clinicId', authorize('ADMIN'), removeUserClinicController)

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Usuário encontrado }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Atualiza os dados de perfil de um usuário
 *     description: Requer ADMIN; tenantId, clinicId, role e status não são alterados por este endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *               phone: { type: string, nullable: true }
 *               cro: { type: string, nullable: true }
 *               avatarUrl: { type: string, nullable: true }
 *               defaultCommissionPercentage: { type: number, minimum: 0, maximum: 100, nullable: true }
 *     responses:
 *       200: { description: Perfil atualizado }
 *       400: { description: Dados inválidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Exclui um usuário
 *     description: Requer ADMIN.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Usuário removido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authorize('ADMIN'), getUserByIdController)
router.put('/:id', authorize('ADMIN'), updateUserController)
router.delete('/:id', authorize('ADMIN'), deleteUserController)

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     summary: Altera o papel de um usuário
 *     description: Requer ADMIN; somente OWNER pode atribuir ou alterar o papel OWNER.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *               role: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *     responses:
 *       200: { description: Papel atualizado }
 *       400: { description: Papel inválido ou OWNER fora do Enterprise }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Apenas OWNER pode atribuir ou alterar OWNER }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/role', authorize('ADMIN'), updateUserRoleController)

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Ativa ou desativa um usuário
 *     description: Requer ADMIN; limites do plano são verificados ao desativar ou reativar profissionais.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *       200: { description: Status atualizado }
 *       400: { description: Status inválido ou limite de profissionais atingido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/status', authorize('ADMIN'), updateUserStatusController)

export default router
