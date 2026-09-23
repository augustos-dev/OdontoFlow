import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import {
  sendCustomWhatsAppController,
  sendPreRegistrationLinkController,
  sendReminderController,
} from '../controllers/whatsappController'

const router = Router()

router.use(authenticate)

router.post('/send-text', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendCustomWhatsAppController)
router.post('/pre-registration', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendPreRegistrationLinkController)
router.post('/reminder', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendReminderController)

export default router