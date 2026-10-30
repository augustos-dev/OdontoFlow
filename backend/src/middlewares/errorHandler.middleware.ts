import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '../shared/AppError'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  // Violações do banco que antes viravam 500 (ex.: dois cadastros simultâneos com o mesmo CPF).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Já existe um registro com estes dados.' })
      return
    }
    if (err.code === 'P2003') {
      res.status(409).json({ message: 'Operação não permitida: há registros relacionados inexistentes ou em uso.' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Registro não encontrado.' })
      return
    }
  }

  // Erros do body-parser e do multer eram devolvidos como 500.
  const e = err as { type?: string; name?: string; code?: string; status?: number } | null
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'JSON inválido no corpo da requisição.' })
    return
  }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ message: 'Corpo da requisição grande demais.' })
    return
  }
  if (e?.name === 'MulterError') {
    res.status(400).json({
      message: e.code === 'LIMIT_FILE_SIZE' ? 'Arquivo excede o tamanho permitido.' : 'Falha no envio do arquivo.',
    })
    return
  }

  console.error('[Unhandled Error]', err)
  res.status(500).json({ message: 'Erro interno do servidor.' })
}
