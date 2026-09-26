

import { TransactionType, PaymentMethod } from '@prisma/client'

export { TransactionType, PaymentMethod }

export interface Transaction {
  id: string
  tenantId: string
  clinicId: string
  appointmentId?: string | null
  treatmentPlanId?: string | null
  supplierId?: string | null
  accountReceivableId?: string | null // Vinculação com o título/parcela liquidada
  amount: number
  type: TransactionType
  paymentMethod: PaymentMethod
  description?: string | null
  category?: string | null
  costCenter?: string | null
  isReconciled: boolean
  paidAt: Date | string
  createdAt: Date | string
  updatedAt: Date | string

  // Relacionamentos carregados opcionalmente via include
  supplier?: {
    id: string
    name: string
    cnpj?: string | null
  } | null
  appointment?: {
    id: string
    patient: {
      id: string
      name: string
    }
  } | null
  treatmentPlan?: {
    id: string
    title: string
  } | null
  accountReceivable?: {
    id: string
    description: string
    installmentNumber: number
    totalInstallments: number
  } | null
}

export interface CreateTransactionDTO {
  type: TransactionType
  amount: number
  paymentMethod: PaymentMethod
  description?: string
  category?: string
  costCenter?: string
  isReconciled?: boolean
  appointmentId?: string
  treatmentPlanId?: string
  supplierId?: string
  accountReceivableId?: string // Permite dar baixa direta em um recebível
  paidAt?: Date | string
}

export interface UpdateTransactionDTO {
  amount?: number
  paymentMethod?: PaymentMethod
  type?: TransactionType
  description?: string
  category?: string
  costCenter?: string | null
  isReconciled?: boolean
  supplierId?: string | null
  accountReceivableId?: string | null
  paidAt?: Date | string
}

export interface TransactionFiltersDTO {
  type?: TransactionType
  paymentMethod?: PaymentMethod
  category?: string
  costCenter?: string
  isReconciled?: boolean
  supplierId?: string
  accountReceivableId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface TransactionReportDTO {
  startDate: string
  endDate: string
  type?: TransactionType
  costCenter?: string
  isReconciled?: boolean
}

export interface ReconcileTransactionDTO {
  isReconciled: boolean
}