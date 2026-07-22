import { prisma } from "../lib/prisma"
import { AppError } from "../shared/AppError"
import { $Enums } from "@prisma/client"
import type {
    UpdateMedicalRecordsDTO,
    CreateEvolutionDTO,
    ToothConditionDTO
} from "../types/medicalRecord.types"

// Números de dente válidos na notação FDI
const VALID_TOOTH_NUMBERS = [
    ...Array.from({ length: 8 }, (_, i) => 11 + i),
    ...Array.from({ length: 8 }, (_, i) => 21 + i),
    ...Array.from({ length: 8 }, (_, i) => 31 + i),
    ...Array.from({ length: 8 }, (_, i) => 41 + i),
]

// Get Medical Record by Patient
export async function getMedicalRecordByPatient(
    tenantId: string,
    clinicId: string,
    patientId: string
) {
    const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId, clinicId, deletedAt: null },
    })
    if (!patient) {
        throw new AppError('Paciente não encontrado', 404)
    }

    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
        include: {
            evolutions: {
                orderBy: { createdAt: 'desc' },
                include: {
                    dentist: { select: { id: true, name: true, cro: true } }
                },
            },
            toothConditions: {
                orderBy: { toothNumber: 'asc' }
            }
        } 
    })
    
    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    return medicalRecord
}

// Update Anamnese
export async function UpdateMedicalRecord(
    tenantId: string,
    clinicId: string,
    patientId: string,
    data: UpdateMedicalRecordsDTO
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
    })

    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }
    if (medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    return prisma.medicalRecord.update({
        where: { id: medicalRecord.id },
        data,
    })
}

// Get Evolutions by Patient (NOVO - Para listar a timeline no frontend)
export async function getEvolutionsByPatient(
    tenantId: string,
    clinicId: string,
    patientId: string
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
    })

    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    if (medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    return prisma.evolution.findMany({
        where: { tenantId, medicalRecordId: medicalRecord.id },
        orderBy: { createdAt: 'desc' },
        include: {
            dentist: { select: { id: true, name: true, cro: true } }
        }
    })
}

// Create Evolution 
export async function CreateEvolution(
    tenantId: string,
    clinicId: string,
    patientId: string,
    dentistId: string,
    data: CreateEvolutionDTO
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
    })

    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }
    if (medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    const dentist = await prisma.user.findFirst({
        where: { id: dentistId, tenantId, clinicId, role: 'DENTIST', isActive: true }
    })

    if (!dentist) {
        throw new AppError('Dentista não encontrado ou inativo', 404)
    }

    return prisma.evolution.create({
        data: {
            tenantId,
            medicalRecordId: medicalRecord.id,
            dentistId,
            description: data.description
        },
        include: {
            dentist: { select: { id: true, name: true, cro: true } }
        },
    })
}

// Lock Evolution (Trava legal / LGPD)
export async function lockEvolution(
    tenantId: string,
    evolutionId: string
) {
    const evolution = await prisma.evolution.findFirst({
        where: { id: evolutionId, tenantId }
    })

    if (!evolution) { 
        throw new AppError('Evolução não encontrada', 404)
    }
    if (evolution.isLocked) {
        throw new AppError('Evolução já está travada', 400)
    }

    return prisma.evolution.update({
        where: { id: evolutionId },
        data: { isLocked: true, lockedAt: new Date() }
    })
}

// Update Evolution (Apenas se não travada)
export async function updateEvolution(
    tenantId: string,
    evolutionId: string,
    description: string
) {
    const evolution = await prisma.evolution.findFirst({
        where: { id: evolutionId, tenantId }
    })

    if (!evolution) { 
        throw new AppError('Evolução não encontrada', 404)
    }
    if (evolution.isLocked) {
        throw new AppError('Evolução travada não pode ser editada', 400)
    }

    return prisma.evolution.update({
        where: { id: evolutionId },
        data: { description }
    })
}

// Upsert Tooth Condition
export async function upsertToothCondition(
    tenantId: string,
    clinicId: string,
    patientId: string,
    data: ToothConditionDTO
) {
    const { toothNumber, condition, faces, notes } = data 

    if (!VALID_TOOTH_NUMBERS.includes(toothNumber)) {
        throw new AppError(
            `Número de dente inválido: ${toothNumber}. Use a notação FDI (11-18, 21-28, 31-38, 41-48).`, 400
        )
    }

    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } }
    })

    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    if (medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    return prisma.toothCondition.upsert({
        where: {
            medicalRecordId_toothNumber: {
                medicalRecordId: medicalRecord.id,
                toothNumber,
            },
        },
        create: {
            tenantId,
            medicalRecordId: medicalRecord.id,
            toothNumber,
            condition,
            faces: faces ?? [],
            notes,
        },
        update: {
            condition,
            faces: faces ?? [],
            notes,
        },
    })
}

// Get Odontogram
export async function getOdontogram(
    tenantId: string,
    clinicId: string,
    patientId: string
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
        include: {
            toothConditions: {
                orderBy: { toothNumber: 'asc' }
            },
        },
    })

    if (!medicalRecord) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    if (medicalRecord.clinicId !== clinicId) {
        throw new AppError('Prontuário não encontrado', 404)
    }

    const conditionMap = new Map(
        medicalRecord.toothConditions.map((tc) => [tc.toothNumber, tc])
    )

    return VALID_TOOTH_NUMBERS.map((toothNumber) => {
        const existing = conditionMap.get(toothNumber)
        return existing ?? {
            toothNumber,
            condition: 'SAUDAVEL',
            faces: [],
            notes: null
        }
    })
}

// Delete Tooth Condition
export async function deleteToothCondition(
    tenantId: string,
    clinicId: string,
    patientId: string,
    toothNumber: number
) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { tenantId_patientId: { tenantId, patientId } },
    })

    if (!medicalRecord) throw new AppError('Prontuário não encontrado.', 404)
    if (medicalRecord.clinicId !== clinicId) throw new AppError('Prontuário não encontrado.', 404)

    const toothCondition = await prisma.toothCondition.findUnique({
        where: {
            medicalRecordId_toothNumber: {
                medicalRecordId: medicalRecord.id,
                toothNumber,
            },
        },
    })

    if (!toothCondition) throw new AppError('Registro do dente não encontrado.', 404)

    await prisma.toothCondition.delete({ where: { id: toothCondition.id } })
}