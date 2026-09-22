import { Router } from 'express'
import {
  listContractsController,
  createContractController,
  signContractController,
  generatePreRegLinkController,
  submitPublicPreRegController,
} from '../../controllers/contractController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

/**
 * @openapi
 * /contracts/pre-cadastro/{token}:
 *   post:
 *     summary: Submissão pública de anamnese e pré-cadastro feita pelo próprio paciente via link temporário (WhatsApp)
 *     tags: [Contracts & Pre-Registration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [formData]
 *             properties:
 *               formData: { type: object }
 *     responses:
 *       200:
 *         description: Anamnese e dados salvos com sucesso
 *       404:
 *         description: Link inválido ou inexistente
 *       410:
 *         description: Link expirado
 */
router.post('/pre-cadastro/:token', submitPublicPreRegController)

// Demais rotas exigem autenticação do colaborador
router.use(authenticate)

/**
 * @openapi
 * /contracts:
 *   get:
 *     summary: Lista termos de consentimento e contratos emitidos na clínica
 *     tags: [Contracts & Pre-Registration]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de contratos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ClinicalContract' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), listContractsController)

/**
 * @openapi
 * /contracts:
 *   post:
 *     summary: Cria um novo contrato ou termo personalizado para o paciente
 *     tags: [Contracts & Pre-Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContractDTO'
 *     responses:
 *       201:
 *         description: Contrato gerado como rascunho (DRAFT)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Paciente não encontrado
 */
router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createContractController)

/**
 * @openapi
 * /contracts/{id}/sign:
 *   patch:
 *     summary: Registra assinatura eletrônica com carimbo de tempo e IP do signatário (LGPD/CFO)
 *     tags: [Contracts & Pre-Registration]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signatureUrl]
 *             properties:
 *               signatureUrl: { type: string }
 *     responses:
 *       200:
 *         description: Contrato assinado e com status SIGNED
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/sign', authorize('ADMIN', 'SECRETARY', 'DENTIST'), signContractController)

/**
 * @openapi
 * /contracts/pre-registration/link:
 *   post:
 *     summary: Gera token e hiperligação temporária para pré-cadastro via WhatsApp
 *     tags: [Contracts & Pre-Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePreRegLinkDTO'
 *     responses:
 *       201:
 *         description: Token e URL gerados com validade configurável
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     url: { type: string, example: '/pre-cadastro/a1b2c3d4...' }
 *                     expiresAt: { type: string, format: date-time }
 *       400:
 *         description: Nome ou telefone ausentes
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/pre-registration/link', authorize('ADMIN', 'SECRETARY', 'DENTIST'), generatePreRegLinkController)

export default router