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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - message
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "85999998888"
 *                 description: Número com DDD (apenas dígitos)
 *               message:
 *                 type: string
 *                 example: "Olá! A sua consulta está confirmada para amanhã."
 *     responses:
 *       200:
 *         description: Mensagem enviada ou simulada com sucesso
 *       400:
 *         description: Parâmetros obrigatórios em falta
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/send-text', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendCustomWhatsAppController)

/**
 * @openapi
 * /whatsapp/pre-registration:
 *   post:
 *     summary: Envia link de pré-cadastro/anamnese para o paciente
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - patientName
 *               - linkUrl
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "85999998888"
 *               patientName:
 *                 type: string
 *                 example: "Maria Souza"
 *               linkUrl:
 *                 type: string
 *                 example: "https://odontoflow.com.br/pre-cadastro/token-xyz"
 *     responses:
 *       200:
 *         description: Link de pré-cadastro enviado com sucesso
 *       400:
 *         description: Dados incompletos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/pre-registration', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendPreRegistrationLinkController)

/**
 * @openapi
 * /whatsapp/reminder:
 *   post:
 *     summary: Envia lembrete ativo de consulta agendada
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - patientName
 *               - dateStr
 *               - timeStr
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "85999998888"
 *               patientName:
 *                 type: string
 *                 example: "Carlos Alberto"
 *               dateStr:
 *                 type: string
 *                 example: "25/09/2026"
 *               timeStr:
 *                 type: string
 *                 example: "14:30"
 *     responses:
 *       200:
 *         description: Lembrete de consulta enviado com sucesso
 *       400:
 *         description: Dados do lembrete incompletos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/reminder', authorize('ADMIN', 'DENTIST', 'RECEPTIONIST'), sendReminderController)

export default router