import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../controllers/authController'
import { authenticate } from '../middlewares/authMiddlewares'
import { loginLimiter } from '../middlewares/rateLimiter.middleware'

const authRouter = Router()

// Registro de conta/clínica
authRouter.post('/register', registerController)

// Login blindado com rate limiting por IP + e-mail
authRouter.post('/login', loginLimiter, loginController)

// Perfil autenticado
authRouter.get('/me', authenticate, getMeController)

export default authRouter