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
  procedureId?: string // 🚀 Gatilho do Exit Inteligente (Insumos do procedimento realizado)
  odontogramSnapshot?: Record<string, any> | any[] | string
  attachments?: string[] // 🖼️ Array de URLs/caminhos das imagens anexadas
}

export interface ToothConditionDTO {
  toothNumber: number // Notação FDI: 11-18, 21-28, 31-38, 41-48
  condition: string // "CARIE", "IMPLANTE", "ENDODONTIA", "RESTAURADO", "AUSENTE", "SAUDAVEL"
  faces?: string[] // ["MESIAL", "DISTAL", "OCLUSAL", "VESTIBULAR", "LINGUAL", "PALATINA"]
  notes?: string
}

// Resposta de retorno da Evolução enriquecida com o procedimento realizado
export interface EvolutionResponseDTO {
  id: string
  tenantId: string
  medicalRecordId: string
  dentistId: string
  procedureId?: string | null
  description: string
  odontogramSnapshot?: any
  attachments: string[]
  isLocked: boolean
  lockedAt?: Date | null
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