import { Request, Response } from 'express';
import { auditLogService } from '../services/auditLog.service';

export const auditLogController = {
  async listLogs(req: Request, res: Response) {
    try {
      const { tenantId, clinicId, role } = (req as any).user;
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      // Teto de 100: antes `?limit=1000000` carregava a tabela inteira.
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));

      // ?scope=network: auditoria de todas as unidades (somente o dono da rede)
      const network = req.query.scope === 'network';
      if (network && role !== 'OWNER') {
        return res.status(403).json({ message: 'A auditoria consolidada da rede é exclusiva do dono da rede.' });
      }

      const result = await auditLogService.getLogs(tenantId, network ? null : clinicId, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return res.status(500).json({ error: 'Erro interno ao carregar auditoria.' });
    }
  },
};
