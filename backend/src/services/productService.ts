import { prisma } from '../lib/prisma'
import { Prisma, StockMovementType, UnitType } from '@prisma/client'
import { AppError } from '../shared/AppError'
import type {
  CreateProductDTO,
  AdjustStockDTO,
  UpdateProductDTO,
  FilterProductDTO,
} from '../types/products.types'

// Helper de semáforo de estoque
function getStockStatus(quantity: number, minQuantity: number): 'CRITICO' | 'BAIXO' | 'OK' {
  if (quantity === 0) return 'CRITICO'
  if (quantity <= minQuantity) return 'BAIXO'
  return 'OK'
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProductService(
  tenantId: string,
  clinicId: string,
  data: CreateProductDTO
) {
  const { 
    name, 
    quantity, 
    minQuantity, 
    unit, 
    costPrice, 
    itemsPerPackage, 
    supplierId, 
    lotNumber, 
    manufacturingDate, 
    expiryDate, 
    notes 
  } = data

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, clinicId },
    })
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado.', 404)
    }
  }

  const parsedCost = costPrice !== undefined && costPrice !== null 
    ? parseFloat(String(costPrice).replace(',', '.')) 
    : null

  const parsedItemsPerPackage = itemsPerPackage !== undefined && itemsPerPackage !== null
    ? Number(itemsPerPackage)
    : (unit === 'CX' ? 100 : 1)

  const product = await prisma.product.create({
    data: {
      tenantId,
      clinicId,
      name,
      quantity: Number(quantity),
      minQuantity: Number(minQuantity),
      unit: (unit as UnitType) || 'UN',
      costPrice: parsedCost && !isNaN(parsedCost) ? parsedCost : null,
      itemsPerPackage: parsedItemsPerPackage > 0 ? parsedItemsPerPackage : 1, // 🟢 Suporte a rendimento/embalagem
      supplierId: supplierId ?? null,
      lotNumber: lotNumber ?? null,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes ?? null,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  // Se o produto já foi cadastrado com saldo inicial > 0, gera histórico de movimentação
  if (product.quantity > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        clinicId,
        productId: product.id,
        type: 'ENTRY',
        quantity: product.quantity,
        reason: 'Cadastro Inicial de Estoque',
      },
    })
  }

  return {
    ...product,
    batchNumber: product.lotNumber, // 📦 Alias para compatibilidade no Front
    stockStatus: getStockStatus(product.quantity, product.minQuantity),
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listProductService(
  tenantId: string,
  clinicId: string,
  filters: FilterProductDTO
) {
  const { name, supplierId, lotNumber, unit, lowStock, expiring, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const vencendoEmTrintaDias = new Date()
  vencendoEmTrintaDias.setDate(vencendoEmTrintaDias.getDate() + 30)

  const where: Prisma.ProductWhereInput = {
    tenantId,
    clinicId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(supplierId && { supplierId }),
    ...(unit && { unit: unit as UnitType }),
    ...(lotNumber && { lotNumber: { contains: lotNumber, mode: 'insensitive' } }),
    ...(lowStock && {
      quantity: { lte: prisma.product.fields.minQuantity },
    }),
    ...(expiring && {
      expiryDate: {
        not: null,
        lte: vencendoEmTrintaDias,
        gte: new Date(),
      },
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  const data = products.map((product) => ({
    ...product,
    batchNumber: product.lotNumber, // 📦 Alias Front-end
    stockStatus: getStockStatus(product.quantity, product.minQuantity),
    isExpiringSoon:
      product.expiryDate !== null && product.expiryDate <= vencendoEmTrintaDias,
  }))

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ─── Get By Id (Com Histórico de Movimentações do Exit Inteligente) ─────────

export async function getProductByIdService(
  tenantId: string,
  clinicId: string,
  productId: string
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true, contact: true } },
      stockMovements: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  return {
    ...product,
    batchNumber: product.lotNumber,
    stockStatus: getStockStatus(product.quantity, product.minQuantity),
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateProductService(
  tenantId: string,
  clinicId: string,
  productId: string,
  data: UpdateProductDTO
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  if (data.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId, clinicId },
    })
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado.', 404)
    }
  }

  const { manufacturingDate, expiryDate, costPrice, itemsPerPackage, ...rest } = data

  const parsedCost = costPrice !== undefined && costPrice !== null 
    ? parseFloat(String(costPrice).replace(',', '.')) 
    : undefined

  const parsedItemsPerPackage = itemsPerPackage !== undefined && itemsPerPackage !== null
    ? Number(itemsPerPackage)
    : undefined

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
      ...(parsedCost !== undefined && { costPrice: isNaN(parsedCost) ? null : parsedCost }),
      ...(parsedItemsPerPackage !== undefined && { itemsPerPackage: parsedItemsPerPackage > 0 ? parsedItemsPerPackage : 1 }),
      ...(manufacturingDate !== undefined && {
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      }),
      ...(expiryDate !== undefined && {
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      }),
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  return {
    ...updated,
    batchNumber: updated.lotNumber,
    stockStatus: getStockStatus(updated.quantity, updated.minQuantity),
  }
}

// ─── Adjust Stock (Integração com StockMovement) ────────────────────────────

export async function adjustStockService(
  tenantId: string,
  clinicId: string,
  productId: string,
  data: AdjustStockDTO,
  userId?: string
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  const change = Number(data.quantity)
  const currentQuantity = Number(product.quantity)

  if (isNaN(change)) {
    throw new AppError('A quantidade enviada deve ser um número válido.', 400)
  }

  const newQuantity = currentQuantity + change

  if (newQuantity < 0) {
    throw new AppError(
      `Estoque insuficiente. Disponível: ${currentQuantity} ${product.unit}. Tentativa de alteração: ${change}`,
      400
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { quantity: newQuantity },
      include: { supplier: { select: { id: true, name: true } } },
    })

    const movementType: StockMovementType = change > 0 ? 'ENTRY' : 'EXIT_MANUAL'

    await tx.stockMovement.create({
      data: {
        tenantId,
        clinicId,
        productId,
        userId: userId ?? null,
        type: movementType,
        quantity: Math.abs(change),
        reason: data.reason || 'Ajuste manual de estoque',
      },
    })

    return updatedProduct
  })

  return {
    ...result,
    batchNumber: result.lotNumber,
    stockStatus: getStockStatus(result.quantity, result.minQuantity),
    adjustment: {
      previous: currentQuantity,
      change,
      current: newQuantity,
      reason: data.reason,
    },
  }
}

