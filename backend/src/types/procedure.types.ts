export interface CreateProcedureDTO {
  name: string
  code?: string
  basePrice: number
}

export interface UpdateProcedureDTO {
  name?: string
  code?: string
  basePrice?: number
}

export interface ProcedureFiltersDTO {
  name?: string
  page?: number
  limit?: number
}

// ─── FICHA TÉCNICA DE INSUMOS (PROCEDURE PRODUCTS) ───

// Item individual para vincular um produto a um procedimento
export interface AttachProcedureProductItemDTO {
  productId: string
  quantity: number
}

// Payload enviado ao salvar/substituir a lista de insumos de um procedimento
export interface SetProcedureProductsDTO {
  items: AttachProcedureProductItemDTO[]
}

// Resposta de retorno incluindo os dados do produto enriquecidos
export interface ProcedureProductResponseDTO {
  id: string
  tenantId: string
  procedureId: string
  productId: string
  quantity: number
  product?: {
    id: string
    name: string
    quantity: number
    minQuantity: number
    lotNumber?: string | null
  }
}