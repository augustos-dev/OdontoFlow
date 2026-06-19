import {prisma} from '../lib/prisma'
import { $Enums, Prisma } from '@prisma/client'
import { AppError } from '../shared/AppError'
import type {
    CreateProductDTO,
    AdjustStockDTO,
    UpdateProductDTO,
    FilterProductDTO,
} from '../types/products.types'
import { get } from 'node:http'
//helpers

function getStockStatus(quantity: number, minQuantity: number): 'CRITICO' | 'BAIXO' | 'OK' {
  if (quantity === 0) return 'CRITICO'
  if (quantity <= minQuantity) return 'BAIXO'
  return 'OK'
}

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


export async function listProductService(tenantId: string , clinicId:string ,filters:FilterProductDTO):Promise <any> {
    const {name,lowStock,supplierId,expiring,page = 1 ,limit = 20 } = filters

    const skip = (page-1) * limit

    // Alerta de vencimento de produtos vencendo em 30 dias 
    const vencendoEmTrintaDias = new Date() 
    vencendoEmTrintaDias.setDate(vencendoEmTrintaDias.getDate() + 30)

    const where : Prisma.ProductWhereInput = {
        tenantId,
        clinicId,
        ...(name && {name: {contains: name, mode:'insensitive'}}),
        ...(supplierId && {supplierId}),
        // Filtro de semafaro para disparado de estoque critico (quantity <= minQuantity)
        ...(lowStock &&{
            quantity : {lte: prisma.product.fields.minQuantity},
        }),
        // filtro vencendo em 30 dias 
        ...(expiring && {
            expiryDate : {
                not: null,
                lte: vencendoEmTrintaDias,
                gte: new Date()
            },
        }),
    }


    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take:limit,
            orderBy: {name: 'asc'},
            include: {
                supplier: {select: {id: true, name: true}},
            },
        }),
        prisma.product.count({where}),
    ])

    //enriquece cada produto com o status do semafaro do estoque 

    const data = products.map((product) => ({
        ...product,
        stockStatus:getStockStatus(product.quantity, product.minQuantity),
        isExpiringSoon: 
            product.expiryDate !== null && product.expiryDate <= vencendoEmTrintaDias,
    })) as any[]

    return {
        data,
        meta:{
            total,
            page,
            limit,
            totaPages:Math.ceil(total/limit)
        },
    }

}

// get by id -----------------------------------------------
export async function getProductByIdService(tenantId: string,clinicId: string, productId:string) {
    const product = await prisma.product.findFirst({
        where: {id: productId,tenantId,clinicId},
        include: {
            supplier:{select:{id:true,name:true,phone:true,email:true}},
        }
    })
    if(!product) {
        throw new AppError('Produto nao encontrado', 404)
    }

    return {
        ...product,
        stockStatus:getStockStatus(product.quantity, product.minQuantity)
    }
}

// Update ---------------------------------------------------------

export async function updateProductService(tenantId:string,clinicId:string, productId:string,data:UpdateProductDTO){
    const product = await prisma.product.findFirst({
        where: {id:productId,tenantId,clinicId}
    })

    if(!product) {
        throw new AppError('Produto nao encontrado', 404)
    }
    if(data.supplierId) {
        const supplier = await prisma.supplier.findFirst({
            where: {id: data.supplierId, tenantId, clinicId},
        })
        if (!supplier) {
            throw new AppError('Fornecedor nao encontrado', 404)
        }

        return prisma.product.update({
            where: {id:productId},
            data: {
                ...data,
                expiryDate:data.expiryDate ? new Date(data.expiryDate) : undefined,
            },
            include: {
                supplier : {select:{id: true, name: true}},
            },
        })

    }


}

/// ajuste de stock ----------------------------
 export async function adjustStockService(tenantId:string,clinicId:string,productId:string, data: AdjustStockDTO) {
    const product = await prisma.product.findFirst({
        where:{id: productId,tenantId,clinicId},
    })

    if(!product) {
        throw new AppError('Produto nao encontrado', 404)
    }

    const newQuantity = product.quantity + data.quantity 

    // nao permite estoque negativo 

    if(newQuantity < 0) {
        throw new AppError(
            `Estoque insuficiente. Disponvel: ${product.quantity} unidade(s).`,
            400
        )
    }

    const updated = await prisma.product.update({
        where:{id: productId},
        data: {
            quantity: newQuantity
        },
        include:{
            supplier:{select:{id:true,name:true}},
        },
    })

    return {
        ...updated,
        stockStatus:getStockStatus(updated.quantity, updated.minQuantity),
        adjustment:{
            previous: product.quantity,
            change: data.quantity,
            current: newQuantity,
            reason: data.reason
        },
    }

 }

 // estoque baixo low stcok alert -------------------

 export async function getLowStockAlertService(tenantId:string,clinicId:string) {
    const products = await prisma.product.findMany({
        where:{tenantId,clinicId},
        include: {
            supplier:{select:{id:true,name:true, phone: true}}
        },
        orderBy:{
            quantity:'asc'
        }
    })

    // flitra manualmentte para comparar campos da mesma linha

    const lowStock = products.filter((p)=> p.quantity <= p.quantity)

    return lowStock.map((p) => ({
        ...p,
        stockStatus: getStockStatus(p.quantity, p.minQuantity,)
    }))
 }


 // expirando --- expiring

 export async function getExpringProductsService(tenantId:string,clinicId:string) {
    const vencendoEmTrintaDias = new Date()
    vencendoEmTrintaDias.setDate(vencendoEmTrintaDias.getDate() + 30)

    const products = await prisma.product.findMany({
        where:{
            tenantId,
            clinicId,
            expiryDate: {
                not: null,
                lte: vencendoEmTrintaDias,
                gte: new Date()
            },
        },
        include:{
            supplier:{select: {id:true, name: true, phone:true}}
        },
        orderBy: {
            expiryDate:'asc'
        }
    })

    return products.map((p) => ({
        ...p,
        daysUntilExpiry: Math.ceil(
            (p.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
    }))
 }

 // delete ------------------------------

 export async function deleteProductService(tenantId:string,clinicId:string,productId:string) {
    const product = await prisma.product.findFirst({
        where:{id:productId,tenantId,clinicId}
    })

     if (!product) {
        throw new AppError('Produto não encontrado.', 404)
     }

    if (product.quantity > 0) {
        throw new AppError(
            'nao e possivel deletar um produto com quantidade acima de zero. zere antes de  deletar', 400
        )
    }

    await prisma.product.delete({
        where:{id:productId}
    })

 }