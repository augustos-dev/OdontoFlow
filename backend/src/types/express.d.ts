import { JwtPayload } from 'jsonwebtoken'

export interface CustomJwtPayload extends JwtPayload {
  userId: string
  tenantId: string
  clinicId?: string
  role?: string
  name?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload
    }
  }
}