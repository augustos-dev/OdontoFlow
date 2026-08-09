import type { Request, Response, NextFunction } from 'express'
import * as procedureService from '../services/procedureService'
import type { UserRole } from '@prisma/client'
import type { CustomJwtPayload } from '../types/express'
import type {
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureFiltersDTO,
  SetProcedureProductsDTO,
} from '../types/procedure.types'

// Helper para extrair o ActorContext de forma segura
function extractActor(req: Request) {
  const user = req.user as CustomJwtPayload
  return {
    clinicId: user.clinicId,
    userId: user.userId || (user as any).sub || (user as any).id,
    userName: (user as any).name || 'Usuário',
    userRole: (user.role as UserRole) || 'ADMIN',
  }
}

// ─── 1. CRIAR PROCEDIMENTO ───────────────────────────────────────────────────
export async function createProcedureController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const actor = extractActor(req)

    const procedure = await procedureService.createProcedure(
      user.tenantId,
      req.body as CreateProcedureDTO,
      actor
    )

    res.status(201).json(procedure)
  } catch (error) {
    next(error)
  }
}

// ─── 2. LISTAR PROCEDIMENTOS ─────────────────────────────────────────────────
export async function listProceduresController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload

    const filters: ProcedureFiltersDTO = {
      name: req.query.name as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }

    const result = await procedureService.listProcedures(user.tenantId, filters)

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// ─── 3. BUSCAR PROCEDIMENTO POR ID ───────────────────────────────────────────
export async function getProcedureByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params

    const procedure = await procedureService.getProcedureById(user.tenantId, id as string)

    res.status(200).json(procedure)
  } catch (error) {
    next(error)
  }
}

// ─── 4. EDITAR PROCEDIMENTO ──────────────────────────────────────────────────
export async function updateProcedureController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    const procedure = await procedureService.updateProcedure(
      user.tenantId,
      id as string,
      req.body as UpdateProcedureDTO,
      actor
    )

    res.status(200).json(procedure)
  } catch (error) {
    next(error)
  }
}

// ─── 5. DELETAR PROCEDIMENTO ─────────────────────────────────────────────────
export async function deleteProcedureController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    await procedureService.deleteProcedure(user.tenantId, id as string, actor)

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

// ─── 6. ATUALIZAR FICHA TÉCNICA (VINCULAR INSUMOS DO ESTOQUE) ───────────────
export async function setProcedureProductsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    const result = await procedureService.setProcedureProducts(
      user.tenantId,
      id as string,
      req.body as SetProcedureProductsDTO,
      actor
    )

    res.status(200).json({
      message: 'Ficha técnica do procedimento atualizada com sucesso.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ─── 7. BUSCAR INSUMOS DA FICHA TÉCNICA DO PROCEDIMENTO ─────────────────────
export async function getProcedureProductsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params

    const products = await procedureService.getProcedureProducts(user.tenantId, id as string)

    res.status(200).json(products)
  } catch (error) {
    next(error)
  }
}