import { Router } from 'express'
import authRoutes from './auth.routes'
import patientRoutes from './patient.routes'
import appointmentRouter from './appointment.routes'
import transactionRoute from './transaction.routes'
import productRouter from './product.routes'
import medicalRecordRouter from './medicalRecord.routes'
import procedureRoutes from './procedure.routes'
import treatmentPlanRoutes from './treatment.routes'
import userRoutes from './user.routes'
import clinicRoutes from './clinic.routes'
import dashboardRoutes from './dashboard.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/appointments', appointmentRouter)
router.use('/transactions', transactionRoute)
router.use('/products', productRouter)
router.use('/medical-records', medicalRecordRouter)
router.use('/procedures', procedureRoutes)
router.use('/treatment-plans', treatmentPlanRoutes)
router.use('user',userRoutes)
router.use('/clinics', clinicRoutes)
router.use('/dashboard', dashboardRoutes)
 





export default router