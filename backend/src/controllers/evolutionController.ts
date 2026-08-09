import { Request, Response, NextFunction } from 'express'
import { EvolutionService } from '../services/evolutionService'
import type { UserRole } from '@prisma/client'
import type { CreateEvolutionDTO } from '../types/medicalRecord.types'
import type { CustomJwtPayload } from '../types/express'
import 'multer'

const evolutionService = new EvolutionService()

function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

function extractAttachmentUrls(req: Request): string[] {
  const files = (req as any).files as Express.Multer.File[] | undefined
  const body = req.body || {}

  if (files && Array.isArray(files) && files.length > 0) {
    return files.map((file) => file.filename)
  }

  if (body.attachments) {
    return Array.isArray(body.attachments)
      ? body.attachments
      : [body.attachments]
  }

  return []
}

export class EvolutionController {
  async createEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const user = req.user as CustomJwtPayload
      const dentistId = user.userId || (user as any).sub || (user as any).id
      const targetId = getRecordIdParam(req)
      const attachmentUrls = extractAttachmentUrls(req)
      const actor = {
        userId: dentistId,
        userName: (user as any).name || 'Usuário',
        userRole: (user.role as UserRole) || 'DENTIST',
      }

      const dto: CreateEvolutionDTO = {
        description: req.body.description,
        procedureId: req.body.procedureId, // 🚀 Gatilho para o Exit Inteligente
        odontogramSnapshot: req.body.odontogramSnapshot,
        attachments: attachmentUrls,
      }

      const evolution = await evolutionService.createEvolution(
        user.tenantId,
        user.clinicId!,
        targetId,
        dentistId as string,
        dto,
        actor
      )

      res.status(201).json(evolution)
    } catch (error) {
      next(error)
    }
  }

  async getEvolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const user = req.user as CustomJwtPayload
      const targetId = getRecordIdParam(req)

      const evolutions = await evolutionService.getEvolutionsByPatient(
        user.tenantId,
        user.clinicId!,
        targetId
      )

      res.status(200).json(evolutions)
    } catch (error) {
      next(error)
    }
  }

  async updateEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const user = req.user as CustomJwtPayload
      const userId = user.userId || (user as any).sub || (user as any).id
      const { evolutionId } = req.params
      const { description } = req.body as { description: string }
      const actor = {
        userId,
        userName: (user as any).name || 'Usuário',
        userRole: (user.role as UserRole) || 'DENTIST',
      }

      const evolution = await evolutionService.updateEvolution(
        user.tenantId,
        user.clinicId!,
        evolutionId as string,
        description,
        actor
      )

      res.status(200).json(evolution)
    } catch (error) {
      next(error)
    }
  }

  async lockEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const user = req.user as CustomJwtPayload
      const userId = user.userId || (user as any).sub || (user as any).id
      const { evolutionId } = req.params
      const actor = {
        userId,
        userName: (user as any).name || 'Usuário',
        userRole: (user.role as UserRole) || 'DENTIST',
      }

      const evolution = await evolutionService.lockEvolution(
        user.tenantId,
        user.clinicId!,
        evolutionId as string,
        actor
      )

      res.status(200).json(evolution)
    } catch (error) {
      next(error)
    }
  }
}