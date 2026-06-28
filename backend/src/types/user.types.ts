

export interface CreateUserDTO {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'DENTIST' | 'SECRETARY'
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
  role: 'ADMIN' | 'DENTIST' | 'SECRETARY'
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
  role?: 'ADMIN' | 'DENTIST' | 'SECRETARY'
  isActive?: boolean
  page?: number
  limit?: number
}