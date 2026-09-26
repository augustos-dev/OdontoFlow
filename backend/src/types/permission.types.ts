// backend/src/types/permission.types.ts

import { SystemModule, UserRole } from '@prisma/client'

export { SystemModule, UserRole }

export type PermissionAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'

// =============================================================================
// ENTIDADE / RETORNO DO BANCO
// =============================================================================

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
  createdAt: Date | string
  updatedAt: Date | string
}

// =============================================================================
// DTOs DE ATUALIZAÇÃO
// =============================================================================

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

// =============================================================================
// MAPAS & HELPERS DE CONSUMO NO FRONT/BACK
// =============================================================================

export type ModulePermissionFlags = {
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface RolePermissionsMapDTO {
  role: UserRole
  clinicId?: string | null
  modules: Record<SystemModule, ModulePermissionFlags>
}

// DTO para verificação pontual (ex: Guards / Middlewares)
export interface CheckPermissionDTO {
  userId: string
  role: UserRole
  module: SystemModule
  action: PermissionAction
  clinicId?: string
}