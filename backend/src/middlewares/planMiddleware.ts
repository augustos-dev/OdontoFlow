import type { Request, Response, NextFunction } from 'express'
import { TenantPlan } from '@prisma/client'
import { AppError } from '../shared/AppError'
import { getSessionUser } from './authMiddlewares'
import { isPlanSufficient, FEATURE_MIN_PLAN, PlanFeature } from '../shared/planLimits'
import { getTenantContext } from '../lib/tenantContext'

/**
 * O plano é lido do BANCO (com cache curto), e não do JWT:
 * upgrade, downgrade ou cancelamento passam a valer sem esperar novo login,
 * e um token antigo/sem plano não vira "BASIC" por fallback.
 */
async function currentPlan(req: Request): Promise<TenantPlan> {
  const user = getSessionUser(req)
  const ctx = await getTenantContext(user.tenantId)
  return ctx.plan
}

export function requirePlan(minPlan: TenantPlan) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await currentPlan(req)
      if (!isPlanSufficient(plan, minPlan)) {
        throw new AppError(
          `Funcionalidade exclusiva para o plano ${minPlan}. O plano atual da sua clínica é ${plan}.`,
          403
        )
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

export function requireFeature(feature: PlanFeature) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const minPlan = FEATURE_MIN_PLAN[feature]
      const plan = await currentPlan(req)
      if (!isPlanSufficient(plan, minPlan)) {
        throw new AppError(
          `O seu plano atual (${plan}) não inclui o módulo ${feature}. Atualize para o plano ${minPlan} para desbloquear.`,
          403
        )
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
