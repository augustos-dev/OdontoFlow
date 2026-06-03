import { Router } from 'express'
import authRoutes from './auth.routes'

const router = Router()

router.use('/auth', authRoutes)

// Novos módulos serão registrados aqui conforme forem criados
// router.use('/patients', patientRoutes)
// router.use('/appointments', appointmentRoutes)
// router.use('/products', productRoutes)
// router.use('/transactions', transactionRoutes)

export default router