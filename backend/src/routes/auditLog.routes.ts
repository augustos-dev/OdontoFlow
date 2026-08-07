import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController';
import { authenticate, authorize } from '../middlewares/authMiddlewares';

const router = Router();

// 1. Aplica a verificação de JWT para todas as rotas deste arquivo
router.use(authenticate);

// 2. Garante que apenas usuários ADMIN possam visualizar o histórico de auditoria
router.get('/', authorize('ADMIN'), auditLogController.listLogs);

export default router;