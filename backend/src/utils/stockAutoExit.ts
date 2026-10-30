import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'

/**
 * EXIT INTELIGENTE — baixa automática de estoque por procedimento realizado.
 *
 * Regras:
 *  1. A receita (procedure_products) é POR CLÍNICA: só baixa os insumos da clínica do atendimento.
 *  2. IDEMPOTÊNCIA ATÔMICA: a baixa só acontece para quem "reivindica" a flag com um UPDATE condicional
 *     (appointments.autoStockDeducted ou evolutions.stockDeducted). Duas chamadas simultâneas não baixam duas vezes.
 *  3. Evolução e agendamento da MESMA visita (mesmo paciente/clínica/procedimento, janela de ±12h) compartilham
 *     a trava do agendamento: finalizar o agendamento E registrar a evolução baixa uma vez só.
 *  4. Saldo nunca fica negativo. Se faltar insumo, baixa o que existe, registra a quantidade REAL na movimentação
 *     e devolve `shortages` para a aplicação avisar o usuário.
 *  5. Tudo numa transação: se algo falhar, a trava também é desfeita.
 */

interface TriggerAutoStockExitParams {
  tenantId: string
  clinicId: string
  procedureId: string
  userId: string
  /** Agendamento finalizado (preferencial). */
  appointmentId?: string
  /** Evolução que registrou o procedimento (usada quando não há agendamento). */
  evolutionId?: string
}

export interface StockShortage {
  productId: string
  productName: string
  needed: number
  deducted: number
  missing: number
}

export type StockExitResult =
  | { skipped: true; reason: 'NO_RECIPE_FOR_CLINIC' | 'ALREADY_DISCHARGED' }
  | {
      skipped: false
      movements: Array<{ id: string; productId: string; quantity: number }>
      shortages: StockShortage[]
    }

const LINK_WINDOW_MS = 12 * 60 * 60 * 1000
const LINKABLE_STATUSES = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'FINALIZADO', 'ESPERA'] as const

export async function triggerAutoStockExit(params: TriggerAutoStockExitParams): Promise<StockExitResult> {
  const { tenantId, clinicId, procedureId, userId, appointmentId, evolutionId } = params

  if (!appointmentId && !evolutionId) {
    throw new AppError('Informe o agendamento ou a evolução para a baixa automática.', 400)
  }

  // Receita da clínica do atendimento (nunca de outra unidade).
  const recipe = await prisma.procedureProduct.findMany({
    where: { tenantId, clinicId, procedureId },
    include: { product: true },
  })
  if (recipe.length === 0) return { skipped: true, reason: 'NO_RECIPE_FOR_CLINIC' }

  return prisma.$transaction(async (tx): Promise<StockExitResult> => {
    // ── 1. Reivindica a trava de idempotência ────────────────────────────────
    let linkedAppointmentId: string | undefined = appointmentId
    let claimed = false

    if (appointmentId) {
      const r = await tx.appointment.updateMany({
        where: { id: appointmentId, tenantId, clinicId, autoStockDeducted: false },
        data: { autoStockDeducted: true },
      })
      claimed = r.count === 1
    } else {
      const evolution = await tx.evolution.findFirst({
        where: { id: evolutionId, tenantId, clinicId },
        select: { stockDeducted: true, medicalRecord: { select: { patientId: true } } },
      })
      if (!evolution) throw new AppError('Evolução não encontrada.', 404)
      if (evolution.stockDeducted) return { skipped: true, reason: 'ALREADY_DISCHARGED' }

      const now = Date.now()
      const visitWhere = {
        tenantId,
        clinicId,
        patientId: evolution.medicalRecord.patientId,
        status: { in: [...LINKABLE_STATUSES] },
        dateTime: { gte: new Date(now - LINK_WINDOW_MS), lte: new Date(now + LINK_WINDOW_MS) },
        OR: [{ procedureId }, { procedureId: null }],
      }

      // Prefere o agendamento da mesma visita que AINDA NÃO baixou estoque. (Pegar só o mais recente falhava quando ele
      // já tinha sido baixado e havia outro, anterior, pendente: a evolução ficava sem baixar nada.)
      const pendingVisit = await tx.appointment.findFirst({
        where: { ...visitWhere, autoStockDeducted: false },
        orderBy: { dateTime: 'desc' },
        select: { id: true },
      })

      if (pendingVisit) {
        linkedAppointmentId = pendingVisit.id
        const r = await tx.appointment.updateMany({
          where: { id: pendingVisit.id, autoStockDeducted: false },
          data: { autoStockDeducted: true },
        })
        claimed = r.count === 1
      } else {
        // Há agendamento da mesma visita, mas todos já baixaram: a visita já foi contabilizada.
        const countedVisit = await tx.appointment.findFirst({
          where: { ...visitWhere, autoStockDeducted: true },
          select: { id: true },
        })
        if (countedVisit) return { skipped: true, reason: 'ALREADY_DISCHARGED' }

        // Sem agendamento: a trava fica na própria evolução.
        const r = await tx.evolution.updateMany({
          where: { id: evolutionId, stockDeducted: false },
          data: { stockDeducted: true },
        })
        claimed = r.count === 1
      }
    }

    if (!claimed) return { skipped: true, reason: 'ALREADY_DISCHARGED' }

    // ── 2. Baixa atômica por item da receita ────────────────────────────────
    const movements: Array<{ id: string; productId: string; quantity: number }> = []
    const shortages: StockShortage[] = []
    const origin = linkedAppointmentId
      ? `Agendamento: ${linkedAppointmentId}`
      : `Evolução: ${evolutionId}`

    for (const item of recipe) {
      const product = item.product
      let needed = Number(item.quantity)

      // Conversão Caixa (CX) -> Unidade (UN)
      if (product.unit === 'CX' && item.unit === 'UN') {
        needed = needed / (product.itemsPerPackage || 100)
      }
      if (!(needed > 0)) continue

      // Trava a linha do produto, lê o saldo anterior e grava o novo saldo (nunca abaixo de zero).
      const rows = await tx.$queryRaw<Array<{ before: number; after: number }>>(Prisma.sql`
        WITH old AS (
          SELECT "quantity" FROM "products"
           WHERE "id" = ${product.id} AND "clinicId" = ${clinicId}
             FOR UPDATE
        )
        UPDATE "products" p
           SET "quantity" = GREATEST(old."quantity" - ${needed}::double precision, 0),
               "updatedAt" = CURRENT_TIMESTAMP
          FROM old
         WHERE p."id" = ${product.id}
        RETURNING old."quantity" AS "before", p."quantity" AS "after"
      `)

      const row = rows[0]
      if (!row) continue

      const deducted = Number(row.before) - Number(row.after)
      const missing = needed - deducted

      if (missing > 1e-9) {
        shortages.push({
          productId: product.id,
          productName: product.name,
          needed,
          deducted,
          missing,
        })
      }
      if (deducted <= 0) continue

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          clinicId,
          productId: product.id,
          userId,
          type: 'EXIT_AUTO',
          quantity: deducted,
          appointmentId: linkedAppointmentId ?? null,
          procedureId,
          reason:
            `Exit Inteligente: Procedimento Realizado (${origin})` +
            (missing > 1e-9 ? ` — estoque insuficiente, faltaram ${missing}` : ''),
        },
        select: { id: true, productId: true, quantity: true },
      })
      movements.push(movement)
    }

    return { skipped: false, movements, shortages }
  })
}
