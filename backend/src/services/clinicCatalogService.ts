import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { auditLogService } from './auditLog.service'
import { getTenantContext } from '../lib/tenantContext'

/**
 * Catálogo POR UNIDADE (Enterprise):
 *  - ativar/desativar procedimentos e definir preço na unidade;
 *  - "copiar da unidade X" para a unidade nova (ação do usuário; gera registros novos, a filial nunca fica ligada à origem);
 *  - reconciliar receitas depois que os produtos da filial foram importados;
 *  - listar procedimentos ativos sem receita (a baixa automática não baixa nada nesses casos).
 */

interface ActorContext {
  userId: string
  userName: string
  userRole?: UserRole
}

const normalizeName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

async function assertNetworkWith(tenantId: string, clinicIds: string[]) {
  const ctx = await getTenantContext(tenantId)
  if (!ctx.isNetwork) {
    throw new AppError('Catálogo por unidade está disponível apenas no plano Enterprise.', 403)
  }
  const unique = [...new Set(clinicIds)]
  const found = await prisma.clinic.count({ where: { id: { in: unique }, tenantId } })
  if (found !== unique.length) throw new AppError('Clínica não encontrada neste tenant.', 404)
}

// ─── Ativar / desativar / preço ──────────────────────────────────────────────

export async function setClinicProcedure(
  tenantId: string,
  clinicId: string,
  procedureId: string,
  data: { isActive?: boolean; price?: number | null },
  actor: ActorContext
) {
  await assertNetworkWith(tenantId, [clinicId])

  const procedure = await prisma.procedure.findFirst({ where: { id: procedureId, tenantId } })
  if (!procedure) throw new AppError('Procedimento não encontrado.', 404)

  if (data.price !== undefined && data.price !== null && !(Number(data.price) >= 0)) {
    throw new AppError('Preço inválido.', 400)
  }

  const result = await prisma.clinicProcedure.upsert({
    where: { clinicId_procedureId: { clinicId, procedureId } },
    create: {
      tenantId,
      clinicId,
      procedureId,
      isActive: data.isActive ?? true,
      price: data.price ?? null,
    },
    update: {
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.price !== undefined && { price: data.price }),
    },
  })

  await auditLogService.createLog({
    tenantId,
    clinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'UPDATE',
    entity: 'CLINIC_PROCEDURE',
    entityId: result.id,
    details: `Procedimento "${procedure.name}" na unidade: ${result.isActive ? 'ativo' : 'inativo'}, preço ${
      result.price === null ? `base (R$ ${Number(procedure.basePrice).toFixed(2)})` : `R$ ${Number(result.price).toFixed(2)}`
    }`,
  })

  return result
}

// ─── Copiar procedimentos da unidade A para a B ──────────────────────────────

export async function cloneClinicProcedures(
  tenantId: string,
  fromClinicId: string,
  toClinicId: string,
  opts: { copyPrices?: boolean },
  actor: ActorContext
) {
  if (fromClinicId === toClinicId) throw new AppError('Origem e destino devem ser unidades diferentes.', 400)
  await assertNetworkWith(tenantId, [fromClinicId, toClinicId])

  const source = await prisma.clinicProcedure.findMany({
    where: { tenantId, clinicId: fromClinicId, isActive: true },
  })

  const { count } = await prisma.clinicProcedure.createMany({
    data: source.map((cp) => ({
      tenantId,
      clinicId: toClinicId,
      procedureId: cp.procedureId, // mesmo procedimento da rede: não é duplicado, só ativado na filial
      price: opts.copyPrices === false ? null : cp.price,
      isActive: true,
    })),
    skipDuplicates: true, // rodar duas vezes não duplica nem sobrescreve o que a filial já ajustou
  })

  await auditLogService.createLog({
    tenantId,
    clinicId: toClinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'CREATE',
    entity: 'CLINIC_PROCEDURE',
    details: `Copiou ${count} procedimento(s) da unidade ${fromClinicId} para ${toClinicId}${
      opts.copyPrices === false ? ' (sem preços)' : ''
    }`,
  })

  return { copied: count, alreadyPresent: source.length - count }
}

// ─── Reconciliar receitas (A -> B por nome do produto) ───────────────────────

export async function reconcileRecipes(
  tenantId: string,
  fromClinicId: string,
  toClinicId: string,
  actor: ActorContext
) {
  if (fromClinicId === toClinicId) throw new AppError('Origem e destino devem ser unidades diferentes.', 400)
  await assertNetworkWith(tenantId, [fromClinicId, toClinicId])

  const [recipeA, productsB, activeInB] = await Promise.all([
    prisma.procedureProduct.findMany({
      where: { tenantId, clinicId: fromClinicId },
      include: { product: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { tenantId, clinicId: toClinicId },
      select: { id: true, name: true, quantity: true, expiryDate: true },
    }),
    prisma.clinicProcedure.findMany({
      where: { tenantId, clinicId: toClinicId, isActive: true },
      select: { procedureId: true },
    }),
  ])

  // Se há vários registros com o mesmo nome (lotes), prefere o que tem saldo e vence primeiro.
  const bestByName = new Map<string, (typeof productsB)[number]>()
  for (const p of productsB) {
    const key = normalizeName(p.name)
    const current = bestByName.get(key)
    const better =
      !current ||
      (current.quantity <= 0 && p.quantity > 0) ||
      (p.quantity > 0 && current.quantity > 0 && p.expiryDate && (!current.expiryDate || p.expiryDate < current.expiryDate))
    if (better) bestByName.set(key, p)
  }

  const activeSet = new Set(activeInB.map((a) => a.procedureId))
  const toCreate: Prisma.ProcedureProductCreateManyInput[] = []
  const pending: Array<{ procedureId: string; productName: string }> = []

  for (const item of recipeA) {
    if (!activeSet.has(item.procedureId)) continue // a filial não oferece esse procedimento
    const match = bestByName.get(normalizeName(item.product.name))
    if (match) {
      toCreate.push({
        tenantId,
        clinicId: toClinicId,
        procedureId: item.procedureId,
        productId: match.id,
        quantity: item.quantity, // ponto de partida: a filial edita depois
        unit: item.unit,
      })
    } else {
      pending.push({ procedureId: item.procedureId, productName: item.product.name })
    }
  }

  const { count } = await prisma.procedureProduct.createMany({ data: toCreate, skipDuplicates: true })

  await auditLogService.createLog({
    tenantId,
    clinicId: toClinicId,
    userId: actor.userId,
    userName: actor.userName,
    userRole: actor.userRole || 'ADMIN',
    action: 'CREATE',
    entity: 'PROCEDURE_PRODUCT',
    details: `Reconciliou receitas da unidade ${fromClinicId}: ${count} itens criados, ${pending.length} pendentes (produto não cadastrado na unidade)`,
  })

  return { created: count, pending }
}

// ─── Procedimentos ativos sem receita na unidade ─────────────────────────────

export async function listProceduresWithoutRecipe(tenantId: string, clinicId: string) {
  const ctx = await getTenantContext(tenantId)

  return prisma.procedure.findMany({
    where: {
      tenantId,
      ...(ctx.isNetwork && { clinicProcedures: { some: { clinicId, isActive: true } } }),
      procedureProducts: { none: { clinicId } },
    },
    select: { id: true, name: true, category: true },
    orderBy: { name: 'asc' },
  })
}
