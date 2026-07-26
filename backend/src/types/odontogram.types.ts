export interface ToothConditionItemPayload {
  toothNumber: number
  condition: string   // Ex: 'CARIES', 'RESTORATION', 'MISSING', 'ROOT_CANAL', 'IMPLANT'
  faces?: string[]    // Ex: ['O', 'M', 'D', 'V', 'L']
  notes?: string
}

// Mapa de dentes atualizados (Ex: { 16: { toothNumber: 16, condition: 'CARIES', faces: ['O'] } })
export type OdontogramSnapshotPayload = Record<number, ToothConditionItemPayload>

export interface CreateEvolutionDTO {
  medicalRecordId: string
  dentistId: string
  description: string
  odontogramSnapshot?: OdontogramSnapshotPayload
}