import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  ListSuppliersQueryDTO,
  SupplierResponse,
  PaginatedSuppliersResponse,
} from '../types/supplier.types'

// =============================================================================
// 1. CRIAR FORNECEDOR
// =============================================================================
export async function createSupplier(
  tenantId: string,
  clinicId: string,
  data: CreateSupplierDTO
): Promise<SupplierResponse> {
  // Sanitização básica (remover espaços em branco extras)
  const sanitizedName = data.name.trim()

  if (!sanitizedName) {
    throw new AppError('O nome do fornecedor é obrigatório.', 400)
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      clinicId,
      name: sanitizedName,
      cnpj: data.cnpj?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      contact: data.contact?.trim() || null,
    },
  })

  return supplier
}

// =============================================================================
// 2. LISTAR FORNECEDORES (Com Busca, Paginação e Contagem de Produtos)
// =============================================================================
export async function listSuppliers(
  tenantId: string,
  clinicId: string,
  query: ListSuppliersQueryDTO
): Promise<PaginatedSuppliersResponse> {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20))
  const skip = (page - 1) * limit

  // Filtro seguro por Multi-tenant
  const whereCondition: any = {
    tenantId,
    clinicId,
  }

  // Busca por Nome, CNPJ ou E-mail se houver search param
  if (query.search?.trim()) {
    const search = query.search.trim()
    whereCondition.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cnpj: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Consulta em paralelo (Dados + Contagem Total)
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
    prisma.supplier.count({ where: whereCondition }),
  ])

  return {
    data: suppliers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

// =============================================================================
// 3. BUSCAR FORNECEDOR POR ID
// =============================================================================
export async function getSupplierById(
  tenantId: string,
  clinicId: string,
  supplierId: string
): Promise<SupplierResponse> {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      tenantId,
      clinicId,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  if (!supplier) {
    throw new AppError('Fornecedor não encontrado.', 404)
  }

  return supplier
}

// =============================================================================
// 4. ATUALIZAR FORNECEDOR
// =============================================================================
export async function updateSupplier(
  tenantId: string,
  clinicId: string,
  supplierId: string,
  data: UpdateSupplierDTO
): Promise<SupplierResponse> {
  // Garante que o fornecedor existe no Tenant/Clinic do usuário
  await getSupplierById(tenantId, clinicId, supplierId)

  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      cnpj: data.cnpj !== undefined ? (data.cnpj ? data.cnpj.trim() : null) : undefined,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      email: data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined,
      contact: data.contact !== undefined ? (data.contact ? data.contact.trim() : null) : undefined,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  return updatedSupplier
}

// =============================================================================
// 5. DELETAR FORNECEDOR
// =============================================================================
export async function deleteSupplier(
  tenantId: string,
  clinicId: string,
  supplierId: string
): Promise<{ message: string }> {
  const supplier = await getSupplierById(tenantId, clinicId, supplierId)

  // Trava de integridade: Não deixa deletar se houver produtos vinculados
  if (supplier._count && supplier._count.products > 0) {
    throw new AppError(
      `Não é possível remover este fornecedor pois existem ${supplier._count.products} produto(s) associado(s) a ele.`,
      400
    )
  }

  await prisma.supplier.delete({
    where: { id: supplierId },
  })

  return { message: 'Fornecedor removido com sucesso.' }
}