import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
  listMyClinicsController,
  switchClinicController,
} from '../../controllers/authController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { loginLimiter } from '../../middlewares/rateLimiter.middleware'

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Cadastra um colaborador no tenant do usuário autenticado
 *     description: Requer ADMIN; OWNER também é aceito. O tenant é obtido exclusivamente do JWT. ADMIN cadastra na própria unidade; OWNER pode informar clinicId. Não cria tenant nem permite cadastrar OWNER por esta operação.
 *     tags: [Auth]
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
 *               name: { type: string, example: "Dra. Mariana Costa" }
 *               email: { type: string, format: email, example: "mariana@clinica.com.br" }
 *               password: { type: string, minLength: 6, example: "SenhaForte@123" }
 *               role: { type: string, enum: [ADMIN, DENTIST, SECRETARY] }
 *               phone: { type: string, example: "85999990000" }
 *               cro: { type: string, example: "CE-12345" }
 *               clinicId:
 *                 type: string
 *                 format: uuid
 *                 description: Unidade de destino, considerada somente para OWNER. Para ADMIN, a unidade da sessão é usada.
 *     responses:
 *       201:
 *         description: Colaborador criado e token de acesso emitido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Dados inválidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: Tenant ou unidade não encontrados/inativos }
 *       409: { description: E-mail já cadastrado }
 */
router.post('/register', authenticate, authorize('ADMIN'), registerController)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Autentica o usuário com e-mail e senha
 *     description: O endpoint possui limite de tentativas; logins bem-sucedidos não consomem a cota.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginDTO' }
 *     responses:
 *       200:
 *         description: Autenticação concluída
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Dados inválidos }
 *       401: { description: E-mail ou senha inválidos }
 *       403: { description: Usuário ou assinatura inativos, ou conta temporariamente bloqueada }
 *       429: { description: Limite de tentativas excedido }
 */
router.post('/login', loginLimiter, loginController)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna o perfil e as unidades acessíveis pelo usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil, tenant, unidade ativa e lista de unidades acessíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string, format: email }
 *                 role: { type: string, enum: [ADMIN, DENTIST, SECRETARY, OWNER] }
 *                 clinic: { type: object, description: Unidade ativa }
 *                 clinics: { type: array, items: { type: object }, description: Unidades às quais o usuário tem acesso }
 *                 tenant: { type: object }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/me', authenticate, getMeController)

/**
 * @openapi
 * /auth/clinics:
 *   get:
 *     summary: Lista as unidades acessíveis pelo usuário autenticado
 *     description: OWNER recebe as unidades ativas do tenant; os demais recebem a unidade principal e as unidades vinculadas a sua conta.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unidades disponíveis para troca
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 required: [id, name]
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   logoUrl: { type: string, nullable: true }
 *                   cnpj: { type: string, nullable: true }
 *                   phone: { type: string, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/clinics', authenticate, listMyClinicsController)

/**
 * @openapi
 * /auth/switch-clinic:
 *   post:
 *     summary: Troca a unidade ativa da sessão
 *     description: Valida o acesso à unidade no banco e retorna um novo JWT com o clinicId selecionado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinicId]
 *             properties:
 *               clinicId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unidade alterada; novo token emitido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: clinicId ausente ou inválido }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Usuário não tem acesso à unidade solicitada }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/switch-clinic', authenticate, switchClinicController)

export default router
