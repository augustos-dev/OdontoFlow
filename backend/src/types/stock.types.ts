import { StockMovementType } from '@prisma/client'

// DTO para movimentação manual de estoque (Entrada de reposição ou Saída por ajuste/perda)
export interface CreateStockMovementDTO {
  productId: string
  type: 'ENTRY' | 'EXIT_MANUAL'
  quantity: number
  reason?: string
}

// Filtros para listagem e histórico de movimentações no backend/Express
export interface StockMovementFiltersDTO {
  productId?: string
  type?: StockMovementType
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

// DTO de resposta de movimentação enriquecida
export interface StockMovementResponseDTO {
  id: string
  tenantId: string
  clinicId: string
  productId: string
  userId?: string | null
  type: StockMovementType
  quantity: number
  reason?: string | null
  createdAt: Date
  product?: {
    id: string
    name: string
  }
  user?: {
    id: string
    name: string
  } | null
}