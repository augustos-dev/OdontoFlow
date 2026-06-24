
export interface  UpdateMedicalRecordsDTO{
    chiefComplaint?: string
    historyNotes?: string
    allergies?: string
    medications?: string
    bloodType?:string
    habits?: string
    systemicDiseases?:string

}

export interface CreateEvolutionDTO {
    description:string
}

export interface ToothConditionDTO {
    toothNumber: number // Notação FDI: 11-18, 21-28, 31-38, 41-48
    condition: string // "CARIE", "IMPLANTE", "ENDODONTIA", "RESTAURADO", "AUSENTE", "SAUDAVEL"
    faces?: string[]  // ["MESIAL", "DISTAL", "OCLUSAL", "VESTIBULAR", "LINGUA
    notes?:string
}