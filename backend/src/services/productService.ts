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
