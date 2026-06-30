// backend/src/routes/auth.routes.ts

import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../../controllers/authController'
import { authenticate } from '../../middlewares/authMiddlewares'

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário em uma clínica
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDTO'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/register', registerController)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Autentica um usuário e retorna o token JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/login', loginController)

// ─── Rotas Privadas (exigem JWT válido) ──────────────────────────────────────

router.use(authenticate)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me', getMeController)

export default router