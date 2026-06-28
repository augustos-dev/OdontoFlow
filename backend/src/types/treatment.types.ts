export interface PlanProcedureItemDTO {
  procedureId: string
  quantity: number
  actualPrice: number // preço cobrado de fato (pode ter desconto sobre o basePrice)
}

export interface CreateTreatmentPlanDTO {
  patientId: string
  dentistId: string
  title: string
  notes?: string
  procedures: PlanProcedureItemDTO[] // itens do orçamento
}

export interface UpdateTreatmentPlanDTO {
  title?: string
  notes?: string
  procedures?: PlanProcedureItemDTO[] // se informado, substitui todos os itens
}

export interface UpdateTreatmentPlanStatusDTO {
  status: 'ORCAMENTO' | 'APROVADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'RECUSADO'
}

export interface TreatmentPlanFiltersDTO {
  patientId?: string
  dentistId?: string
  status?: string
  page?: number
  limit?: number
}