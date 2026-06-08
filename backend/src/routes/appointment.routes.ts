import { Router } from "express";
import { createAppointmentController,listAppointmentsController,getAppointmentByIdController,updateAppointmentController,updateAppointmentStatusController, deleteAppointmentController } from "../controllers/apponitmentController";
import { authenticate,authorize } from "../middlewares/authMiddlewares";

const appointmentRouter = Router()

// rotas de agendamenyos todas privadas 

appointmentRouter.use(authenticate)

// rotas privadas - leituras  todos roles podem acessar 

appointmentRouter.get('/',listAppointmentsController)
appointmentRouter.get('/:id',getAppointmentByIdController)

// rotas privadas - edicao (ADM , SECRETARIA , DENTISTA )

appointmentRouter.post('/',authorize('ADMIN','SECRETARY','DENSTIST'),createAppointmentController)
appointmentRouter.put('/:id',authorize('ADMIN','SECRETARY','DENSTIST'),updateAppointmentController)

// rotas privadas de status 

appointmentRouter.patch('/:id/status', authorize('ADMIN','SECRETARY','DENSTIST'),updateAppointmentStatusController)

// rotas privadas de exclusao 

appointmentRouter.delete('/:id',authorize('ADMIN','SECRETARY'),deleteAppointmentController)

export default appointmentRouter