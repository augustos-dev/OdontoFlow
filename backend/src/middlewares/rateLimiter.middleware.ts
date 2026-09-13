import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Limite geral para navegação da API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Muitas requisições originadas deste IP. Tente novamente em alguns minutos.'
  }
})

// Barreira estrita para o login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas com erro bloqueiam novas tentativas
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Login correto não consome cota
  keyGenerator: (req: Request): string => {
    const email = (req.body?.email || '').trim().toLowerCase()
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    return `${ip}_${email}`
  },
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      status: 'error',
      message: 'Muitas tentativas incorretas de login. Por segurança, tente novamente em 15 minutos.'
    })
  }
})