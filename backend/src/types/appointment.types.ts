
export interface CreateAppointmentDTO{
    patientId: string,
    dentistId: string,
    dateTime:string,
    durationMin?:number,
    type: 'PARTICULAR' | 'CONVENIO'
    room: 'SALA_1' | 'SALA_2' | 'SALA_3' | 'SALA_4'
    notes?:string
}

export interface UpdateAppointmentDTO {
    patientId?: string,
    dentistId?: string,
    dateTime?:string,
    durationMin?:number,
    type?: 'PARTICULAR' | 'CONVENIO'
    room?: 'SALA_1' | 'SALA_2' | 'SALA_3' | 'SALA_4'
    notes?:string
}
export interface UpdateAppointmentStatusDTO {
    status: 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'CANCELADO' | 'FALTOU' | 'ESPERA'

    cancellationReason?: string
}

export interface AppointmentFiltersDTO {
    date?:string,
    dentistId?:string,
    patientId?:string,
    status?:string,
    room?:string,
    page?:number,
    limit?:number
}