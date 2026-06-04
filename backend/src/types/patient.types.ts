
export interface CreatePatientDTO {
    name: string
    phone: string
    email?:string
    cpf?:string
    birthDate?:string
    gender?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'
    address?:string
    historyNotes?:string
    allergies?:string
    medications?:string
    bloodType?:string
    insuaranceName?:string
    insuaranceNumber?:string
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

export interface PatientFiltersDTO {
    name?:string
    cpf?:string
    page?:string
    limit?:string
    
}