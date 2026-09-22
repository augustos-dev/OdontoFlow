import { Room } from '@prisma/client'

export interface WorkScheduleDay {
  start: string // ex: "08:00"
  end: string   // ex: "18:00"
  lunchStart?: string // ex: "12:00"
  lunchEnd?: string   // ex: "13:00"
}

export type WorkScheduleMap = Record<string, WorkScheduleDay> // "seg", "ter", "qua", etc.

export interface DentistProfileDTO {
  id: string
  tenantId: string
  clinicId: string
  userId: string
  specialties: string[]
  bio?: string | null
  defaultRoom: Room
  signatureImageUrl?: string | null
  croState?: string | null
  rqe?: string | null
  slotDurationMin: number
  workSchedule?: WorkScheduleMap | null
  aiVoiceShortcut: boolean
  quickNotes?: Record<string, string> | null
  createdAt: Date
  updatedAt: Date
}

export interface UpdateDentistProfileDTO {
  specialties?: string[]
  bio?: string
  defaultRoom?: Room
  signatureImageUrl?: string
  croState?: string
  rqe?: string
  slotDurationMin?: number
  workSchedule?: WorkScheduleMap
  aiVoiceShortcut?: boolean
  quickNotes?: Record<string, string>
}