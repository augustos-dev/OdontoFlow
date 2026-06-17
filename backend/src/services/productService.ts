import {prisma} from '../lib/prisma'
import { $Enums } from '@prisma/client'
import { AppError } from '../shared/AppError'
import type {
    CreateProductDTO,
    AdjustStockDTO,
    UpdateProductDTO,
    FilterProductDTO,
} from '../types/products.types'

//Create--------------------------------------------------------------------------------------------------

export async function createProductService(
    tenantId:string,
    clinicId:string,
    data: CreateProductDTO
) {
   const {name,quantity,minQuantity,supplierId,expiryDate} = data

   // valida fornecedor caso informado 

   if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
        where: {id :supplierId,tenantId,clinicId},
    })
    if (!supplier) {
        throw new AppError('Fornecedor nao encontrado',404)
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
        expiryDate: expiryDate ? new Date(expiryDate) : null,
    },

    include : {
        supplier: {select: {id:true, name: true} }
    },

   })
}

//lista --------------------------------------------------------------------------------------------------------


export async function listProductService(tenantId: string , clinicId:string ,filters:FilterProductDTO):Promise<void> {
    const {name,lowStock,supplierId,expiring,page = 1 ,limit = 20 } = filters

    const skip = (page-1) * limit

    // Alerta de vencimento de produtos vencendo em 30 dias 
}