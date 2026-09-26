import { PaymentMethod } from './transaction.types'

export type ReceivableStatus = 
  | 'PENDING' 
  | 'PARTIALLY_PAID' 
  | 'PAID' 
  | 'OVERDUE' 
  | 'CANCELED' 
  | 'RENEGOTIATED'

export interface AccountReceivable {
  id: string
  tenantId: string
  clinicId: string
  patientId: string
  treatmentPlanId?: string | null
  description: string
  installmentNumber: number
  totalInstallments: number
  originalAmount: number
  discountAmount: number
  interestAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  paidAt?: string | null
  status: ReceivableStatus
  paymentMethod: PaymentMethod
  barcode?: string | null
  pixQrCode?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  patient?: {
    id: string
    name: string
    cpf?: string | null
    phone?: string
  }
}

export interface CreateReceivableDto {
  patientId: string
  treatmentPlanId?: string
  description: string
  totalInstallments?: number
  originalAmount: number
  dueDate: string
  paymentMethod: PaymentMethod
  notes?: string
}

export interface SettleReceivableDto {
  paidAmount: number
  discountAmount?: number
  interestAmount?: number
  paidAt?: string
  paymentMethod: PaymentMethod
  notes?: string
}

export interface FilterReceivablesDto {
  patientId?: string
  status?: ReceivableStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}