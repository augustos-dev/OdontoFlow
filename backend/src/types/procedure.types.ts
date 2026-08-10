import { UnitType } from './products.types'

export interface CreateProcedureDTO {
  name: string
  code?: string
  basePrice: number          // Preço de Venda Comercial
  durationMin?: number       // Duração estimada na Agenda em minutos (default: 30)
  category?: string          // Categoria / Especialidade (ex: "Dentística / Estética")
}

export interface UpdateProcedureDTO {
  name?: string
  code?: string
  basePrice?: number
  durationMin?: number
  category?: string
}

export interface ProcedureFiltersDTO {
  name?: string
  category?: string
  page?: number
  limit?: number
}

// ─── FICHA TÉCNICA DE INSUMOS (EXIT INTELIGENTE) ───

// Item individual para vincular um insumo do estoque a um procedimento
export interface AttachProcedureProductItemDTO {
  productId: string
  quantity: number           // Quantidade gasta (aceita decimais ex: 0.5, 1.8)
  unit?: UnitType            // Unidade gasta no atendimento (ex: 'ML', 'G', 'UN')
}

// Payload enviado ao salvar a Ficha Técnica
export interface SetProcedureProductsDTO {
  items?: AttachProcedureProductItemDTO[]
  products?: AttachProcedureProductItemDTO[] // Chave alternativa por compatibilidade
}

// Resposta de retorno com o produto enriquecido (incluindo o itemsPerPackage)
export interface ProcedureProductResponseDTO {
  id: string
  tenantId: string
  procedureId: string
  productId: string
  quantity: number           // Quantidade gasta na ficha
  unit: UnitType             // Unidade usada na ficha
  product?: {
    id: string
    name: string
    quantity: number         // Saldo atual em estoque
    minQuantity: number
    unit?: UnitType          // Unidade padrão do produto
    costPrice?: number | null// Custo unitário para cálculo da Margem Bruta
    itemsPerPackage?: number | null // 🟢 Unidades por caixa para cálculo de fracionamento
    lotNumber?: string | null
  }
}