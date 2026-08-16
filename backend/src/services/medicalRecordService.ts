import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import { triggerAutoStockExit } from '../utils/stockAutoExit'
import type { UserRole } from '@prisma/client'
import type {
  UpdateMedicalRecordsDTO,
  CreateEvolutionDTO,
  ToothConditionDTO,
} from '../types/medicalRecord.types'

const VALID_TOOTH_NUMBERS = [
  ...Array.from({ length: 8 }, (_, i) => 11 + i),
  ...Array.from({ length: 8 }, (_, i) => 21 + i),
  ...Array.from({ length: 8 }, (_, i) => 31 + i),
  ...Array.from({ length: 8 }, (_, i) => 41 + i),
]

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export async function findMedicalRecord(
  tenantId: string,
  clinicId: string,
  recordOrPatientId: string
) {
  const medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      tenantId,
      OR: [{ id: recordOrPatientId }, { patientId: recordOrPatientId }],
    },
  })

  if (!medicalRecord) {
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return medicalRecord
}

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
          dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
          procedure: { select: { id: true, name: true, basePrice: true } },
        },
      },
      toothConditions: {
        orderBy: { toothNumber: 'asc' },
      },
    },
  })

  if (!medicalRecord) {
    throw new AppError('Prontuário não encontrado.', 404)
  }

  return medicalRecord
}

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
      procedure: { select: { id: true, name: true, basePrice: true } },
    },
  })
}

export const getEvolutions = getEvolutionsByPatient

export async function updateMedicalRecord(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  data: UpdateMedicalRecordsDTO,
  actor: ActorContext
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const updatedRecord = await prisma.medicalRecord.update({
    where: { id: medicalRecord.id },
    data,
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'MEDICAL_RECORD',
    entityId: medicalRecord.id,
    details: `Atualizou anamnese/dados clínicos do prontuário do paciente ID: ${medicalRecord.patientId}`,
  })

  return updatedRecord
}

export async function CreateEvolution(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  dentistId: string,
  data: CreateEvolutionDTO,
  actor?: ActorContext
) {
  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  // 1. Busca profissional/usuário responsável de forma flexível
  let dentist = await prisma.user.findFirst({
    where: {
      id: dentistId,
      tenantId,
      isActive: true,
    },
  })

  // Fallback caso o ID venha de admin global ou sessão administrativa
  if (!dentist) {
    dentist = await prisma.user.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    })
  }

  const responsibleUserId = dentist?.id || dentistId
  const responsibleUserName = dentist?.name || actor?.userName || 'Profissional'
  const responsibleUserRole = (dentist?.role || actor?.userRole || 'DENTIST') as UserRole

  // Validação de procedimento no catálogo (se enviado)
  if (data.procedureId) {
    const procedureExists = await prisma.procedure.findFirst({
      where: { id: data.procedureId, tenantId },
    })
    if (!procedureExists) {
      throw new AppError('Procedimento selecionado não encontrado no catálogo.', 404)
    }
  }

  // 2. Trata snapshot do odontograma
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

  // 3. Normalização de lista de anexos
  let attachmentsList: string[] = []
  if (data.attachments) {
    if (Array.isArray(data.attachments)) {
      attachmentsList = data.attachments
        .map((item: any) => (typeof item === 'string' ? item : item.url || item.path || ''))
        .filter(Boolean)
    } else if (typeof data.attachments === 'string') {
      try {
        const parsed = JSON.parse(data.attachments)
        attachmentsList = Array.isArray(parsed) ? parsed : [data.attachments]
      } catch {
        attachmentsList = [data.attachments]
      }
    }
  }

  // 4. Criação da Evolução e Atualização de Dentes na Transação
  const evolution = await prisma.$transaction(async (tx) => {
    const createdEvolution = await tx.evolution.create({
      data: {
        tenantId,
        clinicId,
        medicalRecordId: medicalRecord.id,
        dentistId: responsibleUserId,
        procedureId: data.procedureId || null,
        description: data.description || 'Evolução registrada',
        attachments: attachmentsList,
        odontogramSnapshot: parsedSnapshot,
      } as any,
      include: {
        dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
        procedure: { select: { id: true, name: true, basePrice: true } },
      },
    })

    // Sincroniza dentes no Odontograma caso haja snapshot
    if (parsedSnapshot && typeof parsedSnapshot === 'object') {
      const toothEntries = Object.entries(parsedSnapshot)

      for (const [toothStr, toothData] of toothEntries) {
        const item = toothData as any
        const toothNumber = parseInt(toothStr, 10)

        if (isNaN(toothNumber) || !item) continue

        const faces = item.faces
          ? Array.isArray(item.faces)
            ? item.faces
            : Object.keys(item.faces)
          : []

        const condition = item.condition || (item.faces ? Object.values(item.faces)[0] : 'SAUDAVEL')

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

    return createdEvolution
  })

  // 5. Gravação em MedicalFile protegida (popula tabela de arquivos do paciente)
  if (attachmentsList.length > 0) {
    try {
      for (const url of attachmentsList) {
        const fileName = url.split('/').pop()?.split('?')[0] || 'Anexo Clínico'
        const isPdf = url.toLowerCase().includes('.pdf')

        await (prisma as any).medicalFile?.create({
          data: {
            tenantId,
            clinicId,
            medicalRecordId: medicalRecord.id,
            patientId: medicalRecord.patientId,
            evolutionId: evolution.id,
            name: fileName,
            fileUrl: url,
            url: url,
            type: isPdf ? 'PDF' : 'IMAGE',
            fileType: isPdf ? 'APPLICATION_PDF' : 'IMAGE_JPEG',
            fileSize: 0,
            uploadedBy: responsibleUserId,
          },
        }).catch((err: any) => console.warn('[MedicalFiles Warning] Campo ignorado:', err?.message))
      }
    } catch (fileErr) {
      console.error('[MedicalFiles Error]:', fileErr)
    }
  }

  // 6. Exit Inteligente (Baixa de estoque automática)
  if (data.procedureId) {
    try {
      await triggerAutoStockExit({
        tenantId,
        clinicId,
        procedureId: data.procedureId,
        userId: responsibleUserId,
        appointmentId: (data as any).appointmentId || undefined,
      })
    } catch (stockErr) {
      console.error('[Exit Inteligente Error]:', stockErr)
    }
  }

  // 7. Registro de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor?.userId || responsibleUserId,
    userName: actor?.userName || responsibleUserName,
    userRole: responsibleUserRole,
    action: 'CREATE',
    entity: 'EVOLUTION',
    entityId: evolution.id,
    details: `Registrou evolução clínica${
      data.procedureId ? ` (Procedimento ID: ${data.procedureId})` : ''
    }. Profissional: Dr(a). ${responsibleUserName}`,
  })

  return evolution
}

