import type { Request, Response, NextFunction } from 'express'
import * as clinicService from '../services/clinicService'
import { getSessionUser } from '../middlewares/authMiddlewares'
import type { UserRole } from '@prisma/client'
import type {
  CreateClinicDTO,
  UpdateClinicDTO,
  ClinicFiltersDTO,
  UpdateClinicCustomizationDTO,
} from '../types/clinics.types'

function getActor(req: Request) {
  const user = getSessionUser(req)
  return {
    userId: user.userId || (user.sub as string),
    userName: user.name || 'Utilizador',
    userRole: user.role as UserRole,
  }
}

export async function createClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = getActor(req)

    const clinic = await clinicService.createClinic(user.tenantId, req.body as CreateClinicDTO, actor)
    res.status(201).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function listClinicsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const filters: ClinicFiltersDTO = {
      name: req.query.name as string | undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await clinicService.listClinics(user.tenantId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getClinicByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const clinic = await clinicService.getClinicById(user.tenantId, id as string)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function updateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = getActor(req)

    const clinic = await clinicService.updateClinic(user.tenantId, id as string, req.body as UpdateClinicDTO, actor)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function deactivateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = getActor(req)

    const clinic = await clinicService.deactivateClinic(user.tenantId, id as string, actor)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function reactivateClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = getActor(req)

    const clinic = await clinicService.reactivateClinic(user.tenantId, id as string, actor)
    res.status(200).json(clinic)
  } catch (error) {
    next(error)
  }
}

export async function getClinicCustomizationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const targetClinicId = (req.params.id as string) || user.clinicId

    const customization = await clinicService.getClinicCustomization(user.tenantId, targetClinicId)
    res.status(200).json(customization)
  } catch (error) {
    next(error)
  }
}

export async function updateClinicCustomizationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const targetClinicId = (req.params.id as string) || user.clinicId
    const actor = getActor(req)

    const updated = await clinicService.updateClinicCustomization(
      user.tenantId,
      targetClinicId,
      req.body as UpdateClinicCustomizationDTO,
      actor
    )
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}