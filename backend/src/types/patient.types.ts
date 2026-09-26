// backend/src/types/patient.types.ts

import { Gender } from '@prisma/client'
import { MedicalRecord } from './medicalRecord.types'

export { Gender }

// =============================================================================
// ENTIDADE COMPLETA (RETORNO DO BANCO)
// =============================================================================

export interface Patient {
  id: string
  tenantId: string
  clinicId: string
  name: string
  phone: string
  email?: string | null
  cpf?: string | null
  birthDate?: Date | string | null
  gender: Gender
  address?: string | null
  zipCode?: string | null
  city?: string | null
  state?: string | null

  // 👨‍👩‍👦 Responsável Legal (Pacientes Menores)
  guardianName?: string | null
  guardianCpf?: string | null
  guardianBirthDate?: Date | string | null

  // 💳 Dados do Convênio
  insuranceName?: string | null
  insuranceCardNumber?: string | null
  insuranceHolderName?: string | null
  insuranceHolderCpf?: string | null

  deletedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string

  // Relacionamentos opcionais (carregados via include)
  medicalRecord?: MedicalRecord | null
  appointments?: any[]
  treatmentPlans?: any[]
  medicalFiles?: any[]
  receivables?: any[]
  insuranceGuides?: any[]
}

// =============================================================================
// DTOs DE CRIAÇÃO E ATUALIZAÇÃO
// =============================================================================

export interface CreatePatientDTO {
  // 👤 Dados Pessoais
  name: string
  phone: string
  email?: string
  cpf?: string
  birthDate?: string | Date
  gender?: Gender

  // 📍 Endereço Detalhado
  address?: string
  zipCode?: string
  city?: string
  state?: string

  // 👨‍👩‍👦 Responsável Legal (Pacientes Menores)
  guardianName?: string
  guardianCpf?: string
  guardianBirthDate?: string | Date

  // 💳 Dados do Convênio
  insuranceName?: string
  insuranceCardNumber?: string
  insuranceHolderName?: string
  insuranceHolderCpf?: string

  // 🩺 Dados Iniciais de Anamnese / Saúde (Suporte Híbrido Swagger + Schema)
  mainComplaint?: string
  chiefComplaint?: string
  historyNotes?: string
  allergies?: string
  medicationsInUse?: string
  medications?: string
  bloodType?: string
  habits?: string
  systemicDiseases?: string
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

// =============================================================================
// DTOs DE FILTRO E PAGINAÇÃO
// =============================================================================

export interface PatientFiltersDTO {
  name?: string
  cpf?: string
  phone?: string
  insuranceName?: string // Facilita filtrar pacientes por operadora/convênio
  page?: number
  limit?: number
}

// =============================================================================
// DTOs: TOKEN SEGURO DE ANAMNESE (VALIDADE DE 36 HORAS)
// =============================================================================

export interface PatientAnamnesisTokenDTO {
  id: string
  tenantId: string
  clinicId: string
  patientId: string
  createdById?: string | null
  tokenHash: string
  expiresAt: Date | string
  usedAt?: Date | string | null
  isRevoked: boolean
  signerIp?: string | null
  signerUserAgent?: string | null
  acceptedTerms: boolean
  createdAt: Date | string
}

export interface GeneratePatientAnamnesisTokenResponseDTO {
  token: string
  expiresInHours: number
  expiresAt: Date | string
  link?: string
}