import { UserRole } from '@prisma/client'

export { UserRole }

export interface CreateUserDTO {
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  cro?: string
  defaultCommissionPercentage?: number
}

export interface UpdateUserDTO {
  name?: string
  phone?: string
  cro?: string
  avatarUrl?: string
  defaultCommissionPercentage?: number
}

export interface UpdateUserRoleDTO {
  role: UserRole
}

export interface UpdateUserStatusDTO {
  isActive: boolean
}

export interface ChangePasswordDTO {
  currentPassword: string
  newPassword: string
}

export interface UserFiltersDTO {
  name?: string
  role?: UserRole
  isActive?: boolean
  page?: number
  limit?: number
}

export interface UserResponseDTO {
  id: string
  tenantId: string
  clinicId: string
  name: string
  email: string
  role: UserRole
  phone: string | null
  cro: string | null
  avatarUrl: string | null
  isActive: boolean
  failedLoginAttempts: number
  lockedUntil: Date | null
  lastLoginAt: Date | null
  defaultCommissionPercentage?: number | null
  createdAt: Date
  updatedAt: Date
  dentistProfile?: {
    id: string
    specialties: string[]
    bio?: string | null
    defaultRoom: string
    croState?: string | null
    slotDurationMin: number
  } | null
}

export interface UserLockoutStatusDTO {
  failedLoginAttempts: number
  lockedUntil: Date | null
  isLocked: boolean
}