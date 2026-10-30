import { prisma } from '../lib/prisma'; // Ou onde fica a instância do seu PrismaClient
import { CreateAuditLogInput } from '../types/AuditLog.types';

export const auditLogService = {
  async createLog(input: CreateAuditLogInput) {
    try {
      // Se não enviou o userName no input, busca rapidinho pelo userId
      let userName = input.userName

      if (!userName && input.userId) {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { name: true, email: true },
        })
        userName = user?.name || user?.email || 'Usuário do Sistema'
      }

      return await prisma.auditLog.create({
        data: {
          ...input,
          userName, // 🟢 Garante que a coluna nunca mais fique NULL
        },
      })
    } catch (error) {
      console.error('Erro ao gravar AuditLog:', error)
    }
  },

  // 2. Listar logs da clínica com paginação.
  //    clinicId = null -> todas as unidades do tenant (visão do dono da rede; o controller valida o OWNER).
  async getLogs(tenantId: string, clinicId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = clinicId ? { tenantId, clinicId } : { tenantId };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({
        where,
      }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          clinic: { select: { id: true, name: true } },
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