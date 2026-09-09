import { Request, Response } from 'express';
import { auditLogService } from '../services/auditLog.service';

export const auditLogController = {
  async listLogs(req: Request, res: Response) {
    try {
      // Assumindo que seu middleware de autenticação injeta tenantId e clinicId no req.user ou req.tenant
      const { tenantId, clinicId } = (req as any).user;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await auditLogService.getLogs(tenantId, clinicId, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return res.status(500).json({ error: 'Erro interno ao carregar auditoria.' });
    }
  },
};