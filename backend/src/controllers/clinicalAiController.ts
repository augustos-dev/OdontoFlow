import type { Request, Response, NextFunction } from 'express'
import * as clinicalAiService from '../services/clinicalAiService'
import { transcribeAndStructureVoice } from '../services/aiTranscriptionService'
import { AppError } from '../shared/AppError'
import { getSessionUser } from '../middlewares/authMiddlewares'

export async function createTranscriptionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const file = req.file

    if (!file) {
      throw new AppError('Nenhum ficheiro de áudio foi enviado.', 400)
    }

    const durationSeconds = Number(req.body.durationSeconds || 60)

    // 1. Processa áudio no Whisper + estrutura com GPT-4o-mini
    const aiResult = await transcribeAndStructureVoice(file.path, durationSeconds)

    // 2. Grava na base de dados no registo de transcrições do tenant
    const saved = await clinicalAiService.saveAiTranscription(user.tenantId, user.userId as string, {
      durationSeconds,
      rawTranscription: aiResult.rawTranscription,
      structuredData: aiResult.structuredData,
      tokensUsed: aiResult.tokensUsed,
      modelName: aiResult.modelName,
    })

    res.status(201).json({
      status: 'success',
      data: saved,
    })
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