import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import type { RegisterDTO, LoginDTO, SwitchClinicDTO } from '../types/auth.types'

// Cadastro de colaborador. A rota exige ADMIN/OWNER autenticado.
// tenantId SEMPRE vem do token (antes vinha do body: qualquer pessoa criava usuário em qualquer tenant).
// Só o OWNER escolhe a unidade; os demais criam na própria unidade.
export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.user!
    const body = (req.body || {}) as Partial<RegisterDTO>
    const clinicId = actor.role === 'OWNER' && body.clinicId ? body.clinicId : actor.clinicId

    const result = await authService.register({
      ...(body as RegisterDTO),
      tenantId: actor.tenantId,
      clinicId,
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body as LoginDTO)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function getMeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, tenantId, clinicId } = req.user!
    const user = await authService.getMe(userId, tenantId, clinicId)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

// GET /auth/clinics → unidades que o usuário pode acessar (OWNER: todas as ativas do tenant)
export async function listMyClinicsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, tenantId } = req.user!
    const clinics = await authService.listAccessibleClinics(userId, tenantId)
    res.status(200).json(clinics)
  } catch (error) {
    next(error)
  }
}

// POST /auth/switch-clinic   body: { clinicId } → novo token com a unidade ativa escolhida
export async function switchClinicController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, tenantId } = req.user!
    const { clinicId } = (req.body || {}) as SwitchClinicDTO
    if (!clinicId || typeof clinicId !== 'string') {
      res.status(400).json({ message: 'Informe clinicId.' })
      return
    }
    const result = await authService.switchClinic(userId, tenantId, clinicId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
