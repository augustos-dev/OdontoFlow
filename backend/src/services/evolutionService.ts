import { prisma } from '../lib/prisma'
import { CreateEvolutionDTO } from '../types/odontogram.types'
import { AppError } from '../shared/AppError'

export class EvolutionService {
  async createEvolution(tenantId: string, data: CreateEvolutionDTO) {
    const { medicalRecordId, dentistId, description, odontogramSnapshot } = data

    // 1. Valida se o prontuário existe e pertence ao mesmo Tenant
    const medicalRecord = await prisma.medicalRecord.findFirst({
      where: { id: medicalRecordId, tenantId }
    })

    if (!medicalRecord) {
      throw new AppError('Prontuário médico não encontrado.', 404)
    }

    // 2. Executa a criação e a atualização das peças em uma transação ACID
    return await prisma.$transaction(async (tx) => {
      // Cria o registro da Evolução no histórico contendo o snapshot
      const evolution = await tx.evolution.create({
        data: {
          tenantId,
          medicalRecordId,
          dentistId,
          description,
          odontogramSnapshot: odontogramSnapshot ? JSON.parse(JSON.stringify(odontogramSnapshot)) : null,
        }
      })

      // Se houver atualizações do odontograma enviadas nesta evolução
      if (odontogramSnapshot) {
        for (const [toothStr, toothData] of Object.entries(odontogramSnapshot)) {
          const toothNumber = Number(toothStr)

          await tx.toothCondition.upsert({
            where: {
              medicalRecordId_toothNumber: {
                medicalRecordId,
                toothNumber
              }
            },
            update: {
              condition: toothData.condition,
              faces: toothData.faces || [],
              notes: toothData.notes || null,
              updatedAt: new Date()
            },
            create: {
              tenantId,
              medicalRecordId,
              toothNumber,
              condition: toothData.condition,
              faces: toothData.faces || [],
              notes: toothData.notes || null
            }
          })
        }
      }

      return evolution
    })
  }

  // Lista a timeline de evoluções do prontuário
  async getEvolutionsByMedicalRecord(tenantId: string, medicalRecordId: string) {
    return await prisma.evolution.findMany({
      where: { tenantId, medicalRecordId },
      include: {
        dentist: {
          select: { id: true, name: true, cro: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Retorna a visão viva / estado atual de todos os dentes do paciente
  async getCurrentOdontogram(tenantId: string, medicalRecordId: string) {
    return await prisma.toothCondition.findMany({
      where: { tenantId, medicalRecordId },
      orderBy: { toothNumber: 'asc' }
    })
  }
}