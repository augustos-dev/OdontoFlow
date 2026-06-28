// backend/src/types/clinic.types.ts

export interface CreateClinicDTO {
  name: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
}

export interface UpdateClinicDTO {
  name?: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
}

export interface ClinicFiltersDTO {
  name?: string
  isActive?: boolean
  page?: number
  limit?: number
}