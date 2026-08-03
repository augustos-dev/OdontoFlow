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
  odontogramSnapshot?: Record<string, any> | any[] | string
  attachments?: string[] // 🖼️ Array de URLs/caminhos das imagens anexadas
}

export interface ToothConditionDTO {
  toothNumber: number // Notação FDI: 11-18, 21-28, 31-38, 41-48
  condition: string // "CARIE", "IMPLANTE", "ENDODONTIA", "RESTAURADO", "AUSENTE", "SAUDAVEL"
  faces?: string[] // ["MESIAL", "DISTAL", "OCLUSAL", "VESTIBULAR", "LINGUAL", "PALATINA"]
  notes?: string
}