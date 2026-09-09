import { UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { findMedicalRecord } from './medicalRecordService'
import { auditLogService } from './auditLog.service'
import { processAutoStockDeduction } from './stockService'
import type { CreateEvolutionDTO } from '../types/medicalRecord.types'

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

export class EvolutionService {
  /**
   * Cria uma nova Evolução Clínica com Odontograma, Anexos e Gatilho do Exit Inteligente
   */
  async createEvolution(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string,
    dentistId: string,
    data: CreateEvolutionDTO,
    actor?: ActorContext
  ) {
    // 1. Busca o prontuário garantindo isolamento de tenant
    const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

    // 2. Valida se o profissional existe e está ativo
    const dentist = await prisma.user.findFirst({
      where: {
        id: dentistId,
        tenantId,
        isActive: true,
        role: { in: ['DENTIST', 'ADMIN'] },
      },
    })

    if (!dentist) {
      throw new AppError('Dentista/Profissional não encontrado ou inativo.', 404)
    }

    // 3. Valida o procedimento (caso tenha sido selecionado na evolução)
    if (data.procedureId) {
      const procedureExists = await prisma.procedure.findFirst({
        where: { id: data.procedureId, tenantId },
      })
      if (!procedureExists) {
        throw new AppError('Procedimento selecionado não encontrado no catálogo.', 404)
      }
    }

    // 4. Normalização do snapshot (suporta string JSON via FormData ou Object direto)
    let parsedSnapshot: any = null
    if (data.odontogramSnapshot) {
      if (typeof data.odontogramSnapshot === 'string') {
        try {
          parsedSnapshot = JSON.parse(data.odontogramSnapshot)
        } catch {
          parsedSnapshot = null
        }
      } else {
        parsedSnapshot = data.odontogramSnapshot
      }
    }

    // 5. Executa transação ACID (Evolução + Atualização de Condições Dentárias)
    const evolution = await prisma.$transaction(async (tx) => {
      // 5.1 Cria a Evolução no histórico
      const createdEvolution = await tx.evolution.create({
        data: {
          tenantId,
          medicalRecordId: medicalRecord.id,
          dentistId: dentist.id,
          procedureId: data.procedureId || null,
          description: data.description,
          odontogramSnapshot: parsedSnapshot ?? undefined,
          attachments: data.attachments || [],
        },
        include: {
          dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
          procedure: { select: { id: true, name: true, basePrice: true } },
        },
      })

      // 5.2 Se houver odontograma snapshot, atualiza o estado vivo na tabela tooth_conditions
      if (parsedSnapshot && typeof parsedSnapshot === 'object') {
        for (const [toothStr, toothData] of Object.entries(parsedSnapshot)) {
          const item = toothData as any
          const toothNumber = parseInt(toothStr, 10)

          if (isNaN(toothNumber) || !item) continue

          const faces = item.faces
            ? Array.isArray(item.faces)
              ? item.faces
              : Object.keys(item.faces)
            : []
          const condition = item.condition || (item.faces ? Object.values(item.faces)[0] : 'outros')

          await tx.toothCondition.upsert({
            where: {
              medicalRecordId_toothNumber: {
                medicalRecordId: medicalRecord.id,
                toothNumber,
              },
            },
            update: {
              condition: String(condition),
              faces,
              notes: item.notes || null,
              updatedAt: new Date(),
            },
            create: {
              tenantId,
              medicalRecordId: medicalRecord.id,
              toothNumber,
              condition: String(condition),
              faces,
              notes: item.notes || null,
            },
          })
        }
      }

      return createdEvolution
    })

    // 🚀 EXIT INTELIGENTE: Se o dentista selecionou um procedimento na evolução, dá baixa nos insumos
    if (data.procedureId) {
      try {
        await processAutoStockDeduction(
          tenantId,
          clinicId,
          data.procedureId,
          actor?.userId || dentist.id,
          `Baixa Automática via Evolução Clínica ID: ${evolution.id}`
        )
      } catch (error) {
        console.error('[Exit Inteligente Error]: Falha ao disparar baixa no estoque via Evolução', error)
      }
    }

    // 🟢 Log de Auditoria
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor?.userId || dentist.id,
      userName: actor?.userName || dentist.name,
      userRole: actor?.userRole || (dentist.role as UserRole),
      action: 'CREATE',
      entity: 'EVOLUTION',
      entityId: evolution.id,
      details: `Registrou evolução clínica${evolution.procedure ? ` (Procedimento: ${evolution.procedure.name})` : ''}. Profissional: Dr(a). ${dentist.name}`,
    })

    return evolution
  }

  /**
   * Lista as evoluções clínicas do paciente
   */
  async getEvolutionsByPatient(
    tenantId: string,
    clinicId: string,
    patientOrRecordId: string
  ) {
    const medicalRecord = await findMedicalRecord(tenantId, clinicId, patientOrRecordId)

    return prisma.evolution.findMany({
      where: {
        tenantId,
        medicalRecordId: medicalRecord.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        dentist: { select: { id: true, name: true, cro: true, avatarUrl: true } },
        procedure: { select: { id: true, name: true, basePrice: true } },
      },
    })
  }

  /**
   * Tranca a evolução contra edições futuras
   */
  async lockEvolution(
    tenantId: string,
    clinicId: string,
    evolutionId: string,
    actor: ActorContext
  ) {
    const evolution = await prisma.evolution.findFirst({
      where: { id: evolutionId, tenantId },
    })

    if (!evolution) {
      throw new AppError('Evolução não encontrada.', 404)
    }
    if (evolution.isLocked) {
      throw new AppError('Evolução já está travada.', 400)
    }

    const updated = await prisma.evolution.update({
      where: { id: evolutionId },
      data: { isLocked: true, lockedAt: new Date() },
    })

    // 🟢 Log de Auditoria
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'DENTIST',
      action: 'UPDATE',
      entity: 'EVOLUTION',
      entityId: evolutionId,
      details: `Trava de segurança aplicada na evolução clínica ID: ${evolutionId}`,
    })

    return updated
  }

  /**
   * Edita a descrição caso a evolução não esteja travada
   */
  async updateEvolution(
    tenantId: string,
    clinicId: string,
    evolutionId: string,
    description: string,
    actor: ActorContext
  ) {
    const evolution = await prisma.evolution.findFirst({
      where: { id: evolutionId, tenantId },
    })

    if (!evolution) {
      throw new AppError('Evolução não encontrada.', 404)
    }
    if (evolution.isLocked) {
      throw new AppError('Evolução travada não pode ser editada.', 400)
    }

    const updated = await prisma.evolution.update({
      where: { id: evolutionId },
      data: { description },
    })

    // 🟢 Log de Auditoria
    await auditLogService.createLog({
      tenantId,
      clinicId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole || 'DENTIST',
      action: 'UPDATE',
      entity: 'EVOLUTION',
      entityId: evolutionId,
      details: `Editou a descrição da evolução clínica ID: ${evolutionId}`,
    })

    return updated
  }
}