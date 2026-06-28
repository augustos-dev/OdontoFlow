// backend/src/controllers/treatmentPlan.controller.ts

import type { Request, Response, NextFunction } from 'express'
import * as treatmentPlanService from '../services/treatamentService'
import type {
  CreateTreatmentPlanDTO,
  UpdateTreatmentPlanDTO,
  UpdateTreatmentPlanStatusDTO,
  TreatmentPlanFiltersDTO,
} from '../types/treatment.types'

export async function createTreatmentPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const plan = await treatmentPlanService.createTreatmentPlan(tenantId, clinicId, req.body as CreateTreatmentPlanDTO)
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
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const plan = await treatmentPlanService.updateTreatmentPlan(tenantId, clinicId, id as string, req.body as UpdateTreatmentPlanDTO)
    res.status(200).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function updateTreatmentPlanStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const plan = await treatmentPlanService.updateTreatmentPlanStatus(tenantId, clinicId, id as string, req.body as UpdateTreatmentPlanStatusDTO)
    res.status(200).json(plan)
  } catch (error) {
    next(error)
  }
}

export async function deleteTreatmentPlanController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    await treatmentPlanService.deleteTreatmentPlan(tenantId, clinicId, id as string)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}