// src/types/appointment.types.ts

export interface Appointment {
  id: string
  dateTime: string
  status: string
  type: string
  room: string
  notes?: string
  cancellationReason?: string
  transaction?: null | Record<string, unknown>
  dentist: {
    id: string
    name: string
    cro?: string
  }
  patient: {
    id: string
    name: string
    phone: string
  }
}