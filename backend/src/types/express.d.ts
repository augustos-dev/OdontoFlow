import { JwtPayload } from 'jsonwebtoken'
import { UserRole } from '@prisma/client'

export interface CustomJwtPayload extends JwtPayload {
  userId: string
  tenantId: string
  clinicId?: string
  role?: UserRole
  name?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload
    }
  }
}