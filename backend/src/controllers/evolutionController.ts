import { Request, Response, NextFunction } from 'express'
import { EvolutionService } from '../services/evolutionService'
import type { UserRole } from '@prisma/client'
import type { CreateEvolutionDTO } from '../types/medicalRecord.types'
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
    return files.map(file => file.filename)
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

      const { tenantId, clinicId, sub: dentistId, name: userName, role } = req.user
      const targetId = getRecordIdParam(req)
      const attachmentUrls = extractAttachmentUrls(req)
      const actor = { userId: dentistId, userName: userName || 'Usuário', userRole: role as UserRole }

      const dto: CreateEvolutionDTO = {
        description: req.body.description,
        odontogramSnapshot: req.body.odontogramSnapshot,
        attachments: attachmentUrls,
      }

      const evolution = await evolutionService.createEvolution(
        tenantId,
        clinicId,
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

      const { tenantId, clinicId } = req.user
      const targetId = getRecordIdParam(req)

      const evolutions = await evolutionService.getEvolutionsByPatient(
        tenantId,
        clinicId,
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

      const { tenantId, clinicId, sub: userId, name: userName, role } = req.user
      const { evolutionId } = req.params
      const { description } = req.body as { description: string }
      const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

      const evolution = await evolutionService.updateEvolution(
        tenantId,
        clinicId,
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

      const { tenantId, clinicId, sub: userId, name: userName, role } = req.user
      const { evolutionId } = req.params
      const actor = { userId, userName: userName || 'Usuário', userRole: role as UserRole }

      const evolution = await evolutionService.lockEvolution(
        tenantId,
        clinicId,
        evolutionId as string,
        actor
      )

      res.status(200).json(evolution)
    } catch (error) {
      next(error)
    }
  }
}