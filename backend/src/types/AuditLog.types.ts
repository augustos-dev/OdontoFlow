import { AuditAction, UserRole } from '@prisma/client';

export interface CreateAuditLogInput {
  tenantId: string;
  clinicId: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  action: AuditAction;
  entity: string; // Ex: "PRODUCT", "APPOINTMENT", "EVOLUTION", "MEDICAL_FILE"
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}