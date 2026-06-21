import type { Request, Response, NextFunction } from 'express'
import * as patientService from '../services/patientServices'
import type { CreatePatientDTO, UpdatePatientDTO, PatientFiltersDTO } from '../types/patient.types'

export async function createPatientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const patient = await patientService.createPatient(tenantId, clinicId, req.body as CreatePatientDTO)
    res.status(201).json(patient)
  } catch (error) {
    next(error)
  }
}

export async function listPatientsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: PatientFiltersDTO = {
      name: req.query.name as string,
      cpf: req.query.cpf as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await patientService.listPatients(tenantId, clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getPatientByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const patient = await patientService.getPatientById(tenantId, clinicId, id as string)
    res.status(200).json(patient)
  } catch (error) {
    next(error)
  }
}

export async function updatePatientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const patient = await patientService.updatePatient(tenantId, clinicId, id as string, req.body as UpdatePatientDTO)
    res.status(200).json(patient)
  } catch (error) {
    next(error)
  }
}

export async function deletePatientController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    await patientService.deletePatient(tenantId, clinicId, id as string)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}