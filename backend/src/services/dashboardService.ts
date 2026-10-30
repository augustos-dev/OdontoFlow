

import { prisma } from '../lib/prisma'
import type { DashboardPeriodFiltersDTO } from '../types/dashboard.types'

// ─── Helpers de data ───────────────────────────────────────────────────────────

function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = domingo
  d.setDate(d.getDate() - day)
  return getStartOfDay(d)
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

// ─── Summary — Visão geral consolidada (hoje, semana, mês) ───────────────────

export interface DashboardScope {
  /** true = rede inteira (somente OWNER; o controller valida). Padrão: só a unidade ativa. */
  network?: boolean
}

const baseWhere = (tenantId: string, clinicId: string, scope: DashboardScope) =>
  scope.network ? { tenantId } : { tenantId, clinicId }

export async function getDashboardSummary(tenantId: string, clinicId: string, scope: DashboardScope = {}) {
  const base = baseWhere(tenantId, clinicId, scope)
  const now = new Date()
  const startOfDay = getStartOfDay(now)
  const endOfDay = getEndOfDay(now)
  const startOfWeek = getStartOfWeek(now)
  const startOfMonth = getStartOfMonth(now)
  const endOfMonth = getEndOfMonth(now)

  const [
    totalPatients,
    newPatientsThisMonth,
    appointmentsToday,
    appointmentsThisWeek,
    appointmentsThisMonth,
    appointmentsByStatus,
    revenueToday,
    revenueWeek,
    revenueMonth,
    expensesMonth,
    lowStockProducts,
    expiringProducts,
  ] = await Promise.all([
    // Pacientes
    prisma.patient.count({ where: { ...base, deletedAt: null } }),
    prisma.patient.count({
      where: { ...base, deletedAt: null, createdAt: { gte: startOfMonth } },
    }),

    // Agendamentos
    prisma.appointment.count({
      where: { ...base, dateTime: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.appointment.count({
      where: { ...base, dateTime: { gte: startOfWeek } },
    }),
    prisma.appointment.count({
      where: { ...base, dateTime: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { ...base, dateTime: { gte: startOfMonth, lte: endOfMonth } },
      _count: true,
    }),

    // Financeiro
    prisma.transaction.aggregate({
      where: { ...base, type: 'RECEITA', paidAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...base, type: 'RECEITA', paidAt: { gte: startOfWeek } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...base, type: 'RECEITA', paidAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...base, type: 'DESPESA', paidAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),

    // Estoque baixo: comparação coluna x coluna feita no banco (antes carregava todos os produtos em memória)
    prisma.product.count({ where: { ...base, quantity: { lte: prisma.product.fields.minQuantity } } }),
    prisma.product.findMany({
      where: {
        ...base,
        expiryDate: { not: null, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), gte: now },
      },
    }),
  ])

  const monthRevenue = Number(revenueMonth._sum.amount ?? 0)
  const monthExpenses = Number(expensesMonth._sum.amount ?? 0)

  const byStatus: Record<string, number> = {}
  for (const item of appointmentsByStatus) {
    byStatus[item.status] = item._count
  }

  return {
    patients: {
      total: totalPatients,
      newThisMonth: newPatientsThisMonth,
    },
    appointments: {
      today: appointmentsToday,
      thisWeek: appointmentsThisWeek,
      thisMonth: appointmentsThisMonth,
      byStatus,
    },
    financial: {
      todayRevenue: Number(revenueToday._sum.amount ?? 0),
      weekRevenue: Number(revenueWeek._sum.amount ?? 0),
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
    },
    inventory: {
      lowStockCount: lowStockProducts,
      expiringCount: expiringProducts.length,
    },
  }
}

// ─── Revenue Chart — Receita diária para gráfico no período informado ───────

export async function getRevenueChart(
  tenantId: string,
  clinicId: string,
  filters: DashboardPeriodFiltersDTO,
  scope: DashboardScope = {}
) {
  const base = baseWhere(tenantId, clinicId, scope)
  const startDate = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : getStartOfMonth(new Date())
  const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : getEndOfMonth(new Date())

  const transactions = await prisma.transaction.findMany({
    where: {
      ...base,
      paidAt: { gte: startDate, lte: endDate },
    },
    select: { paidAt: true, amount: true, type: true },
    orderBy: { paidAt: 'asc' },
  })

  // Agrupa por dia (YYYY-MM-DD)
  const grouped: Record<string, { receitas: number; despesas: number }> = {}

  for (const tx of transactions) {
    const day = tx.paidAt.toISOString().slice(0, 10)
    if (!grouped[day]) grouped[day] = { receitas: 0, despesas: 0 }

    if (tx.type === 'RECEITA') {
      grouped[day].receitas += Number(tx.amount)
    } else {
      grouped[day].despesas += Number(tx.amount)
    }
  }

  return Object.entries(grouped).map(([date, values]) => ({
    date,
    receitas: values.receitas,
    despesas: values.despesas,
    lucro: values.receitas - values.despesas,
  }))
}

// ─── Upcoming Appointments — Próximos agendamentos (widget rápido) ───────────

export async function getUpcomingAppointments(tenantId: string, clinicId: string, scope: DashboardScope = {}) {
  const base = baseWhere(tenantId, clinicId, scope)
  const now = new Date()

  return prisma.appointment.findMany({
    where: {
      ...base,
      dateTime: { gte: now },
      status: { in: ['AGENDADO', 'CONFIRMADO'] },
    },
    take: 10,
    orderBy: { dateTime: 'asc' },
    include: {
      clinic: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true, phone: true } },
      dentist: { select: { id: true, name: true } },
    },
  })
}

// ─── Top Dentists — Ranking por número de atendimentos finalizados no mês ────

export async function getTopDentists(tenantId: string, clinicId: string, scope: DashboardScope = {}) {
  const base = baseWhere(tenantId, clinicId, scope)
  const startOfMonth = getStartOfMonth(new Date())
  const endOfMonth = getEndOfMonth(new Date())

  const grouped = await prisma.appointment.groupBy({
    by: ['dentistId'],
    where: {
      ...base,
      status: 'FINALIZADO',
      dateTime: { gte: startOfMonth, lte: endOfMonth },
    },
    _count: true,
    orderBy: { _count: { dentistId: 'desc' } },
    take: 5,
  })

  const dentistIds = grouped.map((g) => g.dentistId)
  const dentists = await prisma.user.findMany({
    where: { id: { in: dentistIds } },
    select: { id: true, name: true, cro: true },
  })

  return grouped.map((g) => {
    const dentist = dentists.find((d) => d.id === g.dentistId)
    return {
      dentistId: g.dentistId,
      name: dentist?.name ?? 'Desconhecido',
      cro: dentist?.cro ?? null,
      appointmentsCount: g._count,
    }
  })
}

// ─── Comparativo entre unidades (OWNER) — mês corrente ───────────────────────

export async function getClinicsBreakdown(tenantId: string) {
  const now = new Date()
  const start = getStartOfMonth(now)
  const end = getEndOfMonth(now)

  const [clinics, revenue, expenses, finalized, newPatients, appointments] = await Promise.all([
    prisma.clinic.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.transaction.groupBy({
      by: ['clinicId'],
      where: { tenantId, type: 'RECEITA', paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['clinicId'],
      where: { tenantId, type: 'DESPESA', paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.appointment.groupBy({
      by: ['clinicId'],
      where: { tenantId, status: 'FINALIZADO', dateTime: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.patient.groupBy({
      by: ['clinicId'],
      where: { tenantId, deletedAt: null, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ['clinicId'],
      where: { tenantId, dateTime: { gte: start, lte: end } },
      _count: true,
    }),
  ])

  const sum = (rows: Array<{ clinicId: string; _sum: { amount: unknown } }>, id: string) =>
    Number((rows.find((r) => r.clinicId === id)?._sum.amount as number | null | undefined) ?? 0)
  const count = (rows: Array<{ clinicId: string; _count: number }>, id: string) =>
    rows.find((r) => r.clinicId === id)?._count ?? 0

  return clinics.map((c) => {
    const monthRevenue = sum(revenue, c.id)
    const monthExpenses = sum(expenses, c.id)
    return {
      clinicId: c.id,
      name: c.name,
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
      appointmentsThisMonth: count(appointments, c.id),
      appointmentsFinalizedThisMonth: count(finalized, c.id),
      newPatientsThisMonth: count(newPatients, c.id),
    }
  })
}
