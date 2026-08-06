import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type {
  UpdateMedicalRecordsDTO,
  CreateEvolutionDTO,
  ToothConditionDTO
} from '../types/medicalRecord.types'

// Notação FDI válida (11-18, 21-28, 31-38, 41-48)
const VALID_TOOTH_NUMBERS = [
  ...Array.from({ length: 8 }, (_, i) => 11 + i),
  ...Array.from({ length: 8 }, (_, i) => 21 + i),
  ...Array.from({ length: 8 }, (_, i) => 31 + i),
  ...Array.from({ length: 8 }, (_, i) => 41 + i),
]

/**
 * Auxiliar interno para localizar o Prontuário garantindo o isolamento Multi-tenant.
 */
export async function findMedicalRecord(
  tenantId: string,
  clinicId: string,
  recordOrPatientId: string
) {
  const medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      tenantId,
      OR: [
        { id: recordOrPatientId },
        { patientId: recordOrPatientId }
      ]
    }
  })

  if (!medicalRecord) {
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return medicalRecord
}

// -----------------------------------------------------------------------------
// GET MEDICAL RECORD BY PATIENT OR RECORD ID
// -----------------------------------------------------------------------------
export async function getMedicalRecordByPatient(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string
) {
  const targetRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const medicalRecord = await prisma.medicalRecord.findUnique({
    where: { id: targetRecord.id },
    include: {
      evolutions: {
        orderBy: { createdAt: 'desc' },
        include: {
          dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } }
        },
      },
      toothConditions: {
        orderBy: { toothNumber: 'asc' }
      }
    }
  })

  if (!medicalRecord) {
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return medicalRecord
}

// -----------------------------------------------------------------------------
// GET EVOLUTIONS
// -----------------------------------------------------------------------------
export async function getEvolutionsByPatient(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  return prisma.evolution.findMany({
    where: {
      tenantId,
      medicalRecordId: medicalRecord.id,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
    },
  })
}

export const getEvolutions = getEvolutionsByPatient

// -----------------------------------------------------------------------------
// UPDATE ANAMNESE / PRONTUÁRIO
// -----------------------------------------------------------------------------
export async function updateMedicalRecord(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  data: UpdateMedicalRecordsDTO
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  return prisma.medicalRecord.update({
    where: { id: medicalRecord.id },
    data,
  })
}

// -----------------------------------------------------------------------------
// CREATE EVOLUTION (Com Odontograma Snapshot + Anexos/Fotos Otimizados)
// -----------------------------------------------------------------------------
export async function CreateEvolution(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  dentistId: string,
  data: CreateEvolutionDTO
) {
  // 1. Localiza o prontuário
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  // 2. Valida o profissional no Tenant
  const dentist = await prisma.user.findFirst({
    where: {
      id: dentistId,
      tenantId,
      isActive: true,
      role: {
        in: ['DENTIST', 'ADMIN']
      }
    }
  })

  if (!dentist) {
    throw new AppError('Dentista/Profissional não encontrado ou inativo.', 404)
  }

  // 3. Normalização do odontogramSnapshot
  let parsedSnapshot: Record<string, any> | null = null
  if (data.odontogramSnapshot) {
    if (typeof data.odontogramSnapshot === 'string') {
      try {
        parsedSnapshot = JSON.parse(data.odontogramSnapshot)
      } catch {
        parsedSnapshot = null
      }
    } else {
      parsedSnapshot = data.odontogramSnapshot
    }
  }

  // 4. Transação ACID
  return prisma.$transaction(async (tx) => {
    const evolution = await tx.evolution.create({
      data: {
        tenantId,
        medicalRecordId: medicalRecord.id,
        dentistId: dentist.id,
        description: data.description,
        odontogramSnapshot: parsedSnapshot ?? undefined,
        attachments: data.attachments || [],
      },
      include: {
        dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } }
      },
    })

    // Sincroniza estado vivo no Odontograma
    if (parsedSnapshot && typeof parsedSnapshot === 'object') {
      const toothEntries = Object.entries(parsedSnapshot)

      for (const [toothStr, toothData] of toothEntries) {
        const item = toothData as any
        const toothNumber = parseInt(toothStr, 10)

        if (isNaN(toothNumber) || !item) continue

        const faces = item.faces 
          ? (Array.isArray(item.faces) ? item.faces : Object.keys(item.faces)) 
          : []
          
        const condition = item.condition || (item.faces ? Object.values(item.faces)[0] : 'HIGIENE_OK')

        await tx.toothCondition.upsert({
          where: {
            medicalRecordId_toothNumber: {
              medicalRecordId: medicalRecord.id,
              toothNumber,
            },
          },
          update: {
            condition: String(condition),
            faces,
            notes: item.notes || null,
            updatedAt: new Date(),
          },
          create: {
            tenantId,
            medicalRecordId: medicalRecord.id,
            toothNumber,
            condition: String(condition),
            faces,
            notes: item.notes || null,
          },
        })
      }
    }

    return evolution
  })
}

