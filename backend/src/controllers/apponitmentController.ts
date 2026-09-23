import type { Request, Response, NextFunction } from 'express'
import * as appointmentService from '../services/appointmentService'
import { getSessionUser } from '../middlewares/authMiddlewares'
import type { UserRole } from '@prisma/client'
import type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  AppointmentFiltersDTO,
} from '../types/appointment.types'

function extractActor(req: Request) {
  const user = getSessionUser(req)
  return {
    userId: user.userId || (user.sub as string),
    userName: user.name || 'Utilizador',
    userRole: (user.role as UserRole) || 'SECRETARY',
  }
}

export async function createAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const actor = extractActor(req)

    const appointment = await appointmentService.createAppointment(
      user.tenantId,
      user.clinicId,
      req.body as CreateAppointmentDTO,
      actor
    )

    res.status(201).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function listAppointmentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)

    const filters: AppointmentFiltersDTO = {
      date: req.query.date as string | undefined,
      dentistId: req.query.dentistId as string | undefined,
      patientId: req.query.patientId as string | undefined,
      procedureId: req.query.procedureId as string | undefined,
      status: req.query.status as any,
      room: req.query.room as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }

    const result = await appointmentService.listAppointments(
      user.tenantId,
      user.clinicId,
      filters
    )

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getAppointmentByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params

    const appointment = await appointmentService.getAppointmentById(
      user.tenantId,
      user.clinicId,
      id as string
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function updateAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = extractActor(req)

    const appointment = await appointmentService.updateAppointment(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateAppointmentDTO,
      actor
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function updateAppointmentStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = extractActor(req)

    const appointment = await appointmentService.updateAppointmentStatus(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateAppointmentStatusDTO,
      actor
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export async function deleteAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const actor = extractActor(req)

    await appointmentService.deleteAppointment(
      user.tenantId,
      user.clinicId,
      id as string,
      actor
    )

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}