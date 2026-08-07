export interface CreateProductDTO {
  name: string
  quantity: number
  minQuantity: number
  supplierId?: string
  lotNumber?: string          // 📦 Lote do produto
  manufacturingDate?: string  // 🏭 Data de Fabricação
  expiryDate?: string         // ⏳ Data de Validade
  notes?: string              // 📝 Observações / Instruções
}

export interface UpdateProductDTO {
  name?: string
  quantity?: number
  minQuantity?: number
  supplierId?: string
  lotNumber?: string
  manufacturingDate?: string
  expiryDate?: string
  notes?: string
}

export interface AdjustStockDTO {
  quantity: number
  reason: string
}

export interface FilterProductDTO {
  name?: string
  supplierId?: string
  lotNumber?: string          // 🔍 Busca por número de lote
  lowStock?: boolean
  expiring?: boolean
  page?: number
  limit?: number
}