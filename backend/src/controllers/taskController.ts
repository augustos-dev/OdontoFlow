import type { Request, Response, NextFunction } from 'express'
import * as taskService from '../services/taskService'
import type { CreateClinicTaskDTO, UpdateClinicTaskDTO } from '../types/task.types'
import type { AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'
import type { TaskStatus } from '@prisma/client'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

export async function listTasksController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { status, assignedToId } = req.query

    const tasks = await taskService.list(user.tenantId, user.clinicId, {
      status: status as TaskStatus | undefined,
      assignedToId: assignedToId as string | undefined,
    })

    res.status(200).json({ status: 'success', data: tasks })
  } catch (error) {
    next(error)
  }
}

export async function createTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const creatorId = user.userId || (user.sub as string)

    const task = await taskService.create(
      user.tenantId,
      user.clinicId,
      creatorId,
      req.body as CreateClinicTaskDTO
    )

    res.status(201).json({ status: 'success', data: task })
  } catch (error) {
    next(error)
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params

    const task = await taskService.update(
      user.tenantId,
      user.clinicId,
      id as string,
      req.body as UpdateClinicTaskDTO
    )

    res.status(200).json({ status: 'success', data: task })
  } catch (error) {
    next(error)
  }
}

export async function deleteTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params

    await taskService.deleteTask(user.tenantId, user.clinicId, id as string)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}