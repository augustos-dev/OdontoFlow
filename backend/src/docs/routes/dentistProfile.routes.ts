import { Router } from 'express'
import {
  getDentistProfileController,
  updateDentistProfileController,
} from '../../controllers/DentistProfileController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /dentist-profile:
 *   get:
 *     summary: Obtém os dados e preferências do consultório do cirurgião-dentista autenticado
 *     tags: [Meu Consultório]
 *     responses:
 *       200:
 *         description: Dados do consultório retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/DentistProfile' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/', authorize('ADMIN', 'DENTIST'), getDentistProfileController)

/**
 * @openapi
 * /dentist-profile:
 *   put:
 *     summary: Atualiza configurações da cadeira, horários de atendimento, especialidades e assinatura digital
 *     tags: [Meu Consultório]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDentistProfileDTO'
 *     responses:
 *       200:
 *         description: Configurações do consultório salvas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/DentistProfile' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/', authorize('ADMIN', 'DENTIST'), updateDentistProfileController)

export default router