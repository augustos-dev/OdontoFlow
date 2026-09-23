import OpenAI from 'openai'
import fs from 'fs'
import { AppError } from '../shared/AppError'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Schema de retorno que a IA deve preencher
export interface StructuredClinicalData {
  summary: string
  chiefComplaint?: string
  diagnoses: string[]
  conduct: string
  prescriptions?: Array<{ medication: string; dosage: string; frequency: string }>
  nextStep?: string
  consumedMaterialsEstimate?: Array<{ name: string; quantity: number }>
}

export async function transcribeAndStructureVoice(filePath: string, durationSeconds: number) {
  // 🔒 Trava de Custo: Máximo de 120 segundos por áudio no mocho
  if (durationSeconds > 120) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    throw new AppError('O áudio gravado excede o limite máximo permitido de 2 minutos.', 400)
  }

  try {
    // 1. Transcrição com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'pt',
      prompt: 'Termos odontológicos: mesial, oclusal, distal, vestibular, resina composta, curetagem, endodontia, conduto, anestésico lidocaína, dente 16, dente 36.',
    })

    const rawText = transcription.text.trim()
    if (!rawText) {
      throw new AppError('Não foi possível identificar voz no áudio gravado.', 400)
    }

    // 2. Estruturação com GPT-4o-mini (barato e rápido)
    const promptSystem = `Você é o copiloto clínico do OdontoFlow. Analise a transcrição de voz gravada pelo cirurgião-dentista e devolva ESTRITAMENTE um JSON com este formato:
{
  "summary": "Resumo clínico formal e objetivo",
  "chiefComplaint": "Queixa principal do paciente ou null",
  "diagnoses": ["Diagnóstico 1", "Diagnóstico 2"],
  "conduct": "Procedimento realizado com detalhes técnicos (faces do dente, anestésico usado)",
  "prescriptions": [{"medication": "Nome", "dosage": "Dose", "frequency": "Posologia"}],
  "nextStep": "Próxima conduta / retorno agendado",
  "consumedMaterialsEstimate": [{"name": "Material citado", "quantity": 1}]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: promptSystem },
        { role: 'user', content: rawText },
      ],
      temperature: 0.2,
    })

    const structured = JSON.parse(completion.choices[0].message.content ?? '{}')

    return {
      rawTranscription: rawText,
      structuredData: structured as StructuredClinicalData,
      tokensUsed: completion.usage?.total_tokens ?? 0,
      modelName: 'whisper-1 / gpt-4o-mini',
    }
  } finally {
    // Remove o arquivo temporário gravado no disco
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}