// ─── Low Stock Alert ─────────────────────────────────────────────────────────

export async function getLowStockAlertService(tenantId: string, clinicId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId, clinicId },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { quantity: 'asc' },
  })

  const lowStock = products.filter((p) => p.quantity <= p.minQuantity)

  return lowStock.map((p) => ({
    ...p,
    batchNumber: p.lotNumber,
    stockStatus: getStockStatus(p.quantity, p.minQuantity),
  }))
}

// ─── Expiring Products ───────────────────────────────────────────────────────

export async function getExpringProductsService(tenantId: string, clinicId: string) {
  const vencendoEmTrintaDias = new Date()
  vencendoEmTrintaDias.setDate(vencendoEmTrintaDias.getDate() + 30)

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      clinicId,
      expiryDate: {
        not: null,
        lte: vencendoEmTrintaDias,
        gte: new Date(),
      },
    },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { expiryDate: 'asc' },
  })

  return products.map((p) => ({
    ...p,
    batchNumber: p.lotNumber,
    daysUntilExpiry: Math.ceil(
      (p.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteProductService(
  tenantId: string,
  clinicId: string,
  productId: string
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  if (product.quantity > 0) {
    throw new AppError(
      'Não é possível deletar um produto com quantidade acima de zero. Zere o estoque antes de deletar.',
      400
    )
  }

  await prisma.product.delete({ where: { id: productId } })
}