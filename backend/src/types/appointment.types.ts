import { AppointmentStatus, AppointmentType, Room } from '@prisma/client'

export { AppointmentStatus, AppointmentType, Room }

export interface CreateAppointmentDTO {
  patientId: string
  dentistId: string
  procedureId?: string // Opcional: Para acionar a Ficha Técnica / Exit Inteligente
  dateTime: string | Date
  durationMin?: number
  type?: AppointmentType
  room?: Room
  notes?: string
}

export interface UpdateAppointmentDTO {
  patientId?: string
  dentistId?: string
  procedureId?: string
  dateTime?: string | Date
  durationMin?: number
  type?: AppointmentType
  room?: Room
  notes?: string
}

export interface UpdateAppointmentStatusDTO {
  status: AppointmentStatus
  cancellationReason?: string
  procedureId?: string // Opcional: Confirmação do procedimento ao finalizar na cadeira
}

export interface AppointmentFiltersDTO {
  date?: string
  dentistId?: string
  patientId?: string
  procedureId?: string
  status?: AppointmentStatus | string
  room?: Room | string
  page?: number
  limit?: number
}

export interface AppointmentResponseDTO {
  id: string
  tenantId: string
  clinicId: string
  patientId: string
  dentistId: string
  procedureId?: string | null
  dateTime: Date
  durationMin: number
  status: AppointmentStatus
  type: AppointmentType
  room: Room
  notes?: string | null
  cancellationReason?: string | null
  cancelledAt?: Date | null
  autoStockDeducted: boolean // 🔒 Trava de Idempotência sala/recepção
  createdAt: Date
  updatedAt: Date
  patient?: {
    id: string
    name: string
    phone: string
  }
  dentist?: {
    id: string
    name: string
    cro?: string | null
  }
  procedure?: {
    id: string
    name: string
    basePrice: number
  } | null
}