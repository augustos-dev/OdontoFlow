import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Limite geral para navegação da API.
// É por IP: uma clínica inteira costuma sair por UM IP público, e cada tela (dashboard etc.) faz várias chamadas.
// O padrão antigo (300 por 15 min para a clínica toda) travaria o uso normal, então o teto é configurável.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: Number(process.env.API_RATE_LIMIT_MAX) || 1500,
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