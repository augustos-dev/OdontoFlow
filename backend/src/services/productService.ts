import {prisma} from '../lib/prisma'
import { $Enums } from '@prisma/client'
import { AppError } from '../shared/AppError'
import type {
    CreateProductDTO,
    ProductResposeDTO,
    UpdateProductDTO,
    FilterProductDTO,
} from '../types/products.types'

//Create--------------------------------------------------------------------------------------------------

export async function createProductService(
    tenantId:string,
    clinicId:string,
    data: CreateProductDTO
) {
   const existingProduct = await prisma.product.findFirst({
    where:{
        name: data.name,
        clinicId:clinicId,
        tenantId: tenantId
    }

   })

   if (existingProduct) {
    throw new AppError('Ja existe um produto cadastrado com esse nome',400)
   }

   const product = await prisma.product.create({
    data: {
        ...data,
        tenantId,
        clinicId,
    },
  })

  return product
}