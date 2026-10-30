import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@prisma/client'
import * as catalog from '../services/clinicCatalogService'
import { AppError } from '../shared/AppError'
import type {
  SetClinicProcedureDTO,
  CloneClinicProceduresDTO,
  ReconcileRecipesDTO,
} from '../types/procedure.types'

function actorOf(req: Request) {
  const { sub: userId, name, role } = req.user!
  return { userId, userName: name || 'Usuário', userRole: role as UserRole }
}

// PATCH /clinics/:id/procedures/:procedureId  → ativa/desativa e define preço na unidade
export async function setClinicProcedureController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id, procedureId } = req.params
    const body = (req.body || {}) as SetClinicProcedureDTO

    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      throw new AppError('isActive deve ser booleano.', 400)
    }
    if (body.price !== undefined && body.price !== null && !Number.isFinite(Number(body.price))) {
      throw new AppError('price deve ser numérico ou null.', 400)
    }

    const result = await catalog.setClinicProcedure(
      tenantId,
      id as string,
      procedureId as string,
      { isActive: body.isActive, price: body.price === undefined ? undefined : body.price === null ? null : Number(body.price) },
      actorOf(req)
    )
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// POST /clinics/:id/procedures/clone   body: { fromClinicId, copyPrices? }   (:id = unidade DESTINO)
export async function cloneClinicProceduresController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const { fromClinicId, copyPrices } = (req.body || {}) as CloneClinicProceduresDTO

    if (!fromClinicId || typeof fromClinicId !== 'string') throw new AppError('Informe fromClinicId.', 400)

    const result = await catalog.cloneClinicProcedures(
      tenantId,
      fromClinicId,
      id as string,
      { copyPrices: copyPrices !== false },
      actorOf(req)
    )
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// POST /clinics/:id/recipes/reconcile   body: { fromClinicId }   (:id = unidade DESTINO)
export async function reconcileRecipesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const { fromClinicId } = (req.body || {}) as ReconcileRecipesDTO

    if (!fromClinicId || typeof fromClinicId !== 'string') throw new AppError('Informe fromClinicId.', 400)

    const result = await catalog.reconcileRecipes(tenantId, fromClinicId, id as string, actorOf(req))
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// GET /clinics/:id/procedures-without-recipe → procedimentos ativos que NÃO baixam estoque nesta unidade
export async function proceduresWithoutRecipeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const result = await catalog.listProceduresWithoutRecipe(tenantId, id as string)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
