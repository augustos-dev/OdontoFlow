import { Router } from 'express'
import {
  registerController,
  loginController,
  getMeController,
} from '../controllers/authController'
import { authenticate } from '../middlewares/authMiddlewares'
import { loginLimiter } from '../middlewares/rateLimiter.middleware'

const router = Router()

router.post('/register', registerController)
router.post('/login', loginLimiter, loginController)
router.get('/me', authenticate, getMeController)

export default router