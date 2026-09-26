
import { CommissionStatus, PaymentMethod } from '@prisma/client'

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
  
  // Auditoria da liquidação / repasse
  paidAt?: Date | string | null
  paymentMethod?: PaymentMethod | null
  paymentNotes?: string | null
  receiptFileUrl?: string | null

  createdAt: Date | string
  updatedAt: Date | string

  dentist?: {
    id?: string
    name: string
    cro?: string | null
  }
  procedure?: {
    id?: string
    name: string
    code?: string | null
  }
  treatmentPlan?: {
    id: string
    title: string
  } | null
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
  page?: number
  limit?: number
}

export interface PayCommissionDTO {
  paymentMethod: PaymentMethod
  paymentDate?: string | Date
  notes?: string
  receiptFileUrl?: string
}

// DTO para liquidação em lote (múltiplas comissões de uma só vez para o dentista)
export interface PayBatchCommissionDTO {
  commissionIds: string[]
  dentistId: string
  paymentMethod: PaymentMethod
  paymentDate?: string | Date
  notes?: string
  receiptFileUrl?: string
}