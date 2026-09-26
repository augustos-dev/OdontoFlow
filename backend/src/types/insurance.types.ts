export type InsuranceBatchStatus = 
  | 'DRAFT' 
  | 'GENERATED' 
  | 'SENT' 
  | 'PAID' 
  | 'PARTIAL' 
  | 'REJECTED'

export type InsuranceGuideStatus = 
  | 'AUTHORIZED' 
  | 'PENDING_SUBMISSION' 
  | 'SUBMITTED' 
  | 'PAID' 
  | 'GLOSSED' 
  | 'CONTESTED'

export interface InsuranceGuide {
  id: string
  tenantId: string
  clinicId: string
  insuranceBatchId?: string | null
  patientId: string
  appointmentId?: string | null
  procedureId?: string | null
  guideNumber: string
  authorizationCode?: string | null
  tussCode?: string | null
  claimedAmount: number
  approvedAmount?: number | null
  glossedAmount?: number | null
  status: InsuranceGuideStatus
  glossReason?: string | null
  appealNotes?: string | null
  createdAt: string
  updatedAt: string
}

export interface InsuranceBatch {
  id: string
  tenantId: string
  clinicId: string
  insuranceName: string
  batchNumber: string
  periodStart: string
  periodEnd: string
  totalGuides: number
  totalAmount: number
  paidAmount: number
  glossAmount: number
  status: InsuranceBatchStatus
  submissionDate?: string | null
  expectedPayment?: string | null
  settledAt?: string | null
  xmlFileUrl?: string | null
  notes?: string | null
  guides?: InsuranceGuide[]
  createdAt: string
  updatedAt: string
}

export interface CreateInsuranceBatchDto {
  insuranceName: string
  periodStart: string
  periodEnd: string
  guideIds: string[]
  notes?: string
}

export interface CreateInsuranceGuideDto {
  patientId: string
  appointmentId?: string
  procedureId?: string
  guideNumber: string
  authorizationCode?: string
  tussCode?: string
  claimedAmount: number
}

export interface ReconcileGlossDto {
  approvedAmount: number
  glossedAmount: number
  glossReason?: string
  status: 'PAID' | 'GLOSSED' | 'CONTESTED'
  appealNotes?: string
}