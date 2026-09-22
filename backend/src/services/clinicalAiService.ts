import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'

interface SaveAiTranscriptionParams {
  audioUrl?: string
  durationSeconds?: number
  rawTranscription: string
  structuredData?: any
  tokensUsed?: number
  modelName?: string
}

export async function saveAiTranscription(
  tenantId: string,
  dentistId: string,
  data: SaveAiTranscriptionParams
) {
  if (!data.rawTranscription || data.rawTranscription.trim() === '') {
    throw new AppError('O texto da transcrição não pode estar vazio.', 400)
  }

  return prisma.clinicalAiTranscription.create({
    data: {
      tenantId,
      dentistId,
      audioUrl: data.audioUrl,
      durationSeconds: data.durationSeconds,
      rawTranscription: data.rawTranscription,
      structuredData: data.structuredData || {},
      tokensUsed: data.tokensUsed || 0,
      modelName: data.modelName || 'whisper-1 / gpt-4o-mini',
    },
  })
}

export async function linkTranscriptionToEvolution(
  tenantId: string,
  evolutionId: string,
  transcriptionId: string
) {
  const evolution = await prisma.evolution.findFirst({
    where: { id: evolutionId, tenantId },
  })

  if (!evolution) {
    throw new AppError('Evolução clínica não encontrada.', 404)
  }

  if (evolution.isLocked) {
    throw new AppError('Evolução clínica já trancada pela trava regulamentar de 24h do CFO.', 403)
  }

  return prisma.evolution.update({
    where: { id: evolutionId },
    data: {
      isAiGenerated: true,
      aiTranscriptionId: transcriptionId,
    },
  })
}