// backend/src/controllers/auth.controller.ts

import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import type { RegisterDTO, LoginDTO } from '../types/auth.types'

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
    const { sub: userId, tenantId, clinicId } = req.user!
    const user = await authService.getMe(userId, tenantId, clinicId)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}