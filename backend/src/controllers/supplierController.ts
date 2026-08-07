import { Request, Response, NextFunction } from 'express'
import * as supplierService from '../services/supplierService'
import {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  ListSuppliersQueryDTO,
} from '../types/supplier.types'

// =============================================================================
// 1. CRIAR FORNECEDOR (POST /api/suppliers)
// =============================================================================
export async function createSupplierController(
  req: Request<{}, {}, CreateSupplierDTO>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const supplierData = req.body

    const supplier = await supplierService.createSupplier(
      tenantId,
      clinicId,
      supplierData
    )

    res.status(201).json(supplier)
  } catch (error) {
    next(error)
  }
}

// =============================================================================
// 2. LISTAR FORNECEDORES (GET /api/suppliers)
// =============================================================================
export async function listSuppliersController(
  req: Request<{}, {}, {}, ListSuppliersQueryDTO>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const query = req.query

    const result = await supplierService.listSuppliers(
      tenantId,
      clinicId,
      query
    )

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// =============================================================================
// 3. BUSCAR FORNECEDOR POR ID (GET /api/suppliers/:id)
// =============================================================================
export async function getSupplierByIdController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params

    const supplier = await supplierService.getSupplierById(
      tenantId,
      clinicId,
      id
    )

    res.status(200).json(supplier)
  } catch (error) {
    next(error)
  }
}

// =============================================================================
// 4. ATUALIZAR FORNECEDOR (PUT /api/suppliers/:id)
// =============================================================================
export async function updateSupplierController(
  req: Request<{ id: string }, {}, UpdateSupplierDTO>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const updateData = req.body

    const supplier = await supplierService.updateSupplier(
      tenantId,
      clinicId,
      id,
      updateData
    )

    res.status(200).json(supplier)
  } catch (error) {
    next(error)
  }
}

// =============================================================================
// 5. DELETAR FORNECEDOR (DELETE /api/suppliers/:id)
// =============================================================================
export async function deleteSupplierController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params

    const result = await supplierService.deleteSupplier(
      tenantId,
      clinicId,
      id
    )

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}