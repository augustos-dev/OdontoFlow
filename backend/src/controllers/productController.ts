import { Request, Response, NextFunction } from "express";
import * as productService from '../services/productService'
import {
    CreateProductDTO,
    UpdateProductDTO,
    FilterProductDTO,
    AdjustStockDTO,
} from '../types/products.types'

export async function  createProductController(req:Request,res:Response,next:NextFunction): Promise<void> {
    try {
        const {tenantId,clinicId} = req.user!
        const product = await productService.createProductService(tenantId,clinicId,req.body as CreateProductDTO)
        res.status(201).json(product)

    } catch (error) {
        next(error)
    }
}

export async function listProductController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId} = req.user!
        const filters: FilterProductDTO = {
            name: req.query.name as string,
            supplierId: req.query.supplierId as string,
            lowStock: req.query.lowStock === 'true',
            expiring: req.query.expiring ===  'true',
            page: req.query.page ? Number(req.query.page): undefined,
            limit: req.query.limit ? Number(req.query.limit): undefined,
        }

        const result = await productService.listProductService(tenantId,clinicId,filters)
        res.status(200).json(result)
    } catch (error) {
        next(error)
    }
}

export async function PatientByIdController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId} =req.user!
        const  {id} = req.params
        const product = await productService.getProductByIdService(tenantId,clinicId,id as string)
        res.status(201).json(product)

    } catch (error) {
        next(error)
    } 
}

export async function updateProductController(req:Request,res:Response,next:NextFunction):Promise<void> {
    try {
        const {tenantId,clinicId} = req.user! 
        const {id} = req.params
        const product  = await productService.updateProductService(tenantId,clinicId,id as string, req.body as UpdateProductDTO)
        res.status(200).json(product)
         
    } catch (error) {
        next(error)
    }
}