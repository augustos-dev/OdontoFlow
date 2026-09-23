import { Router } from 'express'
import {
  createClinicController,
  listClinicsController,
  getClinicByIdController,
  updateClinicController,
  deactivateClinicController,
  reactivateClinicController,
  getClinicCustomizationController,
  updateClinicCustomizationController,
} from '../../controllers/clinicController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /clinics/{id}/customization:
 *   get:
 *     summary: Obtém a personalização visual (White-Label) da clínica
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Configurações visuais retornadas com sucesso }
 *   put:
 *     summary: Atualiza as cores e logotipo da clínica
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clinicName: { type: string }
 *               primaryColor: { type: string, example: "#06b6d4" }
 *               accentColor: { type: string, example: "#0891b2" }
 *               secondaryColor: { type: string, example: "#0f172a" }
 *               fontFamily: { type: string, example: "Inter" }
 *               darkModeDefault: { type: boolean }
 *               customLogoUrl: { type: string }
 *               customFavicon: { type: string }
 *     responses:
 *       200: { description: Identidade visual atualizada }
 */
router.get('/:id/customization', getClinicCustomizationController)
router.put('/:id/customization', authorize('ADMIN'), updateClinicCustomizationController)

/**
 * @openapi
 * /clinics:
 *   get:
 *     summary: Lista todas as clínicas vinculadas ao tenant
 *     tags: [Clinics]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Lista de unidades retornada com sucesso }
 *   post:
 *     summary: Cadastra uma nova unidade clínica (apenas ADMIN)
 *     tags: [Clinics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               cnpj: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               logoUrl: { type: string }
 *               paymentIntegrationActive: { type: boolean }
 *     responses:
 *       201: { description: Clínica criada com sucesso }
 */
router.get('/', listClinicsController)
router.post('/', authorize('ADMIN'), createClinicController)

/**
 * @openapi
 * /clinics/{id}:
 *   get:
 *     summary: Busca dados de uma clínica específica pelo ID
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Clínica encontrada }
 *       404: { description: Clínica não encontrada }
 *   put:
 *     summary: Atualiza os dados de uma clínica (apenas ADMIN)
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               cnpj: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *     responses:
 *       200: { description: Dados atualizados com sucesso }
 */
router.get('/:id', getClinicByIdController)
router.put('/:id', authorize('ADMIN'), updateClinicController)

/**
 * @openapi
 * /clinics/{id}/deactivate:
 *   patch:
 *     summary: Desativa uma filial da clínica
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Clínica desativada }
 */
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)

/**
 * @openapi
 * /clinics/{id}/reactivate:
 *   patch:
 *     summary: Reativa uma unidade clínica desativada
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Clínica reativada }
 */
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router