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
// lock evolution (trava legal/auditoria LGPD)

export async function lockEvolution(
    tenantId:string,
    evolutionId:string
) {
    const evolution = await prisma.evolution.findFirst({
        where:{id:evolutionId,tenantId}
    })

    if(!evolution){ 
        throw new AppError('Evolucao nao encontrada',404)
    }
    if(evolution.isLocked) {
        throw new AppError('Evolucao ja esta travada',400)
    }

    return prisma.evolution.update({
        where:{id:evolutionId},
        data:{isLocked:true, lockedAt: new Date()}
    })

}

// update Evolution (apenas se nao travada) 

export async function updateEvolution(
    tenantId:string,
    evolutionId:string,
    description:string
) {
    const evolution = await prisma.evolution.findFirst({
        where:{id:evolutionId,tenantId}
    })
    if(!evolution){ 
        throw new AppError('Evolucao nao encontrada',404)
    }
    if(evolution.isLocked) {
        throw new AppError('Evolucao travada nao pode ser editada',400)
    }

    return prisma.evolution.update({
        where:{id:evolutionId},
        data:{
            description
        }
    })
    

}

// Upsert- tooth Condition

export async function upsertToothCondition(
    tenantId:string,
    clinicId:string,
    patientId:string,
    data:ToothConditionDTO
) {
    const {toothNumber,condition,faces,notes} = data 

    if(VALID_TOOTH_NUMBERS.includes(toothNumber)) {
        throw new AppError(
         `Numero de dente invalido: ${toothNumber}. Use a notacao FDI (11-18, 21-28, 31-38, 41-48).`,400
        )
    }

    const medicalRecord = await prisma.medicalRecord.findUnique({
        where:{tenantId_patientId: {tenantId,patientId}}
    })

    if(!medicalRecord) {
        throw new AppError('Prontuario nao encontrado',404)
    }

    if(medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuario nao encontrado ',404)
    }

    // upsert : cria se nao existe e atualiza se ja existe registro para esse dente 

    return prisma.toothCondition.upsert({
        where:{
            medicalRecordId_toothNumber: {
                medicalRecordId: medicalRecord.id,
                toothNumber,
            },
        },
        create:{
            tenantId,
            medicalRecordId: medicalRecord.id,
            toothNumber,
            condition,
            faces:faces ?? [],
            notes,
        },
        update: {
            condition,
            faces: faces ?? [],
            notes,
        },
    })

}

// Get Odontogram (visao compleya da boca)

export async function getOdontogram(
    tenantId:string,
    clinicId:string,
    patientId:string
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where:{tenantId_patientId: {tenantId,patientId}},
        include:{
            toothConditions: {
                orderBy: {toothNumber:'asc'}
            },
        },
    })

     if(!medicalRecord) {
        throw new AppError('Prontuario nao encontrado',404)
    }

    if(medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuario nao encontrado ',404)
    }

    // monta o mapa completo dos 32 dentes, preenchendo 'SAUDAVEL' onde nao ha registro

    const conditionMap = new Map(
        medicalRecord.toothConditions.map((tc) => [tc.toothNumber,tc])
    )

    const fullOdontogram = VALID_TOOTH_NUMBERS.map((toothNumber) => {
        const existing = conditionMap.get(toothNumber)
        return existing ?? {
            toothNumber,
            condition:'SAUDAVEL',
            faces:[],
            notes:null
        }
    })

    return fullOdontogram
}

// delete tooth Condition

