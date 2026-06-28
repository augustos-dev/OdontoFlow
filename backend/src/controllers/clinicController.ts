

import type { Request, Response, NextFunction } from 'express'
import * as clinicService from '../services/clinicService'
import type { CreateClinicDTO, UpdateClinicDTO, ClinicFiltersDTO } from '../types/clinics.types'

export async function createClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const clinic = await clinicService.createClinic(tenantId, req.body as CreateClinicDTO)
    res.status(201).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function listClinicsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const filters: ClinicFiltersDTO = {
      name: req.query.name as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await clinicService.listClinics(tenantId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getClinicByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const clinic = await clinicService.getClinicById(tenantId, id as string)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function updateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const clinic = await clinicService.updateClinic(tenantId, id as string, req.body as UpdateClinicDTO)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function deactivateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const clinic = await clinicService.deactivateClinic(tenantId, id as string)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function reactivateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const clinic = await clinicService.reactivateClinic(tenantId, id as string)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}