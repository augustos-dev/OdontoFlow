import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import type {
  CreateStockMovementDTO,
  StockMovementFiltersDTO,
} from '../types/stock.types'

interface ActorContext {
  clinicId: string
  userId: string
  userName: string
  userRole?: UserRole
}

// ─── 1. CRIAR MOVIMENTAÇÃO MANUAL (ENTRY / EXIT_MANUAL) ──────────────────────

export async function createStockMovement(
  tenantId: string,
  clinicId: string,
  data: CreateStockMovementDTO,
  actor: ActorContext
) {
  const { productId, type, quantity, reason } = data

  if (quantity <= 0) {
    throw new AppError('A quantidade da movimentação deve ser maior que zero.', 400)
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
  })

  if (!product) {
    throw new AppError('Produto não encontrado no estoque da clínica.', 404)
  }

  // Trava de segurança para não deixar o saldo ficar negativo em saídas manuais
  if (type === 'EXIT_MANUAL' && product.quantity < quantity) {
    throw new AppError(
      `Saldo insuficiente. O estoque atual de "${product.name}" é de ${product.quantity} unidades.`,
      400
    )
  }

  const netQuantity = type === 'ENTRY' ? quantity : -quantity

  // Transação atômica: Atualiza o produto e cria o registro de movimentação
  const result = await prisma.$transaction(async (tx) => {
    // Atômico: a checagem de saldo e o abatimento acontecem no MESMO UPDATE condicional.
    // (Antes lia o saldo, comparava e depois fazia increment: duas saídas simultâneas deixavam o saldo negativo.)
    if (type === 'EXIT_MANUAL') {
      const r = await tx.product.updateMany({
        where: { id: productId, tenantId, clinicId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      })
      if (r.count === 0) {
        throw new AppError(`Saldo insuficiente para "${product.name}".`, 400)
      }
    } else {
      await tx.product.updateMany({
        where: { id: productId, tenantId, clinicId },
        data: { quantity: { increment: quantity } },
      })
    }

    const updatedProduct = await tx.product.findUniqueOrThrow({ where: { id: productId } })

    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        clinicId,
        productId,
        userId: actor.userId,
        type,
        quantity: netQuantity,
        reason: reason || (type === 'ENTRY' ? 'Reposição/Entrada Manual' : 'Ajuste/Saída Manual'),
      },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })

    return { updatedProduct, movement }
  })

  // 🟢 Log de Auditoria
  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'PRODUCT',
    entityId: productId,
    details: `Registrou movimentação de estoque (${type}) de ${quantity} unidade(s) para o produto "${product.name}". Razão: ${reason || 'N/A'}`,
  })

  return result
}

// ─── 2. LISTAR HISTÓRICO DE MOVIMENTAÇÕES ────────────────────────────────────

export async function listStockMovements(
  tenantId: string,
  clinicId: string,
  filters: StockMovementFiltersDTO
) {
  const { productId, type, startDate, endDate, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  let dateFilter: Prisma.StockMovementWhereInput = {}
  if (startDate || endDate) {
    dateFilter = {
      createdAt: {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      },
    }
  }

  const where: Prisma.StockMovementWhereInput = {
    tenantId,
    clinicId,
    ...(productId && { productId }),
    ...(type && { type }),
    ...dateFilter,
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ])

  return {
    data: movements,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ─── 3. DEDUÇÃO AUTOMÁTICA (EXIT INTELIGENTE) ────────────────────────────────
// A antiga `processAutoStockDeduction` foi REMOVIDA: buscava a receita só por tenant (baixava insumo de outra
// unidade), deixava o saldo negativo e não tinha trava de idempotência. Use `triggerAutoStockExit`
// (utils/stockAutoExit.ts), que é por clínica, atômico e idempotente.
