import {prisma} from '../lib/prisma'
import { AppError } from '../shared/AppError'
import type { CreateClinicTaskDTO, UpdateClinicTaskDTO } from '../types/task.types'
import type { TaskStatus } from '@prisma/client'

interface ListTasksFilters {
  status?: TaskStatus
  assignedToId?: string
}

export async function list(tenantId: string, clinicId: string, filters?: ListTasksFilters) {
  return prisma.clinicTask.findMany({
    where: {
      tenantId,
      clinicId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
    },
    include: {
      creator: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      patient: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function create(
  tenantId: string,
  clinicId: string,
  creatorId: string,
  data: CreateClinicTaskDTO
) {
  if (!data.title || data.title.trim() === '') {
    throw new AppError('O título da tarefa é obrigatório.', 400)
  }

  if (data.assignedToId) {
    const userExists = await prisma.user.findFirst({
      where: { id: data.assignedToId, tenantId, clinicId },
    })
    if (!userExists) {
      throw new AppError('Usuário atribuído não pertence a esta clínica.', 404)
    }
  }

  if (data.patientId) {
    const patientExists = await prisma.patient.findFirst({
      where: { id: data.patientId, tenantId, clinicId },
    })
    if (!patientExists) {
      throw new AppError('Paciente informado não encontrado.', 404)
    }
  }

  return prisma.clinicTask.create({
    data: {
      tenantId,
      clinicId,
      creatorId,
      assignedToId: data.assignedToId,
      patientId: data.patientId,
      title: data.title.trim(),
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true } },
    },
  })
}

export async function update(
  tenantId: string,
  clinicId: string,
  taskId: string,
  data: UpdateClinicTaskDTO
) {
  const task = await prisma.clinicTask.findFirst({
    where: { id: taskId, tenantId, clinicId },
  })

  if (!task) {
    throw new AppError('Tarefa não encontrada.', 404)
  }

  const isCompleting = data.status === 'COMPLETED' && task.status !== 'COMPLETED'

  return prisma.clinicTask.update({
    where: { id: taskId },
    data: {
      ...(data.title && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority && { priority: data.priority }),
      ...(data.status && { status: data.status }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      ...(data.patientId !== undefined && { patientId: data.patientId }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(isCompleting && { completedAt: new Date() }),
    },
  })
}

export async function deleteTask(
  tenantId: string,
  clinicId: string,
  taskId: string
) {
  const task = await prisma.clinicTask.findFirst({
    where: { id: taskId, tenantId, clinicId },
  })

  if (!task) {
    throw new AppError('Tarefa não encontrada.', 404)
  }

  await prisma.clinicTask.delete({ where: { id: taskId } })
}