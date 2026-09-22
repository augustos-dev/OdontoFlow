import type { Request, Response, NextFunction } from 'express'
import * as dentistProfileService from '../services/DentistProfileService'
import type { UpdateDentistProfileDTO } from '../types/dentistProfile.types'
import type { AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

export async function getDentistProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const userId = user.userId || (user.sub as string)

    const profile = await dentistProfileService.getProfile(user.tenantId, user.clinicId, userId)
    res.status(200).json({ status: 'success', data: profile })
  } catch (error) {
    next(error)
  }
}

export async function updateDentistProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const userId = user.userId || (user.sub as string)

    const updatedProfile = await dentistProfileService.updateProfile(
      user.tenantId,
      user.clinicId,
      userId,
      req.body as UpdateDentistProfileDTO
    )
    res.status(200).json({ status: 'success', data: updatedProfile })
  } catch (error) {
    next(error)
  }
}