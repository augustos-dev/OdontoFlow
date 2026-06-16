export interface CreateProductDTO {
    name: string
    quantity: number
    minQuantity:number
    supplierId?:string
    expiryDate?: string 
}

export interface UpdateProductDTO {
    name?:string
    quantity?: number
    minQuantity?: number
    supplierId?:string
    expiryDate?:string
}

export interface AdjustStockDTO {
    quantity:number
    reason: string

}

export interface FilterProductDTO{
    name?:string
    supplierId?:string
    lowStock?: boolean
    expiring?:boolean
    page?:number
    limit?:number
}