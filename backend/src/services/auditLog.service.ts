import { prisma } from '../lib/prisma'; // Ou onde fica a instância do seu PrismaClient
import { CreateAuditLogInput } from '../types/AuditLog.types';

export const auditLogService = {
  // 1. Gravar log no banco
  async createLog(input: CreateAuditLogInput) {
    try {
      return await prisma.auditLog.create({
        data: input,
      });
    } catch (error) {
      // Log no console para não derrubar a requisição principal caso falhe o log de auditoria
      console.error('Erro ao gravar AuditLog:', error);
    }
  },

  // 2. Listar logs da clínica com paginação
  async getLogs(tenantId: string, clinicId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({
        where: { tenantId, clinicId },
      }),
      prisma.auditLog.findMany({
        where: { tenantId, clinicId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  },
};