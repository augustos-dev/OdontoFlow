import crypto from 'crypto'
import jwt from 'jsonwebtoken'
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

const JWT_SECRET = process.env.JWT_SECRET || 'odontoflow_super_secret_jwt_key_2026'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export async function findMedicalRecord(
  tenantId: string,
  _clinicId: string,
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
          aiTranscription: true,
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
      aiTranscription: true,
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

  const normalizedComplaint = data.mainComplaint || data.chiefComplaint
  const normalizedMeds = data.medicationsInUse || data.medications

  const updatedRecord = await prisma.medicalRecord.update({
    where: { id: medicalRecord.id },
    data: {
      chiefComplaint: normalizedComplaint,
      mainComplaint: normalizedComplaint,
      historyNotes: data.historyNotes,
      allergies: data.allergies,
      medications: normalizedMeds,
      medicationsInUse: normalizedMeds,
      bloodType: data.bloodType,
      habits: data.habits,
      systemicDiseases: data.systemicDiseases,
    },
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

// ─── Token Seguro de Anamnese (36 Horas) ──────────────────────────────────────

export async function generateAnamnesisToken(
  tenantId: string,
  clinicId: string,
  patientId: string,
  createdById?: string
) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId, clinicId, deletedAt: null },
    select: { id: true, name: true },
  })

  if (!patient) {
    throw new AppError('Paciente não encontrado.', 404)
  }

  // Gera um token aleatório limpo (32 caracteres) sem pontos ou caracteres que quebrem no WhatsApp
  const rawToken = crypto.randomBytes(24).toString('hex')
  
  // Hash SHA-256 para busca indexada rápida e segura no banco
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 36 * 60 * 60 * 1000) // 36 horas

  // Revoga tokens pendentes anteriores deste paciente para manter apenas o mais recente
  await prisma.patientAnamnesisToken.updateMany({
    where: { patientId, isRevoked: false, usedAt: null },
    data: { isRevoked: true },
  })

  await prisma.patientAnamnesisToken.create({
    data: {
      tenantId,
      clinicId,
      patientId: patient.id,
      createdById: createdById || null,
      tokenHash,
      expiresAt,
    },
  })

  return {
    token: rawToken, // Token limpo enviado na URL
    expiresInHours: 36,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function getPublicAnamnesisByToken(rawToken: string) {
  if (!rawToken) throw new AppError('Token de anamnese não fornecido.', 400)

  const token = rawToken.trim()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // 1. Busca pelo token opaco curto
  const registeredToken = await prisma.patientAnamnesisToken.findFirst({
    where: {
      OR: [
        { tokenHash },
        // Fallback caso venha com hash direto
        { id: token.length === 36 ? token : undefined }
      ]
    },
    include: {
      patient: { select: { id: true, name: true } },
    }
  })

  if (!registeredToken) {
    throw new AppError('Link de anamnese inválido ou não encontrado.', 401)
  }

  if (registeredToken.isRevoked) {
    throw new AppError('Este link de anamnese foi cancelado.', 403)
  }

  if (new Date() > new Date(registeredToken.expiresAt)) {
    throw new AppError('Este link de anamnese expirou (limite de 36 horas).', 401)
  }

  const medicalRecord = await prisma.medicalRecord.findFirst({
    where: {
      patientId: registeredToken.patientId,
      tenantId: registeredToken.tenantId,
    },
  })

  const clinic = await prisma.clinic.findUnique({
    where: { id: registeredToken.clinicId },
    select: { name: true },
  })

  return {
    patientName: registeredToken.patient?.name || 'Paciente',
    clinicName: clinic?.name || 'Clarium Clinic',
    medicalRecord: medicalRecord || null,
  }
}

export async function updatePublicAnamnesisByToken(
  rawToken: string,
  data: UpdateMedicalRecordsDTO,
  context?: { ip?: string; userAgent?: string }
) {
  if (!rawToken) throw new AppError('Token de anamnese não fornecido.', 400)

  const token = rawToken.trim()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const registeredToken = await prisma.patientAnamnesisToken.findFirst({
    where: { tokenHash },
    include: { patient: { select: { id: true, name: true } } }
  })

  if (!registeredToken) {
    throw new AppError('Link de anamnese inválido.', 401)
  }

  if (registeredToken.isRevoked) {
    throw new AppError('Este link de anamnese já foi utilizado ou revogado.', 403)
  }

  if (new Date() > new Date(registeredToken.expiresAt)) {
    throw new AppError('Este link de anamnese expirou (limite de 36 horas).', 401)
  }

  const normalizedComplaint = data.mainComplaint || data.chiefComplaint
  const normalizedMeds = data.medicationsInUse || data.medications

  const updatedRecord = await prisma.medicalRecord.upsert({
    where: {
      tenantId_patientId: {
        tenantId: registeredToken.tenantId,
        patientId: registeredToken.patientId,
      },
    },
    update: {
      chiefComplaint: normalizedComplaint,
      mainComplaint: normalizedComplaint,
      historyNotes: data.historyNotes,
      allergies: data.allergies,
      medications: normalizedMeds,
      medicationsInUse: normalizedMeds,
      bloodType: data.bloodType,
      habits: data.habits,
      systemicDiseases: data.systemicDiseases,
    },
    create: {
      tenantId: registeredToken.tenantId,
      clinicId: registeredToken.clinicId,
      patientId: registeredToken.patientId,
      chiefComplaint: normalizedComplaint,
      mainComplaint: normalizedComplaint,
      historyNotes: data.historyNotes,
      allergies: data.allergies,
      medications: normalizedMeds,
      medicationsInUse: normalizedMeds,
      bloodType: data.bloodType,
      habits: data.habits,
      systemicDiseases: data.systemicDiseases,
    },
  })

  // Marca como usado
  await prisma.patientAnamnesisToken.update({
    where: { id: registeredToken.id },
    data: {
      usedAt: new Date(),
      acceptedTerms: true,
      signerIp: context?.ip || null,
      signerUserAgent: context?.userAgent || null,
    },
  })

  await auditLogService.createLog({
    tenantId: registeredToken.tenantId,
    clinicId: registeredToken.clinicId,
    userId: undefined,
    userName: `Paciente: ${registeredToken.patient?.name || 'Anônimo'}`,
    action: 'UPDATE',
    entity: 'MEDICAL_RECORD',
    entityId: updatedRecord.id,
    details: `Paciente concluiu o preenchimento digital da anamnese via Magic Link seguro de 36h.`,
    ipAddress: context?.ip,
    userAgent: context?.userAgent,
  })

  return updatedRecord
}

// ─── Evoluções & Odontograma ──────────────────────────────────────────────────

export async function CreateEvolution(
  tenantId: string,
  clinicId: string,
  patientOrRecordId: string,
  dentistId: string,
  data: CreateEvolutionDTO,
  actor?: ActorContext
) {
  data = data || ({} as CreateEvolutionDTO)

  const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

  let dentist = await prisma.user.findFirst({
    where: {
      id: dentistId,
      tenantId,
      isActive: true,
    },
  })

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

  if (data.procedureId) {
    const procedureExists = await prisma.procedure.findFirst({
      where: { id: data.procedureId, tenantId },
    })
    if (!procedureExists) {
      throw new AppError('Procedimento selecionado não encontrado no catálogo.', 404)
    }
  }

  if (data.aiTranscriptionId) {
    const transcriptionExists = await prisma.clinicalAiTranscription.findFirst({
      where: { id: data.aiTranscriptionId, tenantId },
    })
    if (!transcriptionExists) {
      throw new AppError('Transcrição de IA informada não foi encontrada.', 404)
    }
  }

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

  const evolution = await prisma.$transaction(async (tx) => {
    const createdEvolution = await tx.evolution.create({
      data: {
        tenantId,
        medicalRecordId: medicalRecord.id,
        dentistId: responsibleUserId,
        procedureId: data.procedureId || null,
        description: data.description || 'Evolução registrada',
        aiTranscriptionId: data.aiTranscriptionId || null,
        attachments: attachmentsList,
        odontogramSnapshot: (parsedSnapshot as any ) ?? undefined
      },
      include: {
        dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
        procedure: { select: { id: true, name: true, basePrice: true } },
      },
    })

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

  if (attachmentsList.length > 0) {
    try {
      for (const url of attachmentsList) {
        const fileName = url.split('/').pop()?.split('?')[0] || 'Anexo Clínico'
        await prisma.medicalFile.create({
          data: {
            tenantId,
            clinicId,
            patientId: medicalRecord.patientId,
            name: fileName,
            url,
            size: 0,
          },
        }).catch((err: any) => console.warn('[MedicalFiles Warning] Ignorado:', err?.message))
      }
    } catch (fileErr) {
      console.error('[MedicalFiles Error]:', fileErr)
    }
  }

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

  if (!evolution) throw new AppError('Evolução não encontrada.', 404)
  if (evolution.isLocked) throw new AppError('Evolução já está travada.', 400)

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
    details: `Bloqueou permanentemente a evolução clínica ID: ${evolutionId}`,
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

  if (!evolution) throw new AppError('Evolução não encontrada.', 404)
  if (evolution.isLocked) throw new AppError('Evolução travada não pode ser editada.', 400)

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