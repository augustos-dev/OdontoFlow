// src/types/patient.types.ts

export interface MedicalRecord {
  id: string
  chiefComplaint: string | null
  historyNotes: string | null
  allergies: string | null
  medications: string | null
  bloodType: string | null
  habits: string | null
  systemicDiseases: string | null
}

export interface TreatmentPlan {
  id: string
  title: string
  status: string
  totalAmount: number
  createdAt: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string
  gender: string
  address?: string
  createdAt: string
  medicalRecord: MedicalRecord | null
  appointments: Array<{
    id: string
    dateTime: string
    status: string
    type: string
    room: string
    notes?: string
    cancellationReason?: string
    dentist: { id: string; name: string; cro?: string }
    patient: { id: string; name: string; phone: string }
  }>
  treatmentPlans: TreatmentPlan[]
}