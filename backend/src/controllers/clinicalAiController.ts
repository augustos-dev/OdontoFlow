import type { Request, Response, NextFunction } from 'express'
import * as clinicalAiService from '../services/clinicalAiService'
import type { AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

export async function createTranscriptionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const dentistId = user.userId || (user.sub as string)

    const result = await clinicalAiService.saveAiTranscription(user.tenantId, dentistId, req.body)
    res.status(201).json({ status: 'success', data: result })
  } catch (error) {
    next(error)
  }
}

export async function linkTranscriptionToEvolutionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { evolutionId } = req.params
    const { transcriptionId } = req.body

    const result = await clinicalAiService.linkTranscriptionToEvolution(
      user.tenantId,
      evolutionId as string,
      transcriptionId
    )
    res.status(200).json({ status: 'success', data: result })
  } catch (error) {
    next(error)
  }
}