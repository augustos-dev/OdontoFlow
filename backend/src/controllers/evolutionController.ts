import { Request, Response } from 'express'
import { EvolutionService } from '../services/evolutionService'

const service = new EvolutionService()

export class EvolutionController {
  async create(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' })
    }

    // 💡 Mapeia 'sub' direto para 'userId' sem alterar sua interface de auth
    const { tenantId, sub: userId } = req.user
    const { medicalRecordId, description, odontogramSnapshot } = req.body

    const evolution = await service.createEvolution(tenantId, {
      medicalRecordId,
      dentistId: userId,
      description,
      odontogramSnapshot
    })

    return res.status(201).json(evolution)
  }

  async getEvolutions(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' })
    }

    const { tenantId } = req.user
    const { medicalRecordId } = req.params

    const evolutions = await service.getEvolutionsByMedicalRecord(tenantId, medicalRecordId as string)
    return res.json(evolutions)
  }

  async getCurrentOdontogram(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' })
    }

    const { tenantId } = req.user
    const { medicalRecordId } = req.params

    const odontogram = await service.getCurrentOdontogram(tenantId, medicalRecordId as string)
    return res.json(odontogram)
  }
}