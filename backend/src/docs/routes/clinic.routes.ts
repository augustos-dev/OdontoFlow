// backend/src/routes/clinic.routes.ts

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
 *     summary: Obtém os parâmetros de identidade visual da clínica (cores, logos e tipografia)
 *     tags: [Clinics - White-label]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Configurações visuais retornadas com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/customization', getClinicCustomizationController)

/**
 * @openapi
 * /clinics/{id}/customization:
 *   put:
 *     summary: Atualiza o tema, paleta de cores e identidade visual da clínica (apenas ADMIN)
 *     tags: [Clinics - White-label]
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
 *             properties:
 *               clinicName: { type: string }
 *               primaryColor: { type: string, example: "#06b6d4" }
 *               accentColor: { type: string, example: "#0891b2" }
 *               secondaryColor: { type: string, example: "#0f172a" }
 *               fontFamily: { type: string, enum: [Inter, Roboto, Poppins, Montserrat] }
 *               darkModeDefault: { type: boolean }
 *               customLogoUrl: { type: string, format: uri }
 *               customFavicon: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Identidade visual da clínica atualizada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id/customization', authorize('ADMIN'), updateClinicCustomizationController)

/**
 * @openapi
 * /clinics:
 *   get:
 *     summary: Lista todas as clínicas do tenant
 *     tags: [Clinics]
 *     responses:
 *       200:
 *         description: Lista de clínicas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   cnpj: { type: string }
 *                   phone: { type: string }
 *                   email: { type: string }
 *                   address: { type: string }
 *                   isActive: { type: boolean }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', listClinicsController)

/**
 * @openapi
 * /clinics/{id}:
 *   get:
 *     summary: Busca uma clínica por ID
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados completos da clínica
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', getClinicByIdController)

/**
 * @openapi
 * /clinics:
 *   post:
 *     summary: Cria uma nova filial para o tenant (apenas ADMIN)
 *     tags: [Clinics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'Sorriso Prime - Filial Norte' }
 *               cnpj: { type: string, example: '11222333000199' }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               logoUrl: { type: string }
 *               paymentIntegrationActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Clínica criada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', authorize('ADMIN'), createClinicController)

/**
 * @openapi
 * /clinics/{id}:
 *   put:
 *     summary: Atualiza os dados de uma clínica (apenas ADMIN)
 *     tags: [Clinics]
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
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               logoUrl: { type: string }
 *     responses:
 *       200:
 *         description: Clínica atualizada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authorize('ADMIN'), updateClinicController)

/**
 * @openapi
 * /clinics/{id}/deactivate:
 *   patch:
 *     summary: Desativa uma clínica (apenas ADMIN)
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Clínica desativada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateClinicController)

/**
 * @openapi
 * /clinics/{id}/reactivate:
 *   patch:
 *     summary: Reativa uma clínica desativada (apenas ADMIN)
 *     tags: [Clinics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Clínica reativada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/reactivate', authorize('ADMIN'), reactivateClinicController)

export default router