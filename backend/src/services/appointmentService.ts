import { AppError } from "../shared/AppError";
import { prisma } from "../lib/prisma";
import { $Enums } from '@prisma/client'
import type {
    CreateAppointmentDTO,
    UpdateAppointmentDTO,
    UpdateAppointStatusDTO,
    AppointmentFilterDTO
    
} from '../types/appointment.types'
import { connect } from "node:http2";

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

// Create --------------

export async function CreateAppointment(tenantId:string, clinicId:string,data:CreateAppointmentDTO) {
    const {patientId, dentistId, dateTime , durationMin = 60,type, room , notes} = data

    // valida se paciente pertece ao tenant e a clinica 

    const patient = await prisma.patient.findFirst({
        where:{id: patientId, tenantId,clinicId, deletedAt:null}
    })
    
    if (!patient){
        throw new AppError('Paciente nao encontrado.', 404)
    }

        // valida se  o dentista pertence ao tenant e a clinca 

        const dentist = await prisma.user.findFirst({
            where:{id: dentistId,tenantId,clinicId,role:'DENTIST', isActive: true}
        })
        if(!dentist){
            throw new AppError('Dentista nao encontardo ou inativo', 404)

        }
        const startTime = new Date(dateTime)
        const endTime = calcEndTime(startTime,durationMin)

        // valida se horairo nao e no passado 

        if (startTime < new Date()){
            throw new AppError('Nao e possivel agendar em uma data/hora passada', 400)
        }

        // verifica conflitos de sala e dentista 
        
        await checkConflicts(clinicId,room,dentistId,startTime,endTime)
        

        const appointment = await prisma.appointment.create({
            data: {
            tenantId,
            clinicId,
            patientId,
            dentistId,
            dateTime: startTime,
            durationMin,
            type,
            room,
            notes,
            },
            include: {
            patient: { select: { id: true, name: true, phone: true } },
            dentist: { select: { id: true, name: true } },
            },
        })
        
        return appointment        
}

// list appointment -------------

export async  function listAppointments(tenantId:string,clinicId:string,filters: AppointmentFilterDTO){

    const {date,dentistId,patientId,status,room,page = 1, limit = 20 } = filters

    const skip = (page - 1) * limit

    // se filtrar por dia , monta o intervalo dia inteiro
    let dateFiter = {}
    if(date) {
        const start = new Date(`${date}T00:00:00.000Z`)
        const end = new Date(`${date}T23:59:59.999Z`)
        dateFiter = {dateTime: {gte:start, lte:end}}

    }

    const where = {
        tenantId,
        clinicId,
        ...dateFiter,
        ...(dentistId && { dentistId }),
        ...(patientId && { patientId}),
        ...(status && { status: status as $Enums.AppointmentStatus }),
        ...(room && { room: room as $Enums.Room }),
    }
    
    const [appointments,total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            skip,
            take:limit,
            orderBy: {dateTime:'asc'},
            include: {
                patient: {select: {id: true, name:true, phone: true}},
                dentist: {select: {id:true, name:true}}
            }
        }),
        prisma.appointment.count({where}),
    ])

    return {
        DataView: appointments,
        meta: {
            total,
            page,
            limit,
            totaPages : Math.ceil(total / limit)
        }
    }
}
// ─── Get by ID ────────────────────────────────────────────────────────────────
 
export async function getAppointmentById(
  tenantId: string,
  clinicId: string,
  appointmentId: string
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true, email: true } },
      dentist: { select: { id: true, name: true, cro: true } },
      transaction: true,
    },
  })
 
  if (!appointment) throw new AppError('Agendamento não encontrado.', 404)
 
  return appointment
}

// update ---------

export async function updateAppointment(tenantId:string,clinicId:string,appointmentId:string,data:UpdateAppointmentDTO ) {
    const appointment = await prisma.appointment.findFirst({
        where: {id:appointmentId, tenantId, clinicId},
    })

    if(!appointment){
        throw new AppError('Agendamento nao encontrado.',404)
    }
    // agendamento finalizados ou cancelados nao poder ser editados 

    if (['FINALIZADO', 'CANCELADO','FALTOU'].includes(appointment.status)){
        throw new AppError('Agendamentos finalizados ou cancelados nao podem ser alterados', 400)
    }

    const newDateTime = data.dateTime ? new Date(data.dateTime) : appointment.dateTime
    const newDuration = data.durationMin ?? appointment.durationMin
    const newRoom = data.room ?? appointment.room
    const newDentistId = data.dentinstId ?? appointment.dentistId
    const endTime = calcEndTime(newDateTime,newDuration)

    if ( data.dateTime && newDateTime < new Date()){
        throw new AppError('Nao e possive agendar em uma data/hora passada ', 400)
    }

    // verifica conflitos excluindo o proprio agendamento

    await checkConflicts(clinicId,newRoom,newDentistId,newDateTime,endTime,appointmentId)

    const updated = await prisma.appointment.update({
        where:{id: appointmentId},
        data: {
            ...data,
            dateTime:newDateTime,
        },
        include: {
            patient: {select: { id:true, name: true, phone:true}},
            dentist: {select: {id:true, name: true}}
        }
    })

    return updated
}

/// uptade status 

export async function uptadeAppointmentStatus(tenantId:string, clinicId:string, appointmentId:string, data: UpdateAppointStatusDTO){
    const appointment = await prisma.appointment.findFirst({
        where:{id: appointmentId, tenantId,clinicId},
    })

    if(!appointment){
        throw new AppError('agendamento nao encontrado', 404)
    }

    //agendamentos ja finalizados nao mudam mais de status 

    if(appointment.status === 'FINALIZADO'){
        throw new AppError('Agendamento ja finalizado', 400)
    }

    const updated = await prisma.appointment.update({
        where: {id:appointmentId},
        data: {
            status: data.status,
            ...(data.status === 'CANCELADO' && {
                cancelledAt: new Date(),
                cancellationReason: data.cancellationReason,

            }),
        },
    })

    return updated
}

/// delete ===========================

export async function deleteAppointment(tenantId:string,clinicId:string,appointmentId:string){
    const appointment = await prisma.appointment.findFirst({
        where: {id:appointmentId,tenantId,clinicId},
    })
    if(!appointment){
        throw new AppError('agendamento nao encontrado', 404)
    }

    if(['FINALIZADO', 'EM_ATENDIMENTO'].includes(appointment.status)){
         throw new AppError('Não é possível deletar um agendamento em andamento ou finalizado.', 400)
    }

    await prisma.appointment.delete({where:{id:appointmentId}})
}