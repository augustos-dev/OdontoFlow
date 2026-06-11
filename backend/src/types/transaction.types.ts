
export interface CreateTransactionDTO {
    type:'RECEITA' | 'DESPESA'
    amount : number
    paymentMethod: 'PIX'| 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'CONVENIO'
    description?: string
    category?:string
    appointmentId?:string
    paidAt?:string

}

export interface UpdateTransactionDTO {
    amount?: number
    paymentMethod?: 'PIX'| 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'CONVENIO'
    description?: string
    category?:string
    paidAt?:string

}

export interface TransactionFiltersDTO {
    type?: 'RECEITA' | 'DESPESA'
    paymentMethod?: string
    category?:string
    startDate?: string
    endDate?: string
    page?:number
    limit?:number
}

export interface TransactionReportDTO {
    startDate:string
    endDate: string
}