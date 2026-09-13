import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import type { RegisterDTO, LoginDTO, AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body as RegisterDTO)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body as LoginDTO)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getMeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const userId = user.userId || (user.sub as string)

    const profile = await authService.getMe(userId, user.tenantId, user.clinicId)
    res.status(200).json(profile)
  } catch (error) {
    next(error)
  }
}