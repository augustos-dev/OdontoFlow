import { Router } from 'express'
import authRoutes from './auth.routes'
import patientRoutes from './patient.routes'
import appointmentRouter from './appointment.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/appointments', appointmentRouter)

// Novos módulos serão registrados aqui conforme forem criados
// router.use('/patients', patientRoutes)

// router.use('/products', productRoutes)
// router.use('/transactions', transactionRoutes)

export default router