import { ContractStatus, PreRegStatus } from '@prisma/client'

export interface ClinicalContractDTO {
  id: string
  tenantId: string
  clinicId: string
  patientId: string
  title: string
  contentHtml: string
  status: ContractStatus
  signatureUrl?: string | null
  signedAt?: Date | null
  signerIp?: string | null
  createdAt: Date
  updatedAt: Date
  patient?: {
    name: string
    cpf?: string | null
  }
}

export interface PublicPreRegistrationDTO {
  id: string
  tenantId: string
  clinicId: string
  patientId?: string | null
  token: string
  patientName: string
  phone: string
  formData?: Record<string, any> | null
  status: PreRegStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreatePreRegistrationLinkDTO {
  patientName: string
  phone: string
  patientId?: string
  expiresInDays?: number
}