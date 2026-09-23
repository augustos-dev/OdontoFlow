import type { Request, Response, NextFunction } from 'express'
import { getSessionUser } from '../middlewares/authMiddlewares'
import { emitNfseService } from '../services/nfseService'
import { AppError } from '../shared/AppError'

export async function emitNfseController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = getSessionUser(req)
    const { patient, serviceValue, serviceDescription, clinicCnpj, im } = req.body

    if (!patient?.cpf || !patient?.name || !serviceValue || !serviceDescription) {
      throw new AppError('Dados incompletos para emissão da NFS-e (paciente, CPF, valor e descrição são obrigatórios).', 400)
    }

    const result = await emitNfseService({
      clinicCnpj: clinicCnpj || process.env.CLINIC_CNPJ || '',
      im: im || process.env.CLINIC_IM || '',
      patient,
      serviceValue: Number(serviceValue),
      serviceDescription,
    })

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}