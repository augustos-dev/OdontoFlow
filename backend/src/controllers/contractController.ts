import type { Request, Response, NextFunction } from 'express'
import * as contractService from '../services/contractService'
import type { CreatePreRegistrationLinkDTO } from '../types/contract.types'
import type { AuthUserSession } from '../types/auth.types'
import { AppError } from '../shared/AppError'

function getSessionUser(req: Request): AuthUserSession {
  const user = req.user as unknown as AuthUserSession | undefined
  if (!user || !user.tenantId || !user.clinicId) {
    throw new AppError('Usuário não autenticado ou sessão inválida.', 401)
  }
  return user
}

// ─── ROTAS DE CONTRATOS CLÍNICOS (AUTENTICADAS) ───

export async function listContractsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { patientId } = req.query

    const contracts = await contractService.listContracts(
      user.tenantId,
      user.clinicId,
      patientId as string | undefined
    )

    res.status(200).json({ status: 'success', data: contracts })
  } catch (error) {
    next(error)
  }
}

export async function createContractController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)

    const contract = await contractService.createContract(
      user.tenantId,
      user.clinicId,
      req.body
    )

    res.status(201).json({ status: 'success', data: contract })
  } catch (error) {
    next(error)
  }
}

export async function signContractController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { id } = req.params
    const { signatureUrl } = req.body
    const clientIp = req.ip || (req.socket.remoteAddress as string) || '0.0.0.0'

    const contract = await contractService.signContract(
      user.tenantId,
      id as string,
      signatureUrl,
      clientIp
    )

    res.status(200).json({ status: 'success', data: contract })
  } catch (error) {
    next(error)
  }
}

// ─── GERAÇÃO DO LINK PARA WHATSAPP (AUTENTICADA) ───

export async function generatePreRegLinkController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)

    const linkData = await contractService.generatePreRegLink(
      user.tenantId,
      user.clinicId,
      req.body as CreatePreRegistrationLinkDTO
    )

    res.status(201).json({ status: 'success', data: linkData })
  } catch (error) {
    next(error)
  }
}

// ─── RESPOSTA PÚBLICA DO PACIENTE (SEM AUTENTICAÇÃO) ───

export async function submitPublicPreRegController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params
    const { formData } = req.body

    const result = await contractService.submitPreRegByToken(token as string, formData)
    res.status(200).json({
      status: 'success',
      message: 'Pré-cadastro enviado com sucesso!',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}