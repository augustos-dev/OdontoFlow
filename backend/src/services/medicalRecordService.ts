import {prisma,} from "../lib/prisma"
import { AppError } from "../shared/AppError"
import { $Enums } from "@prisma/client"
import type {
    UpdateMedicalRecordsDTO,
    CreateEvolutionDTO,
    ToothConditionDTO
} from "../types/medicalRecord.types"

// numeros de dente validos na notacao FDI

const VALID_TOOTH_NUMBERS = [
    ...Array.from({length:8},(_,i) => 11 + 1),
    ...Array.from({length:8},(_,i) => 21 + 1),
    ...Array.from({length:8},(_,i) => 31 + 1),
    ...Array.from({length:8},(_,i) => 41 + 1)
]

//  Get by Patient

export async function getMedicalRecordByPatient(
    tenantId:string,
    clinicId:string,
    patientId:string
) {

    //garante que o paciente existe e pertence a clinica 
    const patient = await prisma.patient.findFirst({
        where: {id:patientId,tenantId,clinicId,deletedAt:null},
    })
    if(!patient) {
        throw new AppError('Paciente nao encontrado',404)
    }

    const medicalRecord = await prisma.medicalRecord.findUnique({
        where:{tenantId_patientId :{ tenantId,patientId}},
        include: {
            evolutions: {
                orderBy: {createdAt:'desc'},
                include: {
                    dentist: {select: {id:true,name:true,cro:true}}
                },
            },
            toothConditions :{
                orderBy:{toothNumber:'asc'}
            }
          } 
    })
    
    if(!medicalRecord) {
        throw new AppError('Prontuario nao encontrado',404)
    }

    return medicalRecord

    
}

// update anamnese
export async function UpdateMedicalRecord(
    tenantId:string,
    clinicId:string,
    patientId:string,
    data:UpdateMedicalRecordsDTO
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where:{tenantId_patientId:{tenantId,patientId}},
    })

    if(!medicalRecord) {
        throw new AppError('Prontuario nao encontrado',404)
    }
    if(medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuario nao encontrado',404)
    }

    return prisma.medicalRecord.update({
        where:{id:medicalRecord.id},
        data,
    })
}

// create evolution 
export async function CreateEvolution(
    tenantId:string,
    clinicId:string,
    patientId:string,
    dentistId:string,
    data:CreateEvolutionDTO
) {
     const medicalRecord = await prisma.medicalRecord.findUnique({
        where:{tenantId_patientId:{tenantId,patientId}},
    })

    if(!medicalRecord) {
        throw new AppError('Prontuario nao encontrado',404)
    }
    if(medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuario nao encontrado',404)
    }
    // valida se o denstita pertence a clinica e a franquia 
    
    const dentist = await prisma.user.findFirst({
        where:{id:dentistId,tenantId,clinicId,role: 'DENTIST',isActive:true}
    })

    if(!dentist){
        throw new AppError('Dentista nao encontrado ou inatico',404)
    }

    return prisma.evolution.create({
        data:{
            tenantId,
            medicalRecordId: medicalRecord.id,
            dentistId,
            description:data.description
        },
        include:{
            dentist:{select:{id:true,name:true,cro:true}}
        },
    })
}