import { Router } from "express";
import {
  createPatientController,
  listPatientsController,
  getPatientByIdController,
  updatePatientController,
  deletePatientController,
} from '../controllers/PatientController'
import { authenticate,authorize } from "../middlewares/authMiddlewares";

const patientRoutes = Router()

patientRoutes.use(authenticate)

// leitura 

patientRoutes.get('/',listPatientsController)
patientRoutes.get('/:id',getPatientByIdController)

// rotas de acoes 

patientRoutes.post('/',authorize('ADMIN','SECRETARY','DENTIST'),createPatientController)
patientRoutes.put('/:id',authorize('ADMIN','SECRETARY','DENTIST'),updatePatientController)

// delete 

patientRoutes.delete('/:id',authorize('ADMIN'),deletePatientController)


export default patientRoutes