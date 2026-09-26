import { Router } from 'express'
import {
  createAppointmentController,
  listAppointmentsController,
  getAppointmentByIdController,
  updateAppointmentController,
  updateAppointmentStatusController,
  deleteAppointmentController,
} from '../controllers/apponitmentController'
import { authenticate, authorize } from '../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

router.get('/', listAppointmentsController)
router.get('/:id', getAppointmentByIdController)

router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createAppointmentController)
router.put('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentController)
router.patch('/:id/status', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateAppointmentStatusController)

router.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteAppointmentController)

export default router