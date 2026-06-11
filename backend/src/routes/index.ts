import { Router } from 'express'
import authRoutes from './auth.routes'
import patientRoutes from './patient.routes'
import appointmentRouter from './appointment.routes'
import transactionRoute from './transaction.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/appointments', appointmentRouter)
router.use('/transactions', transactionRoute)

// Novos módulos serão registrados aqui conforme forem criados
// router.use('/patients', patientRoutes)

// router.use('/products', productRoutes)


export default router