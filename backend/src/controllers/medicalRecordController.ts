import { Request,Response,NextFunction } from 'express'
import * as medicalRecordService from '../services/medicalRecordService'
import type {
    UpdateMedicalRecordsDTO,
    CreateEvolutionDTO,
    ToothConditionDTO
} from '../types/medicalRecord.types'


export async function getMedicalRecordByPatientController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId} = req.user!
        const {patientId} = req.params
        const record = await medicalRecordService.getMedicalRecordByPatient(tenantId,clinicId,patientId as string)
        res.status(200).json(record)
    } catch (error) {
        next(error)
    }
}

export async function UpdateMedicalRecordController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId} = req.user!
        const {patientId} = req.params
        const record = await medicalRecordService.UpdateMedicalRecord(tenantId,clinicId,patientId as string, req.body as UpdateMedicalRecordsDTO)
        res.status(200).json(record)
    } catch (error) {
        next(error)
    }
}

export async function CreateEvolutionController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId, sub:dentistId} = req.user!
        const {patientId} = req.params
        const evolution = await medicalRecordService.CreateEvolution(
            tenantId,
            clinicId,
            patientId as string,
            dentistId as string,
            req.body as CreateEvolutionDTO
        )

        res.status(201).json(evolution)
    }  catch (error) {
        next(error)
    }
}

export async function updateEvolutionController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const{tenantId} = req.user!
        const{evolutionId} = req.params
        const {description}= req.body as {description:string}
        const evolution = await medicalRecordService.updateEvolution(
            tenantId,
            evolutionId as string,
            description
        )
        res.status(200).json(evolution)
    } catch (error) {
        next(error)
    }
}

export async function lockEvolutionController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId} = req.user!
        const{evolutionId} = req.params
        const evolution = await medicalRecordService.lockEvolution(
            tenantId,
            evolutionId as string
        )
        res.status(200).json(evolution)
        
    } catch (error) {
        next(error)
    }
}

 
export async function getOdontogramController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { patientId } = req.params
    const odontogram = await medicalRecordService.getOdontogram(tenantId, clinicId, patientId as string)
    res.status(200).json(odontogram)
  } catch (error) {
    next(error)
  }
}
 
export async function upsertToothConditionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { patientId } = req.params
    const toothCondition = await medicalRecordService.upsertToothCondition(
      tenantId,
      clinicId,
      patientId as string,
      req.body as ToothConditionDTO
    )
    res.status(200).json(toothCondition)
  } catch (error) {
    next(error)
  }
}
 
export async function deleteToothConditionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { patientId, toothNumber } = req.params
    await medicalRecordService.deleteToothCondition(tenantId, clinicId, patientId as string, Number(toothNumber))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}