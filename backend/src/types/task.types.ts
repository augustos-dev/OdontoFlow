import { TaskPriority, TaskStatus } from '@prisma/client'

export interface ClinicTaskDTO {
  id: string
  tenantId: string
  clinicId: string
  creatorId: string
  assignedToId?: string | null
  patientId?: string | null
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  creator?: {
    id: string
    name: string
  }
  assignedTo?: {
    id: string
    name: string
    avatarUrl?: string | null
  } | null
  patient?: {
    id: string
    name: string
    phone: string
  } | null
}

export interface CreateClinicTaskDTO {
  title: string
  description?: string
  priority?: TaskPriority
  assignedToId?: string
  patientId?: string
  dueDate?: string | Date
}

export interface UpdateClinicTaskDTO {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  assignedToId?: string | null
  patientId?: string | null
  dueDate?: string | Date | null
}