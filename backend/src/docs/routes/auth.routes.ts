import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../../controllers/authController'
import { authenticate } from '../../middlewares/authMiddlewares'
import { loginLimiter } from '../../middlewares/rateLimiter.middleware'

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registra um novo tenant com sua primeira clínica e administrador
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, clinicId, name, email, password, role]
 *             properties:
 *               tenantId: { type: string }
 *               clinicId: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [ADMIN, DENTIST, SECRETARY] }
 *               phone: { type: string }
 *               cro: { type: string }
 *     responses:
 *       201: { description: Conta criada e token retornado }
 */
router.post('/register', registerController)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Realiza autenticação com e-mail e senha
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@odontoflow.com" }
 *               password: { type: string, example: "Senha@123" }
 *     responses:
 *       200: { description: Sucesso, retorna JWT e dados do usuário }
 *       401: { description: Credenciais inválidas }
 *       429: { description: Muitas tentativas ou conta temporariamente bloqueada }
 */
router.post('/login', loginLimiter, loginController)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do perfil do usuário autenticado
 *     tags: [Auth]
 *     responses:
 *       200: { description: Perfil do usuário atual }
 *       401: { description: Não autenticado }
 */
router.get('/me', authenticate, getMeController)

export default router