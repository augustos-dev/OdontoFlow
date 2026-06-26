import { Router } from 'express'
import authRoutes from './auth.routes'
import patientRoutes from './patient.routes'
import appointmentRouter from './appointment.routes'
import transactionRoute from './transaction.routes'
import productRouter from './product.routes'
import medicalRecordRouter from './medicalRecord.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/appointments', appointmentRouter)
router.use('/transactions', transactionRoute)
router.use('/products', productRouter)
router.use('/medical-records', medicalRecordRouter)

// Novos módulos serão registrados aqui conforme forem criados
// router.use('/patients', patientRoutes)




export default router