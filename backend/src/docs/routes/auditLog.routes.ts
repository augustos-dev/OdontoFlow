import { Router } from 'express';
import { auditLogController } from '../../controllers/auditLogController';
import { authenticate } from '../../middlewares/authMiddlewares';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Endpoints para consulta e registro do histórico de auditoria
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Lista os logs de auditoria da clínica com paginação
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Quantidade de registros por página
 *     responses:
 *       200:
 *         description: Lista de logs retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 45
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Não autorizado / Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', auditLogController.listLogs);

export default router;