// =============================================================================
// DTOs (Data Transfer Objects) - Entrada de Dados / Payloads
// =============================================================================

export interface CreateSupplierDTO {
  name: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  contact?: string | null
}

export interface UpdateSupplierDTO {
  name?: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  contact?: string | null
}

// Params para operações que exigem ID na rota (ex: GET /suppliers/:id, PUT /suppliers/:id)
export interface SupplierParamsDTO {
  id: string
}

// Query params para listagem, paginação e filtros
export interface ListSuppliersQueryDTO {
  search?: string
  page?: string
  limit?: string
}

// =============================================================================
// Respostas de API / Objetos de Domínio
// =============================================================================

export interface SupplierResponse {
  id: string
  tenantId: string
  clinicId: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  contact: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface PaginatedSuppliersResponse {
  data: SupplierResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}