import { Prisma } from "@prisma/client";
import { AppError } from "../shared/AppError";  
import type { CreatePatientDTO,UpdatePatientDTO,PatientFiltersDTO } from "../types/patient.types";
import { prisma } from "../lib/prisma";


/// CREATE DO PACIENTE 

export async function createPatient(clinicId:string,data:CreatePatientDTO) {

    if(data.cpf){
        const existing = await prisma.patient.findFirst({
            where: {clinicId, cpf: data.cpf ,deletedAt: null},
        })

        if(existing){
            throw new AppError('CPF ja cadastrado nesta clinica', 409)
        }

        const patient = await prisma.patient.create({
            data:{
                clinicId,
                ...data,
                birthDate:data.birthDate ? new Date(data.birthDate) : undefined
            },

        })

        return patient
    }

}

// LISTAGEM DE PACIENTES

export async function listPatients(clinicId: string , filters: PatientFiltersDTO){
    
    const {name , cpf, page = 1 , limit = 20} = filters
    const skip = (page - 1) * limit

    const where = {
        clinicId,
        deletedAt: null,
        ...(name && {name : {contains:name, mode : 'insensitive' as const} }),
        ...(cpf && {cpf: {contains: cpf} }),
    }

    const [patients,total] = await Promise.all([
        prisma.patient.findMany({
            where,
            skip,
            take: limit,
            orderBy : {name:'asc'},
            select: {
                id: true,
                name: true,
                phone:true,
                email:true,
                cpf:true,
                birthDate:true,
                gender:true,
                insuranceName:true,
                createdAt:true
            },
        }),
        prisma.patient.count({where})
    ])

    return {
        data:patients,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    }
}