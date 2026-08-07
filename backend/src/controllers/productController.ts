import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import * as productService from '../services/productService';
import { auditLogService } from '../services/auditLog.service';
import {
  CreateProductDTO,
  UpdateProductDTO,
  FilterProductDTO,
  AdjustStockDTO,
} from '../types/products.types';

// Helper local para extrair os dados do usuário autenticado com tipagem segura
function getAuthUser(req: Request) {
  const user = req.user as any;
  return {
    tenantId: user.tenantId as string,
    clinicId: user.clinicId as string,
    userId: (user.id || user.sub || user.userId) as string,
    userName: user.name as string | undefined,
    userRole: user.role as UserRole,
  };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, userId, userName, userRole } = getAuthUser(req);
    const product = await productService.createProductService(
      tenantId,
      clinicId,
      req.body as CreateProductDTO
    );

    // 🛡️ Log de Auditoria
    auditLogService.createLog({
      tenantId,
      clinicId,
      userId,
      userName,
      userRole,
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: product.id,
      details: `Cadastrou o produto: ${product.name} | Lote: ${product.lotNumber || 'N/A'} | Qtd: ${product.quantity}`,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = getAuthUser(req);
    const filters: FilterProductDTO = {
      name: req.query.name as string,
      supplierId: req.query.supplierId as string,
      lotNumber: req.query.lotNumber as string, // 📦 Suporte a busca por lote
      lowStock: req.query.lowStock === 'true',
      expiring: req.query.expiring === 'true',
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await productService.listProductService(tenantId, clinicId, filters);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ─── Get By Id ───────────────────────────────────────────────────────────────

export async function productByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = getAuthUser(req);
    const { id } = req.params;
    const product = await productService.getProductByIdService(tenantId, clinicId, id as string);
    
    res.status(200).json(product); // 🟢 Status 200 para Leitura
  } catch (error) {
    next(error);
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, userId, userName, userRole } = getAuthUser(req);
    const { id } = req.params;
    const product = await productService.updateProductService(
      tenantId,
      clinicId,
      id as string,
      req.body as UpdateProductDTO
    );

    // 🛡️ Log de Auditoria
    auditLogService.createLog({
      tenantId,
      clinicId,
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'PRODUCT',
      entityId: id as string,
      details: `Atualizou os dados do produto: ${product.name}`,
    });

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

// ─── Adjust Stock ────────────────────────────────────────────────────────────

export async function adjustStockController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, userId, userName, userRole } = getAuthUser(req);
    const { id } = req.params;
    const body = req.body as AdjustStockDTO;
    
    const result = await productService.adjustStockService(tenantId, clinicId, id as string, body);

    // 🛡️ Log de Auditoria
    auditLogService.createLog({
      tenantId,
      clinicId,
      userId,
      userName,
      userRole,
      action: 'UPDATE',
      entity: 'PRODUCT',
      entityId: id as string,
      details: `Ajuste de estoque (${body.quantity > 0 ? '+' : ''}${body.quantity}): ${body.reason}`,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ─── Low Stock Alert ─────────────────────────────────────────────────────────

export async function lowStockController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = getAuthUser(req);
    const products = await productService.getLowStockAlertService(tenantId, clinicId);
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

// ─── Expiring Products ───────────────────────────────────────────────────────

export async function expringProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = getAuthUser(req);
    const products = await productService.getExpringProductsService(tenantId, clinicId);
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId, userId, userName, userRole } = getAuthUser(req);
    const { id } = req.params;
    
    await productService.deleteProductService(tenantId, clinicId, id as string);

    // 🛡️ Log de Auditoria
    auditLogService.createLog({
      tenantId,
      clinicId,
      userId,
      userName,
      userRole,
      action: 'DELETE',
      entity: 'PRODUCT',
      entityId: id as string,
      details: `Deletou o produto ID: ${id}`,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}