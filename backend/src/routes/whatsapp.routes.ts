import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/authMiddlewares'
import { requireFeature } from '../middlewares/planMiddleware'
import {
  sendCustomWhatsAppController,
  sendPreRegistrationLinkController,
  sendReminderController,
} from '../controllers/whatsappController'

const router = Router()

router.use(authenticate)
// Disparos e integrações WhatsApp exigem plano PREMIUM ou superior
router.use(requireFeature('WHATSAPP_INTEGRATION'))

router.post('/send-text', authorize('ADMIN', 'DENTIST', 'SECRETARY'), sendCustomWhatsAppController)
router.post('/pre-registration', authorize('ADMIN', 'DENTIST', 'SECRETARY'), sendPreRegistrationLinkController)
router.post('/reminder', authorize('ADMIN', 'DENTIST', 'SECRETARY'), sendReminderController)

export default router