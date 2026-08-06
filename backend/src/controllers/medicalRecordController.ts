import { Request, Response, NextFunction } from 'express'
import * as medicalRecordService from '../services/medicalRecordService'
import { uploadToSupabase } from '../services/storageService'
import type {
  UpdateMedicalRecordsDTO,
  ToothConditionDTO,
  CreateEvolutionDTO
} from '../types/medicalRecord.types'

/**
 * Auxiliar para extrair o ID de paciente/prontuário dos parâmetros da rota
 */
function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

/**
 * Processa uploads com sanitização de nomes e suporte completo para PDFs e Imagens
 */
async function processAttachments(req: Request): Promise<string[]> {
  const files = req.files as Express.Multer.File[] | undefined
  let attachmentUrls: string[] = []

  if (files && files.length > 0) {
    const uploadPromises = files.map(file => {
      // 1. Garante higienização do nome para evitar rejeição por path inválido no Supabase
      const ext = file.originalname.includes('.')
        ? file.originalname.split('.').pop()
        : file.mimetype === 'application/pdf' ? 'pdf' : 'jpg'

      const sanitizedFileName = `evo_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      
      // Cria objeto limpo mantendo buffer e mimetype intactos
      const cleanFile: Express.Multer.File = {
        ...file,
        filename: sanitizedFileName,
        originalname: sanitizedFileName
      }

      return uploadToSupabase(cleanFile)
    })

    attachmentUrls = await Promise.all(uploadPromises)
  }

  // 2. Anexos legados/enviados no body
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
    const { tenantId, clinicId, sub } = req.user!
    const dentistId = sub || (req.user as any).id
    const targetId = getRecordIdParam(req)

    // Upload seguro de anexos
    const attachmentUrls = await processAttachments(req)

    // Parse seguro de FormData
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
      evolutionData
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
    const { tenantId } = req.user!
    const { evolutionId } = req.params
    const { description } = req.body

    const updatedEvolution = await medicalRecordService.updateEvolution(
      tenantId,
      evolutionId as string,
      description
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
    const { tenantId } = req.user!
    const { evolutionId } = req.params

    const lockedEvolution = await medicalRecordService.lockEvolution(
      tenantId,
      evolutionId as string
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
    const { tenantId, clinicId } = req.user!
    const targetId = getRecordIdParam(req)
    const record = await medicalRecordService.updateMedicalRecord(
      tenantId, 
      clinicId, 
      targetId, 
      req.body as UpdateMedicalRecordsDTO
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
    const { tenantId, clinicId } = req.user!
    const targetId = getRecordIdParam(req)
    const toothCondition = await medicalRecordService.upsertToothCondition(
      tenantId,
      clinicId,
      targetId,
      req.body as ToothConditionDTO
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
    const { tenantId, clinicId } = req.user!
    const { toothNumber } = req.params
    const targetId = getRecordIdParam(req)
    await medicalRecordService.deleteToothCondition(tenantId, clinicId, targetId, Number(toothNumber))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}