import { Request, Response, NextFunction } from 'express'
import { SystemModule, UserRole } from '@prisma/client'
import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'

type PermissionAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'

export function can(module: SystemModule, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user

    if (!user) {
      return next(new AppError('Não autenticado.', 401))
    }

    // ADMIN e OWNER (dono da rede) possuem bypass total
    if (user.role === 'ADMIN' || user.role === 'OWNER') {
      return next()
    }

    try {
      // Busca regra específica da filial ou regra global do tenant
      const permission = await prisma.rolePermission.findFirst({
          where: {
              tenantId: user.tenantId,
              role: user.role as UserRole,
              module,
              OR: [
                  { clinicId: user.clinicId },
                  { clinicId: null }
              ]
          },
          // A regra da unidade tem prioridade sobre a regra global do tenant (sem ordenar, o findFirst podia
          // devolver a global mesmo existindo uma específica).
          orderBy: { clinicId: { sort: 'desc', nulls: 'last' } }
      })

      if (!permission) {
        return next(new AppError('Acesso não permitido para este módulo.', 403))
      }

      const permissionMap: Record<PermissionAction, boolean> = {
        READ: permission.canRead,
        CREATE: permission.canCreate,
        UPDATE: permission.canUpdate,
        DELETE: permission.canDelete
      }

      if (!permissionMap[action]) {
        return next(new AppError(`Você não tem permissão para executar esta ação (${action.toLowerCase()}) neste módulo.`, 403))
      }

      return next()
    } catch (err) {
      return next(err)
    }
  }
}