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
import stockMovementRoutes from './stockMovement.routes'
import dentistProfileRouter from './dentistProfile.routes'
import clinicalAiRouter from './clinicalAi.routes'
import taskRouter from './task.routes'
import commissionRouter from './commission.routes'
import contractRouter from './contract.routes'

const router = Router()

// Módulos Existentes
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
router.use('/suppliers', supplierRoutes) 
router.use('/stock-movements', stockMovementRoutes)
router.use('/dentist-profile', dentistProfileRouter) // Módulo "Meu Consultório" (mocho, agenda individual, CRO)
router.use('/clinical-ai', clinicalAiRouter)         // Transcrição de voz & IA clínica no prontuário
router.use('/tasks', taskRouter)                     // Gestão de tarefas e pendências clínicas da equipe
router.use('/commissions', commissionRouter)         // Repasses de cirurgiões com abatimento de insumos
router.use('/contracts', contractRouter)             // Contratos, termos de consentimento e link público (WhatsApp)

export default router