import type { Request, Response, NextFunction } from 'express'
import { getSessionUser } from '../middlewares/authMiddlewares'
import {
  sendWhatsAppMessage,
  sendPreRegistrationWhatsApp,
  sendAppointmentReminderWhatsApp,
} from '../services/whatsappService'
import { AppError } from '../shared/AppError'

export async function sendCustomWhatsAppController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    getSessionUser(req)
    const { phone, message } = req.body

    if (!phone || !message) {
      throw new AppError('Telefone e mensagem são obrigatórios.', 400)
    }

    const result = await sendWhatsAppMessage({ phone, message })
    res.status(200).json({ status: 'success', data: result })
  } catch (error) {
    next(error)
  }
}

export async function sendPreRegistrationLinkController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    getSessionUser(req)
    const { phone, patientName, linkUrl } = req.body

    if (!phone || !patientName || !linkUrl) {
      throw new AppError('Telefone, nome do paciente e link são obrigatórios.', 400)
    }

    const result = await sendPreRegistrationWhatsApp(phone, patientName, linkUrl)
    res.status(200).json({ status: 'success', data: result })
  } catch (error) {
    next(error)
  }
}

export async function sendReminderController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    getSessionUser(req)
    const { phone, patientName, dateStr, timeStr } = req.body

    if (!phone || !patientName || !dateStr || !timeStr) {
      throw new AppError('Dados do lembrete incompletos.', 400)
    }

    const result = await sendAppointmentReminderWhatsApp(phone, patientName, dateStr, timeStr)
    res.status(200).json({ status: 'success', data: result })
  } catch (error) {
    next(error)
  }
}