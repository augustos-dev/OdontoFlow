
export interface CreateProductDTO {
    id: string
    tenantId: string
    clinicId : string
    supplierId?:string | null
    name: string
    quantity: number
    minQuantity?: number
    expiryDate?: Date
}

export interface UpdateProductDTO{
    tenantId?:string
    clinicId?:string
    supplierID?: string 
    name?: string
    quntity?:number
    minQuantity?:number
    expiryDate?:Date
}

export interface ProductResposeDTO {
    id:string
    tenantId: string
    clinicId:string
    supplierId?:string | null
    name: string
    quantity:number
    minQuantity:number
    expiryDate?: Date | null
    createdAt: Date
    updatedAt:Date
}

export interface  FilterProductDTO {
    tenantId?: string
    clinicId?:string
    supplierId?:string
    name?:string
    page?: number
    limit?: number
    stockStatus?: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK'
}

