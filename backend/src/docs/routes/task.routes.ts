import { Router } from 'express'
import {
  listTasksController,
  createTaskController,
  updateTaskController,
  deleteTaskController,
} from '../../controllers/taskController'
import { authenticate, authorize } from '../../middlewares/authMiddlewares'

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: Lista tarefas clínicas e pendências da equipe com filtros
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELED] }
 *       - in: query
 *         name: assignedToId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de tarefas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ClinicTask' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), listTasksController)

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Cria uma nova tarefa associada a prótese, compras ou retorno de paciente
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClinicTaskDTO'
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/ClinicTask' }
 *       400:
 *         description: Dados incompletos ou inválidos
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', authorize('ADMIN', 'SECRETARY', 'DENTIST'), createTaskController)

/**
 * @openapi
 * /tasks/{id}:
 *   patch:
 *     summary: Atualiza status, prioridade, prazo ou responsável por uma tarefa
 *     tags: [Tasks]
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
 *             $ref: '#/components/schemas/UpdateClinicTaskDTO'
 *     responses:
 *       200:
 *         description: Tarefa atualizada com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', authorize('ADMIN', 'SECRETARY', 'DENTIST'), updateTaskController)

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Exclui permanentemente uma pendência da clínica
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Tarefa excluída com sucesso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authorize('ADMIN', 'SECRETARY'), deleteTaskController)

export default router