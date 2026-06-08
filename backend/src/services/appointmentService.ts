import { AppError } from "../shared/AppError";
import { prisma } from "../lib/prisma";
import { $Enums } from '@prisma/client'
import type {
    CreateAppointmentDTO,
    UpdateAppointmentDTO,
    UpdateAppointStatusDTO,
    AppointmentFilterDTO
    
} from '../types/appointment.types'

// Helpers --------------------------

// caucla o fim do agendamento baseado no inicio + duracao da consulta 


 function calcEndTime(dateTime:Date, durationMin: number):Date {
    return new Date(dateTime.getTime() + durationMin * 60 * 1000)
 }

 // verifica se os intervalos de tempo se sobrepoem

 // [start1, end1) overlaps [start2, end2) se start1 < end2 && start2 < end1

 function hasOverlap(
    start1:Date, end1: Date,
    start2: Date, end2: Date
 ): boolean {
    return start1 < end2 && start2 < end1
 }

 // status que bloqueiam a sala dos desntistas para conflito 

const ACTIVE_STATUSES: $Enums.AppointmentStatus[] = [
  'AGENDADO',
  'CONFIRMADO',
  'EM_ATENDIMENTO',
  'ESPERA',
]

async function checkConflicts(
  clinicId: string,
  room: string,
  dentistId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
) {
  const overlapping = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: { in: ACTIVE_STATUSES },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      dateTime: { lt: endTime },
    },
    include: {
      dentist: { select: { name: true } },
      patient: { select: { name: true } },
    },
  })

  for (const appt of overlapping) {
    const apptEnd = calcEndTime(appt.dateTime, appt.durationMin)
    if (!hasOverlap(startTime, endTime, appt.dateTime, apptEnd)) continue

    if (appt.room === room) {
      throw new AppError(
        `Conflito de sala: ${room} já está ocupada das ${appt.dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${apptEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        409
      )
    }

    if (appt.dentistId === dentistId) {
      throw new AppError(
        `Conflito de agenda: Dr(a). ${appt.dentist.name} já possui consulta das ${appt.dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${apptEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        409
      )
    }
  }
}

