import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { AppError } from '../shared/AppError'
import type {
  CreateProductDTO,
  AdjustStockDTO,
  UpdateProductDTO,
  FilterProductDTO,
} from '../types/products.types'

// Helpers
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
  const { name, quantity, minQuantity, supplierId, lotNumber, manufacturingDate, expiryDate, notes } = data

  // Valida fornecedor caso informado
  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, clinicId },
    })
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado.', 404)
    }
  }

  return prisma.product.create({
    data: {
      tenantId,
      clinicId,
      name,
      quantity,
      minQuantity,
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
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listProductService(
  tenantId: string,
  clinicId: string,
  filters: FilterProductDTO
) {
  const { name, supplierId, lotNumber, lowStock, expiring, page = 1, limit = 20 } = filters

  const skip = (page - 1) * limit

  // Alerta de vencimento de produtos vencendo em 30 dias
  const vencendoEmTrintaDias = new Date()
  vencendoEmTrintaDias.setDate(vencendoEmTrintaDias.getDate() + 30)

  const where: Prisma.ProductWhereInput = {
    tenantId,
    clinicId,
    ...(name && { name: { contains: name, mode: 'insensitive' } }),
    ...(supplierId && { supplierId }),
    ...(lotNumber && { lotNumber: { contains: lotNumber, mode: 'insensitive' } }),
    // Filtro de semáforo para estoque baixo/crítico (quantity <= minQuantity)
    ...(lowStock && {
      quantity: { lte: prisma.product.fields.minQuantity },
    }),
    // Filtro vencendo em 30 dias
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

  // Enriquece cada produto com o status do semáforo do estoque e alerta de expiração
  const data = products.map((product) => ({
    ...product,
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

// ─── Get By Id ───────────────────────────────────────────────────────────────

export async function getProductByIdService(
  tenantId: string,
  clinicId: string,
  productId: string
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true } },
    },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  return {
    ...product,
    stockStatus: getStockStatus(product.quantity, product.minQuantity),
  }
}

// ─── Update (Corrigido) ──────────────────────────────────────────────────────

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

  // Se informou um fornecedor, garante que ele existe na mesma clínica
  if (data.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId, clinicId },
    })
    if (!supplier) {
      throw new AppError('Fornecedor não encontrado.', 404)
    }
  }

  // Trata a conversão de datas enviadas como string no DTO
  const { manufacturingDate, expiryDate, ...rest } = data

  return prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
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
}

// ─── Adjust Stock ────────────────────────────────────────────────────────────

export async function adjustStockService(
  tenantId: string,
  clinicId: string,
  productId: string,
  data: AdjustStockDTO
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, clinicId },
  })

  if (!product) {
    throw new AppError('Produto não encontrado.', 404)
  }

  const newQuantity = product.quantity + data.quantity

  // Não permite estoque negativo
  if (newQuantity < 0) {
    throw new AppError(
      `Estoque insuficiente. Disponível: ${product.quantity} unidade(s).`,
      400
    )
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      quantity: newQuantity,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  return {
    ...updated,
    stockStatus: getStockStatus(updated.quantity, updated.minQuantity),
    adjustment: {
      previous: product.quantity,
      change: data.quantity,
      current: newQuantity,
      reason: data.reason,
    },
  }
}

// ─── Low Stock Alert (Corrigido) ─────────────────────────────────────────────

export async function getLowStockAlertService(tenantId: string, clinicId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId, clinicId },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
    },
    orderBy: {
      quantity: 'asc',
    },
  })

  // Filtra comparando a quantidade contra a quantidade mínima estipulada
  const lowStock = products.filter((p) => p.quantity <= p.minQuantity)

  return lowStock.map((p) => ({
    ...p,
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
    orderBy: {
      expiryDate: 'asc',
    },
  })

  return products.map((p) => ({
    ...p,
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

  await prisma.product.delete({
    where: { id: productId },
  })
}