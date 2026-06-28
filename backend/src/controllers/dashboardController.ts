

import type { Request, Response, NextFunction } from 'express'
import * as dashboardService from '../services/dashboardService'
import type { DashboardPeriodFiltersDTO } from '../types/dashboard.types'

export async function getDashboardSummaryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const summary = await dashboardService.getDashboardSummary(tenantId, clinicId)
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
    const chart = await dashboardService.getRevenueChart(tenantId, clinicId, filters)
    res.status(200).json(chart)
  } catch (error) {
    next(error)
  }
}

export async function getUpcomingAppointmentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const appointments = await dashboardService.getUpcomingAppointments(tenantId, clinicId)
    res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

export async function getTopDentistsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const dentists = await dashboardService.getTopDentists(tenantId, clinicId)
    res.status(200).json(dentists)
  } catch (error) {
    next(error)
  }
}