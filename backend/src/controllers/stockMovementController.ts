import { Request, Response } from 'express'
import { UserRole } from '@prisma/client' // 👈 Importação que faltava!
import * as stockService from '../services/stockService'
import type {
  CreateStockMovementDTO,
  StockMovementFiltersDTO,
} from '../types/stock.types'
import type { CustomJwtPayload } from '../types/express' // 👈 Import do seu payload customizado!

// ─── 1. CRIAR MOVIMENTAÇÃO MANUAL DE ESTOQUE ────────────────────────────────
export async function createMovement(req: Request, res: Response): Promise<Response> {
  // Casting explícito para garantir o autocompleter e evitar conflito com JwtPayload padrão
  const user = req.user as CustomJwtPayload
  const data: CreateStockMovementDTO = req.body

  const result = await stockService.createStockMovement(user.tenantId, user.clinicId!, data, {
    clinicId: user.clinicId!,
    userId: user.userId,
    userName: (user as any).name || 'Usuário do Sistema',
    userRole: (user.role as UserRole) || UserRole.ADMIN,
  })

  return res.status(201).json({
    message: 'Movimentação de estoque registrada com sucesso.',
    data: result,
  })
}

// ─── 2. LISTAR HISTÓRICO DE MOVIMENTAÇÕES ───────────────────────────────────
export async function listMovements(req: Request, res: Response): Promise<Response> {
  const user = req.user as CustomJwtPayload

  const filters: StockMovementFiltersDTO = {
    productId: req.query.productId as string,
    type: req.query.type as any,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  }

  const result = await stockService.listStockMovements(user.tenantId, user.clinicId!, filters)

  return res.status(200).json(result)
}