// backend/src/routes/patient.routes.ts

import { Router } from 'express'
import {
  createPatientController,
  listPatientsController,
  getPatientByIdController,
  updatePatientController,
  deletePatientController,
} from '../controllers/patientController'
import { generateAnamnesisTokenController } from '../controllers/medicalRecordController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { can } from '../middlewares/rbac.middleware'

const patientRoutes = Router()

// Todas as rotas de pacientes exigem autenticação
patientRoutes.use(authenticate)

// 📖 Rotas de Leitura
patientRoutes.get('/', can('PATIENTS', 'READ'), listPatientsController)
patientRoutes.get('/:id', can('PATIENTS', 'READ'), getPatientByIdController)

// ✍️ Rotas de Ações (Escrita/Edição)
patientRoutes.post('/', can('PATIENTS', 'CREATE'), createPatientController)
patientRoutes.put('/:id', can('PATIENTS', 'UPDATE'), updatePatientController)

// 🔗 Token Seguro de Anamnese (36 Horas)
patientRoutes.post(
  '/:id/anamnesis-token',
  authorize('ADMIN', 'SECRETARY', 'DENTIST'),
  generateAnamnesisTokenController
)

// 🗑️ Rota de Exclusão (Soft Delete - Apenas Admin)
patientRoutes.delete('/:id', authorize('ADMIN'), deletePatientController)

export default patientRoutes