// backend/src/types/transaction.types.ts

export type TransactionType = 'RECEITA' | 'DESPESA'

export type PaymentMethod = 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'CONVENIO'

// =============================================================================
// ENTIDADE (RETORNO DO BANCO)
// =============================================================================

export interface Transaction {
  id: string
  tenantId: string
  clinicId: string
  appointmentId?: string | null
  treatmentPlanId?: string | null
  supplierId?: string | null
  amount: number
  type: TransactionType
  paymentMethod: PaymentMethod
  description?: string | null
  category?: string | null
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
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateTransactionDTO {
  type: TransactionType
  amount: number
  paymentMethod: PaymentMethod
  description?: string
  category?: string
  appointmentId?: string
  treatmentPlanId?: string
  supplierId?: string // 🚀 Campo que resolveu o erro 500 no lançamento de despesa
  paidAt?: Date | string
}

export interface UpdateTransactionDTO {
  amount?: number
  paymentMethod?: PaymentMethod
  type?: TransactionType
  description?: string
  category?: string
  supplierId?: string | null
  paidAt?: Date | string
}

export interface TransactionFiltersDTO {
  type?: TransactionType
  paymentMethod?: PaymentMethod | string
  category?: string
  supplierId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface TransactionReportDTO {
  startDate: string
  endDate: string
  type?: TransactionType
}