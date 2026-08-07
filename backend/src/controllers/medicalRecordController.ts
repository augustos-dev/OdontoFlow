import { Request, Response, NextFunction } from 'express'
import * as medicalRecordService from '../services/medicalRecordService'
import { uploadToSupabase } from '../services/storageService'
import type { UserRole } from '@prisma/client'
import type {
  UpdateMedicalRecordsDTO,
  ToothConditionDTO,
  CreateEvolutionDTO
} from '../types/medicalRecord.types'

function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

async function processAttachments(req: Request): Promise<string[]> {
  const files = req.files as Express.Multer.File[] | undefined
  let attachmentUrls: string[] = []

  if (files && files.length > 0) {
    const uploadPromises = files.map(file => {
      const ext = file.originalname.includes('.')
        ? file.originalname.split('.').pop()
        : file.mimetype === 'application/pdf' ? 'pdf' : 'jpg'

      const sanitizedFileName = `evo_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      
      const cleanFile: Express.Multer.File = {
        ...file,
        filename: sanitizedFileName,
        originalname: sanitizedFileName
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
    const { tenantId, clinicId } = req.user!
    const targetId = getRecordIdParam(req)

    const evolutions = await medicalRecordService.getEvolutions(
      tenantId,
      clinicId,
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
    const { tenantId, clinicId, sub, name: userName, role } = req.user!
    const dentistId = sub || (req.user as any).id
    const targetId = getRecordIdParam(req)
    const actor = { userId: dentistId, userName: userName || 'Usuário', userRole: role as UserRole }

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
      odontogramSnapshot: parsedSnapshot,
      attachments: attachmentUrls
    }

    const evolution = await medicalRecordService.CreateEvolution(
      tenantId,
      clinicId,
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
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { evolutionId } = req.params
    const { description } = req.body
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const updatedEvolution = await medicalRecordService.updateEvolution(
      tenantId,
      clinicId,
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
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { evolutionId } = req.params
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const lockedEvolution = await medicalRecordService.lockEvolution(
      tenantId,
      clinicId,
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
    const { tenantId, clinicId } = req.user!
    const targetId = getRecordIdParam(req)
    const record = await medicalRecordService.getMedicalRecordByPatient(tenantId, clinicId, targetId)
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
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const targetId = getRecordIdParam(req)
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const record = await medicalRecordService.updateMedicalRecord(
      tenantId, 
      clinicId, 
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
    const { tenantId, clinicId } = req.user!
    const targetId = getRecordIdParam(req)
    const odontogram = await medicalRecordService.getOdontogram(tenantId, clinicId, targetId)
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
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const targetId = getRecordIdParam(req)
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const toothCondition = await medicalRecordService.upsertToothCondition(
      tenantId,
      clinicId,
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
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { toothNumber } = req.params
    const targetId = getRecordIdParam(req)
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    await medicalRecordService.deleteToothCondition(
      tenantId, 
      clinicId, 
      targetId, 
      Number(toothNumber),
      actor
    )
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}