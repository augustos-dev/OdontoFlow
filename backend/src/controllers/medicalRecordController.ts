import { Request, Response, NextFunction } from 'express'
import * as medicalRecordService from '../services/medicalRecordService'
import { uploadToSupabase } from '../services/storageService'
import type { UserRole } from '@prisma/client'
import type { CustomJwtPayload } from '../types/express'
import type {
  UpdateMedicalRecordsDTO,
  ToothConditionDTO,
  CreateEvolutionDTO,
} from '../types/medicalRecord.types'

function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

async function processAttachments(req: Request): Promise<string[]> {
  const files = req.files as Express.Multer.File[] | undefined
  let attachmentUrls: string[] = []

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) => {
      const ext = file.originalname.includes('.')
        ? file.originalname.split('.').pop()
        : file.mimetype === 'application/pdf'
        ? 'pdf'
        : 'jpg'

      const sanitizedFileName = `evo_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

      const cleanFile: Express.Multer.File = {
        ...file,
        filename: sanitizedFileName,
        originalname: sanitizedFileName,
      }

      return uploadToSupabase(cleanFile)
    })

    attachmentUrls = await Promise.all(uploadPromises)
  }

  if (req.body?.attachments) {
    let bodyAttachments = req.body.attachments

    if (typeof bodyAttachments === 'string') {
      try {
        bodyAttachments = JSON.parse(bodyAttachments)
      } catch {
        bodyAttachments = [bodyAttachments]
      }
    }

    if (Array.isArray(bodyAttachments)) {
      attachmentUrls = [...attachmentUrls, ...bodyAttachments]
    }
  }

  return attachmentUrls
}

// ─── MÓDULO DE EVOLUÇÃO ──────────────────────────────────────────────────────

export async function getEvolutionsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const targetId = getRecordIdParam(req)

    const evolutions = await medicalRecordService.getEvolutions(
      user.tenantId,
      user.clinicId!,
      targetId
    )

    res.status(200).json(evolutions)
  } catch (error) {
    next(error)
  }
}

export async function createEvolutionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const dentistId = user.userId || (user as any).sub || (user as any).id
    const targetId = getRecordIdParam(req)
    const actor = {
      userId: dentistId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    const attachmentUrls = await processAttachments(req)

    let parsedSnapshot = req.body.odontogramSnapshot
    if (typeof parsedSnapshot === 'string') {
      try {
        parsedSnapshot = JSON.parse(parsedSnapshot)
      } catch {
        parsedSnapshot = null
      }
    }

    const evolutionData: CreateEvolutionDTO = {
      description: req.body.description,
      procedureId: req.body.procedureId, // 🚀 Gatilho para o Exit Inteligente
      odontogramSnapshot: parsedSnapshot,
      attachments: attachmentUrls,
    }

    const evolution = await medicalRecordService.CreateEvolution(
      user.tenantId,
      user.clinicId!,
      targetId,
      dentistId,
      evolutionData,
      actor
    )

    res.status(201).json(evolution)
  } catch (error) {
    next(error)
  }
}

export async function updateEvolutionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const userId = user.userId || (user as any).sub || (user as any).id
    const { evolutionId } = req.params
    const { description } = req.body
    const actor = {
      userId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    const updatedEvolution = await medicalRecordService.updateEvolution(
      user.tenantId,
      user.clinicId!,
      evolutionId as string,
      description,
      actor
    )

    res.status(200).json(updatedEvolution)
  } catch (error) {
    next(error)
  }
}

export async function lockEvolutionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const userId = user.userId || (user as any).sub || (user as any).id
    const { evolutionId } = req.params
    const actor = {
      userId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    const lockedEvolution = await medicalRecordService.lockEvolution(
      user.tenantId,
      user.clinicId!,
      evolutionId as string,
      actor
    )

    res.status(200).json(lockedEvolution)
  } catch (error) {
    next(error)
  }
}

// ─── MÓDULO DE PRONTUÁRIO & ODONTOGRAMA ─────────────────────────────────────

export async function getMedicalRecordByPatientController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const targetId = getRecordIdParam(req)

    const record = await medicalRecordService.getMedicalRecordByPatient(
      user.tenantId,
      user.clinicId!,
      targetId
    )

    res.status(200).json(record)
  } catch (error) {
    next(error)
  }
}

export async function updateMedicalRecordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const userId = user.userId || (user as any).sub || (user as any).id
    const targetId = getRecordIdParam(req)
    const actor = {
      userId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    const record = await medicalRecordService.updateMedicalRecord(
      user.tenantId,
      user.clinicId!,
      targetId,
      req.body as UpdateMedicalRecordsDTO,
      actor
    )

    res.status(200).json(record)
  } catch (error) {
    next(error)
  }
}

export async function getOdontogramController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const targetId = getRecordIdParam(req)

    const odontogram = await medicalRecordService.getOdontogram(
      user.tenantId,
      user.clinicId!,
      targetId
    )

    res.status(200).json(odontogram)
  } catch (error) {
    next(error)
  }
}

export async function upsertToothConditionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const userId = user.userId || (user as any).sub || (user as any).id
    const targetId = getRecordIdParam(req)
    const actor = {
      userId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    const toothCondition = await medicalRecordService.upsertToothCondition(
      user.tenantId,
      user.clinicId!,
      targetId,
      req.body as ToothConditionDTO,
      actor
    )

    res.status(200).json(toothCondition)
  } catch (error) {
    next(error)
  }
}

export async function deleteToothConditionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const userId = user.userId || (user as any).sub || (user as any).id
    const { toothNumber } = req.params
    const targetId = getRecordIdParam(req)
    const actor = {
      userId,
      userName: (user as any).name || 'Usuário',
      userRole: (user.role as UserRole) || 'DENTIST',
    }

    await medicalRecordService.deleteToothCondition(
      user.tenantId,
      user.clinicId!,
      targetId,
      Number(toothNumber),
      actor
    )

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}