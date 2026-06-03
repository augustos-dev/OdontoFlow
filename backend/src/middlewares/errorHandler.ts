import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../shared/AppError'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }

  console.error('[Unhandled Error]', err)
  res.status(500).json({ message: 'Erro interno do servidor.' })
}