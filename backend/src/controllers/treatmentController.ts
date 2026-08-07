import type { Request, Response, NextFunction } from 'express'
import * as treatmentPlanService from '../services/treatamentService'
import type { UserRole } from '@prisma/client'
import type {
  CreateTreatmentPlanDTO,
  UpdateTreatmentPlanDTO,
  UpdateTreatmentPlanStatusDTO,
  TreatmentPlanFiltersDTO,
} from '../types/treatment.types'

export async function createTreatmentPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const plan = await treatmentPlanService.createTreatmentPlan(
      tenantId,
      clinicId,
      req.body as CreateTreatmentPlanDTO,
      actor
    )
    res.status(201).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function listTreatmentPlansController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: TreatmentPlanFiltersDTO = {
      patientId: req.query.patientId as string,
      dentistId: req.query.dentistId as string,
      status: req.query.status as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await treatmentPlanService.listTreatmentPlans(tenantId, clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getTreatmentPlanByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const plan = await treatmentPlanService.getTreatmentPlanById(tenantId, clinicId, id as string)
    res.status(200).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function updateTreatmentPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { id } = req.params
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const plan = await treatmentPlanService.updateTreatmentPlan(
      tenantId,
      clinicId,
      id as string,
      req.body as UpdateTreatmentPlanDTO,
      actor
    )
    res.status(200).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function updateTreatmentPlanStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { id } = req.params
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const plan = await treatmentPlanService.updateTreatmentPlanStatus(
      tenantId,
      clinicId,
      id as string,
      req.body as UpdateTreatmentPlanStatusDTO,
      actor
    )
    res.status(200).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function deleteTreatmentPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { id } = req.params
    const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

    await treatmentPlanService.deleteTreatmentPlan(tenantId, clinicId, id as string, actor)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}