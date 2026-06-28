

export interface DashboardSummaryDTO {
  patients: {
    total: number
    newThisMonth: number
  }
  appointments: {
    today: number
    thisWeek: number
    thisMonth: number
    byStatus: Record<string, number>
  }
  financial: {
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    monthExpenses: number
    monthProfit: number
  }
  inventory: {
    lowStockCount: number
    expiringCount: number
  }
}

export interface DashboardPeriodFiltersDTO {
  startDate?: string
  endDate?: string
}