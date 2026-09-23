import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import {
  sendCustomWhatsAppController,
  sendPreRegistrationLinkController,
  sendReminderController,
} from '../../controllers/whatsappController'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /whatsapp/send-text:
 *   post:
 *     summary: Dispara mensagem avulsa de texto via WhatsApp
 *     tags: [WhatsApp]
 */
router.post('/send-text', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendCustomWhatsAppController)

/**
 * @openapi
 * /whatsapp/pre-registration:
 *   post:
 *     summary: Envia link de pré-cadastro/anamnese para o paciente
 *     tags: [WhatsApp]
 */
router.post('/pre-registration', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendPreRegistrationLinkController)

/**
 * @openapi
 * /whatsapp/reminder:
 *   post:
 *     summary: Envia lembrete ativo de consulta agendada
 *     tags: [WhatsApp]
 */
router.post('/reminder', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendReminderController)

export default router