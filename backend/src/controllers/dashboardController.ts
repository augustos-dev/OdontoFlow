

import type { Request, Response, NextFunction } from 'express'
import * as dashboardService from '../services/dashboardService'
import type { DashboardPeriodFiltersDTO } from '../types/dashboard.types'
import { AppError } from '../shared/AppError'

// ?scope=network = visão consolidada da rede (somente OWNER). Padrão: unidade ativa.
function scopeOf(req: Request): dashboardService.DashboardScope {
  if (req.query.scope !== 'network') return {}
  if (req.user!.role !== 'OWNER') {
    throw new AppError('A visão consolidada da rede é exclusiva do dono da rede.', 403)
  }
  return { network: true }
}

export async function getDashboardSummaryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const summary = await dashboardService.getDashboardSummary(tenantId, clinicId, scopeOf(req))
    res.status(200).json(summary)
  } catch (error) {
    next(error)
  }
}

export async function getRevenueChartController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: DashboardPeriodFiltersDTO = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    }
    const chart = await dashboardService.getRevenueChart(tenantId, clinicId, filters, scopeOf(req))
    res.status(200).json(chart)
  } catch (error) {
    next(error)
  }
}

export async function getUpcomingAppointmentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const appointments = await dashboardService.getUpcomingAppointments(tenantId, clinicId, scopeOf(req))
    res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

export async function getTopDentistsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const dentists = await dashboardService.getTopDentists(tenantId, clinicId, scopeOf(req))
    res.status(200).json(dentists)
  } catch (error) {
    next(error)
  }
}
// GET /dashboard/clinics-breakdown → comparativo entre unidades no mês (OWNER)
export async function getClinicsBreakdownController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.role !== 'OWNER') {
      throw new AppError('O comparativo entre unidades é exclusivo do dono da rede.', 403)
    }
    const result = await dashboardService.getClinicsBreakdown(req.user!.tenantId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