export async function lockEvolution(
  tenantId: string,
  clinicId: string,
  evolutionId: string,
  actor: ActorContext
) {
  const evolution = await prisma.evolution.findFirst({
    where: { id: evolutionId, tenantId },
  })

  if (!evolution) {
    throw new AppError('Evolução não encontrada.', 404)
  }
  if (evolution.isLocked) {
    throw new AppError('Evolução já está travada.', 400)
  }

  const updated = await prisma.evolution.update({
    where: { id: evolutionId },
    data: { isLocked: true, lockedAt: new Date() },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'DENTIST',
    action: 'UPDATE',
    entity: 'EVOLUTION',
    entityId: evolutionId,
    details: `Bloqueou/Trancou permanentemente a evolução clínica ID: ${evolutionId}`,
  })

  return updated
}

export async function updateEvolution(
  tenantId: string,
  clinicId: string,
  evolutionId: string,
  description: string,
  actor: ActorContext
) {
  const evolution = await prisma.evolution.findFirst({
    where: { id: evolutionId, tenantId },
  })

  if (!evolution) {
    throw new AppError('Evolução não encontrada.', 404)
  }
  if (evolution.isLocked) {
    throw new AppError('Evolução travada não pode ser editada.', 400)
  }

  const updated = await prisma.evolution.update({
    where: { id: evolutionId },
    data: { description },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'DENTIST',
    action: 'UPDATE',
    entity: 'EVOLUTION',
    entityId: evolutionId,
    details: `Editou a descrição da evolução clínica ID: ${evolutionId}`,
  })

  return updated
}

export async function upsertToothCondition(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  data: ToothConditionDTO,
  actor: ActorContext
) {
  const { toothNumber, condition, faces, notes } = data

  if (!VALID_TOOTH_NUMBERS.includes(toothNumber)) {
    throw new AppError(
      `Número de dente inválido: ${toothNumber}. Use a notação FDI (11-18, 21-28, 31-38, 41-48).`,
      400
    )
  }

  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  const result = await prisma.toothCondition.upsert({
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

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'DENTIST',
    action: 'UPDATE',
    entity: 'ODONTOGRAM',
    entityId: result.id,
    details: `Atualizou dente #${toothNumber} para condição "${condition}"`,
  })

  return result
}

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
        orderBy: { toothNumber: 'asc' },
      },
    },
  })

  const conditions = fullRecord?.toothConditions ?? []
  const conditionMap = new Map(conditions.map((tc) => [tc.toothNumber, tc]))

  return VALID_TOOTH_NUMBERS.map((toothNumber) => {
    const existing = conditionMap.get(toothNumber)
    return (
      existing ?? {
        toothNumber,
        condition: 'SAUDAVEL',
        faces: [],
        notes: null,
      }
    )
  })
}

export async function deleteToothCondition(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  toothNumber: number,
  actor: ActorContext
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
    where: { id: toothCondition.id },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'DENTIST',
    action: 'DELETE',
    entity: 'ODONTOGRAM',
    entityId: toothCondition.id,
    details: `Removeu marcação do dente #${toothNumber}`,
  })
}

export class EvolutionService {
  async createEvolution(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string,
    dentistId: string,
    data: CreateEvolutionDTO,
    actor?: ActorContext
  ) {
    return CreateEvolution(tenantId, clinicId, patientOrRecordId, dentistId, data, actor)
  }

  async getEvolutionsByMedicalRecord(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string
  ) {
    return getEvolutionsByPatient(tenantId, clinicId, patientOrRecordId)
  }

  async getEvolutions(tenantId: string, clinicId: string, patientOrRecordId: string) {
    return getEvolutionsByPatient(tenantId, clinicId, patientOrRecordId)
  }

  async getCurrentOdontogram(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string
  ) {
    return getOdontogram(tenantId, clinicId, patientOrRecordId)
  }

  async lockEvolution(
    tenantId: string,
    clinicId: string,
    evolutionId: string,
    actor: ActorContext
  ) {
    return lockEvolution(tenantId, clinicId, evolutionId, actor)
  }

  async updateEvolution(
    tenantId: string,
    clinicId: string,
    evolutionId: string,
    description: string,
    actor: ActorContext
  ) {
    return updateEvolution(tenantId, clinicId, evolutionId, description, actor)
  }
}