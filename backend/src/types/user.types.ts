// backend/src/types/user.types.ts

export type UserRole = 'ADMIN' | 'DENTIST' | 'SECRETARY'

export interface CreateUserDTO {
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  cro?: string
}

export interface UpdateUserDTO {
  name?: string
  phone?: string
  cro?: string
  avatarUrl?: string
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