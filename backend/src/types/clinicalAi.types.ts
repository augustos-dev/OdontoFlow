export interface AiStructuredClinicalData {
  chiefComplaint?: string
  anamneseHighlights?: string[]
  proceduresDetected?: string[]
  prescriptionsSuggested?: Array<{
    medication: string
    dosage: string
    instructions: string
  }>
  clinicalConduct?: string
  recommendedMaterials?: string[]
}

export interface ClinicalAiTranscriptionDTO {
  id: string
  tenantId: string
  dentistId: string
  audioUrl?: string | null
  durationSeconds?: number | null
  rawTranscription: string
  structuredData?: AiStructuredClinicalData | null
  tokensUsed?: number | null
  modelName: string
  createdAt: Date
}

export interface ProcessAudioEvolutionDTO {
  audioBase64?: string
  audioUrl?: string
  durationSeconds?: number
  dentistId: string
  medicalRecordId: string
  patientId: string
}