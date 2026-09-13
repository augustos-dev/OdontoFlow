// backend/src/types/permission.types.ts

import { SystemModule, UserRole } from '@prisma/client'

export { SystemModule, UserRole }

export type PermissionAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'

export interface RolePermissionDTO {
  id: string
  tenantId: string
  clinicId?: string | null
  role: UserRole
  module: SystemModule
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UpdateModulePermissionDTO {
  module: SystemModule
  canRead?: boolean
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export interface BulkUpdateRolePermissionsDTO {
  role: UserRole
  clinicId?: string | null
  permissions: UpdateModulePermissionDTO[]
}

export interface RolePermissionsMapDTO {
  role: UserRole
  clinicId?: string | null
  modules: Record<
    SystemModule,
    {
      canRead: boolean
      canCreate: boolean
      canUpdate: boolean
      canDelete: boolean
    }
  >
}