// -----------------------------------------------------------------------------
// LOCK EVOLUTION
// -----------------------------------------------------------------------------
export async function lockEvolution(
  tenantId: string,
  evolutionId: string
) {
  const evolution = await prisma.evolution.findFirst({
    where: { id: evolutionId, tenantId }
  })

  if (!evolution) {
    throw new AppError('Evolução não encontrada.', 404)
  }
  if (evolution.isLocked) {
    throw new AppError('Evolução já está travada.', 400)
  }

  return prisma.evolution.update({
    where: { id: evolutionId },
    data: { isLocked: true, lockedAt: new Date() }
  })
}

// -----------------------------------------------------------------------------
// UPDATE EVOLUTION
// -----------------------------------------------------------------------------
export async function updateEvolution(
  tenantId: string,
  evolutionId: string,
  description: string
) {
  const evolution = await prisma.evolution.findFirst({
    where: { id: evolutionId, tenantId }
  })

  if (!evolution) {
    throw new AppError('Evolução não encontrada.', 404)
  }
  if (evolution.isLocked) {
    throw new AppError('Evolução travada não pode ser editada.', 400)
  }

  return prisma.evolution.update({
    where: { id: evolutionId },
    data: { description }
  })
}

// -----------------------------------------------------------------------------
// UPSERT TOOTH CONDITION
// -----------------------------------------------------------------------------
export async function upsertToothCondition(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  data: ToothConditionDTO
) {
  const { toothNumber, condition, faces, notes } = data

  if (!VALID_TOOTH_NUMBERS.includes(toothNumber)) {
    throw new AppError(
      `Número de dente inválido: ${toothNumber}. Use a notação FDI (11-18, 21-28, 31-38, 41-48).`,
      400
    )
  }

  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

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

// -----------------------------------------------------------------------------
// GET ODONTOGRAM
// -----------------------------------------------------------------------------
export async function getOdontogram(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const fullRecord = await prisma.medicalRecord.findUnique({
    where: { id: medicalRecord.id },
    include: {
      toothConditions: {
        orderBy: { toothNumber: 'asc' }
      },
    },
  })

  const conditions = fullRecord?.toothConditions ?? []
  const conditionMap = new Map(conditions.map((tc) => [tc.toothNumber, tc]))

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

// -----------------------------------------------------------------------------
// DELETE TOOTH CONDITION
// -----------------------------------------------------------------------------
export async function deleteToothCondition(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  toothNumber: number
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const toothCondition = await prisma.toothCondition.findUnique({
    where: {
      medicalRecordId_toothNumber: {
        medicalRecordId: medicalRecord.id,
        toothNumber,
      },
    },
  })

  if (!toothCondition) {
    throw new AppError('Registro do dente não encontrado.', 404)
  }

  await prisma.toothCondition.delete({
    where: { id: toothCondition.id }
  })
}

export class EvolutionService {
  async createEvolution(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string,
    dentistId: string,
    data: CreateEvolutionDTO
  ) {
    return CreateEvolution(tenantId, clinicId, patientOrRecordId, dentistId, data)
  }

  async getEvolutionsByMedicalRecord(tenantId: string, clinicId: string, patientOrRecordId: string) {
    return getEvolutionsByPatient(tenantId, clinicId, patientOrRecordId)
  }

  async getEvolutions(tenantId: string, clinicId: string, patientOrRecordId: string) {
    return getEvolutionsByPatient(tenantId, clinicId, patientOrRecordId)
  }

  async getCurrentOdontogram(tenantId: string, clinicId: string, patientOrRecordId: string) {
    return getOdontogram(tenantId, clinicId, patientOrRecordId)
  }
}