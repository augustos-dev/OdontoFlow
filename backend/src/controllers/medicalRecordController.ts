import { Request, Response, NextFunction } from 'express'
import * as medicalRecordService from '../services/medicalRecordService'
import type {
  UpdateMedicalRecordsDTO,
  ToothConditionDTO
} from '../types/medicalRecord.types'

/**
 * Auxiliar interno para extrair com segurança o parâmetro de ID da URL, 
 * independentemente de como ele foi nomeado nas rotas (:id, :patientId ou :medicalRecordId)
 */
function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

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