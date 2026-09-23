import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { emitNfseController } from '../controllers/nfseController'

const router = Router()

router.use(authenticate)

router.post('/emit', authorize('ADMIN'), emitNfseController)

export default router