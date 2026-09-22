export interface UpdateMedicalRecordsDTO {
  chiefComplaint?: string
  historyNotes?: string
  allergies?: string
  medications?: string
  bloodType?: string
  habits?: string
  systemicDiseases?: string
}

export interface CreateEvolutionDTO {
  description: string
  procedureId?: string // 🚀 Gatilho do Exit Inteligente (Insumos da Ficha Técnica)
  odontogramSnapshot?: Record<string, any> | any[] | string
  attachments?: string[] // Array de URLs de exames/radiografias
  isAiGenerated?: boolean
  aiTranscriptionId?: string
  consumedProducts?: Array<{
    productId: string
    quantity: number
  }>
}

export interface RectifyEvolutionDTO {
  description: string
  rectificationReason: string // ⚖️ Obrigatória pelo CFO após trava de 24 horas
}

export interface ToothConditionDTO {
  toothNumber: number // Notação FDI: 11-18, 21-28, 31-38, 41-48
  condition: string   // "CARIE", "IMPLANTE", "ENDODONTIA", "RESTAURADO", "AUSENTE", "SAUDAVEL"
  faces?: string[]   // ["MESIAL", "DISTAL", "OCLUSAL", "VESTIBULAR", "LINGUAL", "PALATINA"]
  notes?: string
}

export interface EvolutionResponseDTO {
  id: string
  tenantId: string
  medicalRecordId: string
  dentistId: string
  procedureId?: string | null
  description: string
  odontogramSnapshot?: any
  attachments: string[]
  
  // Compliance CFO 24h & IA
  isLocked: boolean
  lockedAt?: Date | null
  rectificationReason?: string | null
  isAiGenerated: boolean
  aiTranscriptionId?: string | null

  createdAt: Date
  updatedAt: Date
  procedure?: {
    id: string
    name: string
    basePrice: number
  } | null
  dentist?: {
    id: string
    name: string
    cro?: string | null
  }
}