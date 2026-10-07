import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../controllers/authController'
import { authenticate } from '../middlewares/authMiddlewares'
import { loginLimiter } from '../middlewares/rateLimiter.middleware'

const router = Router()

// ─── ROTAS PÚBLICAS (ONBOARDING, REGISTO E LOGIN) ───

// Registo público: Criação de Tenant/Clínica (Landing Page) ou de utilizador interno
router.post('/register', registerController)

// Autenticação com proteção contra força bruta (Rate Limiting)
router.post('/login', loginLimiter, loginController)

// ─── ROTAS PRIVADAS (EXIGEM TOKEN JWT VÁLIDO) ───

// Dados do perfil, permissões e clínica do utilizador autenticado
router.get('/me', authenticate, getMeController)

export default router