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
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: netQuantity,
        },
      },
    })

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

// ─── 3. DEDUÇÃO AUTOMÁTICA DE ESTOQUE (EXIT INTELIGENTE) ────────────────────

export async function processAutoStockDeduction(
  tenantId: string,
  clinicId: string,
  procedureId: string,
  userId?: string,
  referenceText?: string
) {
  // Busca os insumos da ficha técnica do procedimento
  const recipeItems = await prisma.procedureProduct.findMany({
    where: { procedureId, tenantId },
    include: { product: true },
  })

  if (recipeItems.length === 0) return []

  return await prisma.$transaction(async (tx) => {
    const results = []

    for (const item of recipeItems) {
      const product = item.product

      if (product.quantity < item.quantity) {
        console.warn(
          `[Exit Inteligente Warning] Saldo insuficiente para ${product.name}. Requerido: ${item.quantity}, Saldo atual: ${product.quantity}`
        )
      }

      // 1. Abate o saldo no produto
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      })

      // 2. Grava histórico como EXIT_AUTO
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          clinicId,
          productId: product.id,
          userId,
          type: 'EXIT_AUTO',
          quantity: -item.quantity,
          reason: referenceText || `Baixa Automática por Procedimento`,
        },
      })

      results.push({ updatedProduct, movement })
    }

    return results
  })
}