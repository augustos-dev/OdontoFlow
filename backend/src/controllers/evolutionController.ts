import { Request, Response, NextFunction } from 'express'
import { EvolutionService } from '../services/evolutionService'
import type { CreateEvolutionDTO } from '../types/medicalRecord.types'
import 'multer'

const evolutionService = new EvolutionService()

/**
 * Auxiliar interno para extrair parâmetro da URL de forma flexível
 */
function getRecordIdParam(req: Request): string {
  const { id, patientId, medicalRecordId } = req.params
  return (id || patientId || medicalRecordId) as string
}

/**
 * Auxiliar para extrair URLs dos arquivos gravados (via Multer / S3 / Supabase)
 */
function extractAttachmentUrls(req: Request): string[] {
  const files = (req as any).files as Express.Multer.File[] | undefined

  if (files && Array.isArray(files)) {
    return files.map(
      (file) => (file as any).location || file.path || file.filename
    )
  }

  if (req.body.attachments) {
    return Array.isArray(req.body.attachments) 
      ? req.body.attachments 
      : [req.body.attachments]
  }

  return []
}

export class EvolutionController {
  /**
   * Cria uma nova evolução clínica, salvando fotos/anexos e o snapshot do odontograma
   */
  async createEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const { tenantId, clinicId, sub: dentistId } = req.user
      const targetId = getRecordIdParam(req)
      const attachmentUrls = extractAttachmentUrls(req)

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
        dto
      )

      res.status(201).json(evolution)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Lista a timeline de evoluções clínicas do prontuário/paciente
   */
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

  /**
   * Atualiza a descrição de uma evolução (se não estiver travada)
   */
  async updateEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const { tenantId } = req.user
      const { evolutionId } = req.params
      const { description } = req.body as { description: string }

      const evolution = await evolutionService.updateEvolution(
        tenantId,
        evolutionId as string,
        description
      )

      res.status(200).json(evolution)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Tranca a evolução contra edições futuras
   */
  async lockEvolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Não autenticado.' })
        return
      }

      const { tenantId } = req.user
      const { evolutionId } = req.params

      const evolution = await evolutionService.lockEvolution(
        tenantId,
        evolutionId as string
      )

      res.status(200).json(evolution)
    } catch (error) {
      next(error)
    }
  }
}