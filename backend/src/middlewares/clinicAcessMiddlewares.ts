import type { Request, Response, NextFunction } from 'express'
import { getSessionUser } from './authMiddlewares'
import { getTenantContext } from '../lib/tenantContext'
import { AppError } from '../shared/AppError'

/**
 * Rede (Enterprise): só o OWNER ou o admin da PRÓPRIA unidade (:id) mexe nela.
 * Sem isso, o ADMIN da unidade A editaria/configuraria a unidade B (as rotas só checavam o papel).
 * Demais planos: comportamento anterior (sem restrição extra).
 */
export async function ownClinicOrOwner(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const ctx = await getTenantContext(user.tenantId)

    if (!ctx.isNetwork || user.role === 'OWNER' || req.params.id === user.clinicId) {
      next()
      return
    }
    throw new AppError(
      'Você só pode gerenciar a sua própria unidade. Para outras unidades, fale com o dono da rede.',
      403
    )
  } catch (err) {
    next(err)
  }
}
