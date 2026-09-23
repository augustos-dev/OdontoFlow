import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/auth.types'
import { AppError } from '../shared/AppError'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token não fornecido.' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Não autenticado.' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Acesso negado. Permissão insuficiente.' })
      return
    }
    
    next()
  }
}

/**
 * Retorna as informações do usuário autenticado a partir da requisição.
 * Garante tipagem estrita para tenantId, clinicId, userId e role nos controllers de IA, contratos e tarefas.
 */
export function getSessionUser(req: Request): JwtPayload {
  if (!req.user) {
    throw new AppError('Usuário não autenticado no contexto da requisição.', 401)
  }
  return req.user
}