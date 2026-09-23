import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import type { RegisterDTO, LoginDTO } from '../types/auth.types'
import { getSessionUser } from '../middlewares/authMiddlewares'

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