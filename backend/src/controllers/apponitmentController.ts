// backend/src/controllers/appointment.controller.ts

import type { Request, Response, NextFunction } from 'express'
import * as appointmentService from '../services/appointmentService'
import type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  AppointmentFiltersDTO,
} from '../types/appointment.types'

export async function createAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const appointment = await appointmentService.createAppointment(tenantId, clinicId, req.body as CreateAppointmentDTO)
    res.status(201).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function listAppointmentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const filters: AppointmentFiltersDTO = {
      date: req.query.date as string,
      dentistId: req.query.dentistId as string,
      patientId: req.query.patientId as string,
      status: req.query.status as string,
      room: req.query.room as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }
    const result = await appointmentService.listAppointments(tenantId, clinicId, filters)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getAppointmentByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const appointment = await appointmentService.getAppointmentById(tenantId, clinicId, id as string)
    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function updateAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const appointment = await appointmentService.updateAppointment(tenantId, clinicId, id as string, req.body as UpdateAppointmentDTO)
    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function updateAppointmentStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    const appointment = await appointmentService.updateAppointmentStatus(tenantId, clinicId, id as string, req.body as UpdateAppointmentStatusDTO)
    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function deleteAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tenantId, clinicId } = req.user!
    const { id } = req.params
    await appointmentService.deleteAppointment(tenantId, clinicId, id as string)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}