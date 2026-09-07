import { UserRole } from './user.types'

export type SystemModule =
  | 'DASHBOARD'
  | 'AGENDA'
  | 'PATIENTS'
  | 'RECORDS'
  | 'STOCK'
  | 'FINANCIAL'
  | 'PROCEDURES'
  | 'SUPPLIERS'
  | 'SETTINGS'
  | 'REPORTS'

export interface RolePermission {
  id: string
  tenantId: string
  role: UserRole
  module: SystemModule
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface UpdateRolePermissionDTO {
  module: SystemModule
  canRead?: boolean
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export interface BulkUpdateRolePermissionsDTO {
  role: UserRole
  permissions: UpdateRolePermissionDTO[]
}