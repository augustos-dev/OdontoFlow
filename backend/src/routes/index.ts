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
import auditLogRoutes from './auditLog.routes' // 🛡️ Importação da rota de auditoria
import supplierRoutes from './supplier.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/appointments', appointmentRouter)
router.use('/transactions', transactionRoute)
router.use('/products', productRouter)
router.use('/medical-records', medicalRecordRouter)
router.use('/procedures', procedureRoutes)
router.use('/treatment-plans', treatmentPlanRoutes)
router.use('/users', userRoutes)
router.use('/clinics', clinicRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/audit-logs', auditLogRoutes) 
router.use('/api/suppliers', supplierRoutes)

export default router