import { AppointmentStatus, AppointmentType, Room } from '@prisma/client'

export interface CreateAppointmentDTO {
  patientId: string
  dentistId: string
  procedureId?: string // Opcional: Para acionar a Ficha Técnica / Exit Inteligente
  dateTime: string
  durationMin?: number
  type: 'PARTICULAR' | 'CONVENIO'
  room: 'SALA_1' | 'SALA_2' | 'SALA_3' | 'SALA_4'
  notes?: string
}

export interface UpdateAppointmentDTO {
  patientId?: string
  dentistId?: string
  procedureId?: string
  dateTime?: string
  durationMin?: number
  type?: 'PARTICULAR' | 'CONVENIO'
  room?: 'SALA_1' | 'SALA_2' | 'SALA_3' | 'SALA_4'
  notes?: string
}

export interface UpdateAppointmentStatusDTO {
  status: 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO' | 'FALTOU' | 'ESPERA'
  cancellationReason?: string
  procedureId?: string // Opcional: Permite selecionar ou confirmar o procedimento na hora de FINALIZAR
}

export interface AppointmentFiltersDTO {
  date?: string
  dentistId?: string
  patientId?: string
  procedureId?: string
  status?: string
  room?: string
  page?: number
  limit?: number
}