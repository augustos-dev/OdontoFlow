// Unidades de medida suportadas no estoque
export type UnitType = 'UN' | 'ML' | 'MG' | 'G' | 'L' | 'CX'

export interface CreateProductDTO {
  name: string
  quantity: number           // Suporta decimais (ex: 0.5 ML)
  minQuantity: number        // Suporta decimais
  unit?: UnitType            // Unidade de medida padrão (default: 'UN')
  costPrice?: number         // Preço de Custo / Compra do pacote ou unidade
  itemsPerPackage?: number   // 🟢 NOVO: Quantidade de unidades por caixa (ex: 100 luvas) ou g/ml totais
  supplierId?: string
  lotNumber?: string         // 📦 Lote do produto
  manufacturingDate?: string // 🏭 Data de Fabricação
  expiryDate?: string        // ⏳ Data de Validade
  notes?: string             // 📝 Observações / Instruções
}

export interface UpdateProductDTO {
  name?: string
  quantity?: number
  minQuantity?: number
  unit?: UnitType
  costPrice?: number
  itemsPerPackage?: number   // 🟢 Rendimento/Conversão de embalagem
  supplierId?: string
  lotNumber?: string
  manufacturingDate?: string
  expiryDate?: string
  notes?: string
}

export interface AdjustStockDTO {
  quantity: number           // Quantidade do ajuste (positiva ou negativa)
  reason: string
}

export interface FilterProductDTO {
  name?: string
  supplierId?: string
  lotNumber?: string         // 🔍 Busca por número de lote
  unit?: UnitType
  lowStock?: boolean
  expiring?: boolean
  page?: number
  limit?: number
}