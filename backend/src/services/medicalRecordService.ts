import { prisma } from "../lib/prisma"
import { AppError } from "../shared/AppError"
import type {
  UpdateMedicalRecordsDTO,
  CreateEvolutionDTO,
  ToothConditionDTO
} from "../types/medicalRecord.types"

// Get Evolutions by Patient / Medical Record
export async function getEvolutionsByPatient(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string
) {
  // Busca flexível por ID do prontuário OU por ID do paciente
  const medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      tenantId,
      clinicId,
      OR: [
        { id: patientOrRecordId },
        { patientId: patientOrRecordId }
      ]
    }
  })

  if (!medicalRecord) {
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return prisma.evolution.findMany({
    where: {
      tenantId,
      medicalRecordId: medicalRecord.id,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      dentist: { select: { id: true, name: true, cro: true } },
    },
  })
}

// Números de dentes válidos na notação FDI (11-18, 21-28, 31-38, 41-48)
const VALID_TOOTH_NUMBERS = [
  ...Array.from({ length: 8 }, (_, i) => 11 + i),
  ...Array.from({ length: 8 }, (_, i) => 21 + i),
  ...Array.from({ length: 8 }, (_, i) => 31 + i),
  ...Array.from({ length: 8 }, (_, i) => 41 + i),
]

/**
 * Auxiliar interno para localizar o Prontuário garantindo o isolamento Multi-tenant
 * Aceita tanto o ID do Prontuário (medicalRecordId) quanto o ID do Paciente (patientId)
 */
async function findMedicalRecord(
  tenantId: string,
  clinicId: string,
  recordOrPatientId: string
) {
  const medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      tenantId,
      // Se clinicId puder variar ou for opcional no prontuário, garantimos busca pelo tenant:
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
// GET BY PATIENT / RECORD
// -----------------------------------------------------------------------------
export async function getMedicalRecordByPatient(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string
) {
  // Localiza o prontuário de forma flexível pelo ID do paciente ou do próprio prontuário
  const targetRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const medicalRecord = await prisma.medicalRecord.findUnique({
    where: { id: targetRecord.id },
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
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return medicalRecord
}

// -----------------------------------------------------------------------------
// UPDATE ANAMNESE / PRONTUÁRIO
// -----------------------------------------------------------------------------
export async function UpdateMedicalRecord(
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
// CREATE EVOLUTION (Com Odontograma Snapshot)
// -----------------------------------------------------------------------------
export async function CreateEvolution(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  dentistId: string,
  data: CreateEvolutionDTO
) {
  // 1. Busca o prontuário de forma flexível
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  // 2. Valida se o profissional existe no tenant e está ativo 
  // (Permite DENTIST, ADMIN ou outros perfis com permissão)
  const dentist = await prisma.user.findFirst({
    where: {
      id: dentistId,
      tenantId,
      isActive: true,
      role: {
        in: ['DENTIST', 'ADMIN',] // Flexibiliza as roles permitidas
      }
    }
  })

  if (!dentist) {
    throw new AppError('Dentista/Profissional não encontrado ou inativo.', 404)
  }

  // 3. Cria a evolução salvando a descrição e o snapshot do odontograma
  return prisma.evolution.create({
    data: {
      tenantId,
      medicalRecordId: medicalRecord.id,
      dentistId: dentist.id,
      description: data.description,
      ...(data.odontogramSnapshot && { odontogramSnapshot: data.odontogramSnapshot }),
    },
    include: {
      dentist: { select: { id: true, name: true, cro: true } }
    },
  })
}
// -----------------------------------------------------------------------------
// LOCK EVOLUTION (Trava Legal / LGPD)
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
// UPDATE EVOLUTION (Apenas se não travada)
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
// GET ODONTOGRAM (Visão Completa dos 32 dentes)
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

  const conditionMap = new Map(
    conditions.map((tc) => [tc.toothNumber, tc])
  )

  const fullOdontogram = VALID_TOOTH_NUMBERS.map((toothNumber) => {
    const existing = conditionMap.get(toothNumber)
    return existing ?? {
      toothNumber,
      condition: 'SAUDAVEL',
      faces: [],
      notes: null
    }
  })

  return fullOdontogram
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