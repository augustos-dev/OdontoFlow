import type { Request, Response, NextFunction } from 'express'
import * as appointmentService from '../services/appointmentService'
import type { UserRole } from '@prisma/client'
import type { CustomJwtPayload } from '../types/express'
import type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  AppointmentFiltersDTO,
} from '../types/appointment.types'

// Helper para extrair o ActorContext com fallback seguro de campos do Token
function extractActor(req: Request) {
  const user = req.user as CustomJwtPayload
  return {
    userId: user.userId || (user as any).sub || (user as any).id,
    userName: (user as any).name || 'Usuário',
    userRole: (user.role as UserRole) || 'SECRETARY',
  }
}

// ─── 1. CRIAR AGENDAMENTO ───────────────────────────────────────────────────
export async function createAppointmentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const actor = extractActor(req)

    const appointment = await appointmentService.createAppointment(
      user.tenantId,
      user.clinicId!,
      req.body as CreateAppointmentDTO,
      actor
    )

    res.status(201).json(appointment)
  } catch (error) {
    next(error)
  }
}

// ─── 2. LISTAR AGENDAMENTOS (COM FILTROS E PROCEDURES) ────────────────────────
export async function listAppointmentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload

    const filters: AppointmentFiltersDTO = {
      date: req.query.date as string,
      dentistId: req.query.dentistId as string,
      patientId: req.query.patientId as string,
      procedureId: req.query.procedureId as string,
      status: req.query.status as string,
      room: req.query.room as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }

    const result = await appointmentService.listAppointments(
      user.tenantId,
      user.clinicId!,
      filters
    )

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// ─── 3. BUSCAR AGENDAMENTO POR ID ───────────────────────────────────────────
export async function getAppointmentByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params

    const appointment = await appointmentService.getAppointmentById(
      user.tenantId,
      user.clinicId!,
      id as string
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

// ─── 4. EDITAR AGENDAMENTO ──────────────────────────────────────────────────
export async function updateAppointmentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    const appointment = await appointmentService.updateAppointment(
      user.tenantId,
      user.clinicId!,
      id as string,
      req.body as UpdateAppointmentDTO,
      actor
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

// ─── 5. ALTERAR STATUS DO AGENDAMENTO (DISPARA EXIT INTELIGENTE) ──────────────
export async function updateAppointmentStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    const appointment = await appointmentService.updateAppointmentStatus(
      user.tenantId,
      user.clinicId!,
      id as string,
      req.body as UpdateAppointmentStatusDTO,
      actor
    )

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

// ─── 6. DELETAR AGENDAMENTO ────────────────────────────────────────────────
export async function deleteAppointmentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload
    const { id } = req.params
    const actor = extractActor(req)

    await appointmentService.deleteAppointment(
      user.tenantId,
      user.clinicId!,
      id as string,
      actor
    )

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}