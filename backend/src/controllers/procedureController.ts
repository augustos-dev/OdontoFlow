import type { Request, Response, NextFunction } from 'express'
import * as procedureService from '../services/procedureService'
import type { UserRole } from '@prisma/client'
import type { CreateProcedureDTO, UpdateProcedureDTO, ProcedureFiltersDTO } from '../types/procedure.types'

export async function createProcedureController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const actor = { clinicId, userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const procedure = await procedureService.createProcedure(tenantId, req.body as CreateProcedureDTO, actor)
    res.status(201).json(procedure)
  } catch (error) {
    next(error)
  }
}

export async function listProceduresController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const filters: ProcedureFiltersDTO = {
      name: req.query.name as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await procedureService.listProcedures(tenantId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getProcedureByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const procedure = await procedureService.getProcedureById(tenantId, id as string)
    res.status(200).json(procedure)
  } catch (error) {
    next(error)
  }
}

export async function updateProcedureController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { id } = req.params
    const actor = { clinicId, userId, userName: userName || 'Usuário', userRole: role as UserRole }

    const procedure = await procedureService.updateProcedure(tenantId, id as string, req.body as UpdateProcedureDTO, actor)
    res.status(200).json(procedure)
  } catch (error) {
    next(error)
  }
}

export async function deleteProcedureController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, sub: userId, name: userName, role } = req.user!
    const { id } = req.params
    const actor = { clinicId, userId, userName: userName || 'Usuário', userRole: role as UserRole }

    await procedureService.deleteProcedure(tenantId, id as string, actor)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}