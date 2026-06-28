
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