// backend/src/routes/patient.routes.ts

import { Router } from 'express'
import {
  createPatientController,
  listPatientsController,
  getPatientByIdController,
  updatePatientController,
  deletePatientController,
} from '../controllers/patientController' // Alinhado com a nomenclatura .controller
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const patientRoutes = Router()

// Todas as rotas exigem autenticação
patientRoutes.use(authenticate)

// 📖 Rotas de Leitura
patientRoutes.get('/', listPatientsController)
patientRoutes.get('/:id', getPatientByIdController)

// ✍️ Rotas de Ações (Escrita/Edição)
patientRoutes.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createPatientController)
patientRoutes.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updatePatientController)

// 🗑️ Rota de Exclusão (Apenas Admin)
patientRoutes.delete('/:id', authorize('ADMIN'), deletePatientController)

export default patientRoutes