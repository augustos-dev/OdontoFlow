import type { Request, Response, NextFunction } from 'express'
import { TenantPlan } from '@prisma/client'
import { AppError } from '../shared/AppError'
import { getSessionUser } from './authMiddlewares'
import { isPlanSufficient, FEATURE_MIN_PLAN, PlanFeature } from '../shared/planLimits'

export function requirePlan(minPlan: TenantPlan) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getSessionUser(req)
    const plan = ((user?.plan as string) || 'BASIC').toUpperCase() as TenantPlan

    if (!isPlanSufficient(plan, minPlan)) {
      throw new AppError(
        `Funcionalidade exclusiva para o plano ${minPlan}. O plano atual da sua clínica é ${plan}.`,
        403
      )
    }

    next()
  }
}

export function requireFeature(feature: PlanFeature) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const minPlan = FEATURE_MIN_PLAN[feature]
    const user = getSessionUser(req)
    const plan = ((user?.plan as string) || 'BASIC').toUpperCase() as TenantPlan

    if (!isPlanSufficient(plan, minPlan)) {
      throw new AppError(
        `O seu plano atual (${plan}) não inclui o módulo ${feature}. Atualize para o plano ${minPlan} para desbloquear.`,
        403
      )
    }

    next()
  }
}