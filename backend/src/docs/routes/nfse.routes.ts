import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'
import { emitNfseController } from '../../controllers/nfseController'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /nfse/emit:
 *   post:
 *     summary: Emite NFS-e para um procedimento ou consulta odontológica
 *     tags: [Fiscal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient
 *               - serviceValue
 *               - serviceDescription
 *             properties:
 *               clinicCnpj:
 *                 type: string
 *               im:
 *                 type: string
 *               serviceValue:
 *                 type: number
 *                 example: 250.00
 *               serviceDescription:
 *                 type: string
 *                 example: "Restauração em Resina Composta Dente 16"
 *               patient:
 *                 type: object
 *                 properties:
 *                   name: { type: string, example: "João Silva" }
 *                   cpf: { type: string, example: "12345678901" }
 *                   email: { type: string, example: "joao@email.com" }
 *     responses:
 *       200:
 *         description: NFS-e enviada para processamento na prefeitura
 *       400:
 *         description: Dados fiscais inválidos
 */
router.post('/emit', authorize('ADMIN'), emitNfseController)

export default router