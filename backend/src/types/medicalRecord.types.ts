export interface MedicalRecord {
  id: string
  tenantId?: string
  clinicId?: string
  patientId: string
  
  // Compatibilidade Swagger + Schema legado
  mainComplaint?: string
  chiefComplaint?: string
  
  historyNotes?: string
  allergies?: string
  
  // Compatibilidade Swagger + Schema legado
  medicationsInUse?: string
  medications?: string
  
  bloodType?: string
  habits?: string
  systemicDiseases?: string
  
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface UpdateMedicalRecordsDTO {
  // Suporte a ambas as chaves para evitar 400 no Swagger e erros de build no front
  chiefComplaint?: string
  mainComplaint?: string
  
  historyNotes?: string
  allergies?: string
  
  medications?: string
  medicationsInUse?: string
  
  bloodType?: string
  habits?: string
  systemicDiseases?: string
}

// Alias para padronização de nomenclatura
export type UpdateMedicalRecordDto = UpdateMedicalRecordsDTO

export interface CreateEvolutionDTO {
  description: string
  procedureId?: string // Gatilho do Exit Inteligente (Insumos da Ficha Técnica)
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
  rectificationReason: string // Obrigatória pelo CFO após trava de 24 horas
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
  lockedAt?: Date | string | null
  rectificationReason?: string | null
  isAiGenerated: boolean
  aiTranscriptionId?: string | null

  createdAt: Date | string
  updatedAt: Date | string
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

// =============================================================================
// DTOS: TOKEN SEGURO DE ANAMNESE (36 HORAS)
// =============================================================================

export interface GenerateAnamnesisTokenResponseDTO {
  token: string
  expiresInHours: number
  expiresAt: string
  link?: string
}

export interface PublicAnamnesisQueryDTO {
  token: string
}

export interface PublicAnamnesisResponseDTO {
  patientName: string
  clinicName?: string
  medicalRecord: MedicalRecord | null
}