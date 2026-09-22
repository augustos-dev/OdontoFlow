import type { Request, Response, NextFunction } from 'express'
import * as commissionService from '../services/commissionService'
import type { CalculateCommissionDTO, FilterCommissionDTO } from '../types/commission.types'
import type { AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

export async function listCommissionsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const filters = req.query as unknown as FilterCommissionDTO

    const commissions = await commissionService.list(user.tenantId, user.clinicId, filters)
    res.status(200).json({ status: 'success', data: commissions })
  } catch (error) {
    next(error)
  }
}

export async function createCommissionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)

    const commission = await commissionService.calculateAndCreate(
      user.tenantId,
      user.clinicId,
      req.body as CalculateCommissionDTO
    )

    res.status(201).json({ status: 'success', data: commission })
  } catch (error) {
    next(error)
  }
}

export async function payCommissionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params

    const commission = await commissionService.markAsPaid(user.tenantId, user.clinicId, id as string)
    res.status(200).json({ status: 'success', data: commission })
  } catch (error) {
    next(error)
  }
}