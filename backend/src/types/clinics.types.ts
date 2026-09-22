import { TenantPlan, BillingCycle, SubscriptionStatus } from '@prisma/client'

export { TenantPlan, BillingCycle, SubscriptionStatus }

// =============================================================================
// SUB-TYPES & WHITE-LABEL (CUSTOMIZATION)
// =============================================================================

export type AllowedFontFamily = 'Inter' | 'Roboto' | 'Poppins' | 'Montserrat'

export interface ClinicCustomization {
  id: string
  clinicId: string
  clinicName?: string | null
  primaryColor: string
  accentColor: string
  secondaryColor?: string | null
  fontFamily: AllowedFontFamily | string
  darkModeDefault: boolean
  customLogoUrl?: string | null
  customFavicon?: string | null
  customDocumentHeader?: string | null
  customReceiptFooter?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface UpdateClinicCustomizationDTO {
  clinicName?: string
  primaryColor?: string
  accentColor?: string
  secondaryColor?: string
  fontFamily?: AllowedFontFamily | string
  darkModeDefault?: boolean
  customLogoUrl?: string | null
  customFavicon?: string | null
  customDocumentHeader?: string | null
  customReceiptFooter?: string | null
}

// =============================================================================
// TENANT ENTITY & DTOs
// =============================================================================

export interface TenantDTO {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  billingCycle: BillingCycle
  status: SubscriptionStatus
  trialEndsAt?: Date | null
  isBetaPartner: boolean
  databaseUrl?: string | null
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

// =============================================================================
// CLINIC ENTITY & DTOs
// =============================================================================

export interface Clinic {
  id: string
  tenantId: string
  name: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  logoUrl?: string | null
  paymentIntegrationActive: boolean
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  customization?: ClinicCustomization | null
}

export interface CreateClinicDTO {
  name: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
  paymentIntegrationActive?: boolean
}

export interface UpdateClinicDTO {
  name?: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
  paymentIntegrationActive?: boolean
  isActive?: boolean
}

export interface ClinicFiltersDTO {
  name?: string
  isActive?: boolean
  page?: number
  limit?: number
}