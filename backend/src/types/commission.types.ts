import { CommissionStatus } from '@prisma/client'

export interface DentistCommissionDTO {
  id: string
  tenantId: string
  clinicId: string
  dentistId: string
  treatmentPlanId?: string | null
  procedureId?: string | null
  grossAmount: number
  materialsCost: number
  netBaseAmount: number
  percentage: number
  commissionAmount: number
  status: CommissionStatus
  paidAt?: Date | null
  createdAt: Date
  updatedAt: Date
  dentist?: {
    name: string
    cro?: string | null
  }
  procedure?: {
    name: string
    code?: string | null
  }
}

export interface CalculateCommissionDTO {
  dentistId: string
  grossAmount: number
  materialsCost?: number
  percentage?: number
  procedureId?: string
  treatmentPlanId?: string
}

export interface FilterCommissionDTO {
  dentistId?: string
  status?: CommissionStatus
  startDate?: string
  endDate?: string
}