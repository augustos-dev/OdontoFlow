import type { Prisma, TenantPlan } from '@prisma/client'
import { prisma } from './prisma'
import { AppError } from '../shared/AppError'

/**
 * Contexto de plano do tenant, lido do BANCO (não do JWT), para decidir o escopo dos dados.
 * - ENTERPRISE => "rede": pacientes/prontuário valem para todas as clínicas do tenant.
 * - Demais planos => escopo por clínica (comportamento anterior).
 *
 * Cache curto em memória para não consultar o banco a cada chamada.
 * Se você alterar plano/limites, chame invalidateTenantContext(tenantId).
 */
export interface TenantContext {
  tenantId: string
  plan: TenantPlan
  isNetwork: boolean
  maxClinics: number
  maxProfessionals: number | null
}

const TTL_MS = 30_000
const cache = new Map<string, { value: TenantContext; expiresAt: number }>()

export async function getTenantContext(tenantId: string): Promise<TenantContext> {
  const hit = cache.get(tenantId)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      subscription: { select: { maxClinics: true, maxProfessionals: true } },
    },
  })
  if (!tenant) throw new AppError('Tenant não encontrado.', 404)

  const value: TenantContext = {
    tenantId,
    plan: tenant.plan,
    isNetwork: tenant.plan === 'ENTERPRISE',
    // Sem linha de subscription (ou Basic/Premium), vale a regra: 1 clínica.
    maxClinics: tenant.subscription?.maxClinics ?? 1,
    maxProfessionals: tenant.subscription?.maxProfessionals ?? null,
  }
  cache.set(tenantId, { value, expiresAt: Date.now() + TTL_MS })
  return value
}

export function invalidateTenantContext(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId)
  else cache.clear()
}

/** Filtro de pacientes (e dados clínicos ligados ao paciente): rede inteira no Enterprise, senão só a clínica. */
export function patientScope(ctx: TenantContext, clinicId: string): Prisma.PatientWhereInput {
  return ctx.isNetwork ? { tenantId: ctx.tenantId } : { tenantId: ctx.tenantId, clinicId }
}

/** Usuário pertence à clínica (principal, vínculo em user_clinics) ou é o dono da rede. */
export function userInClinic(clinicId: string): Prisma.UserWhereInput {
  return {
    OR: [{ clinicId }, { clinics: { some: { clinicId } } }, { role: 'OWNER' }],
  }
}

/** Preço efetivo na unidade: preço da clínica, senão o preço base da rede. */
export function effectivePrice(
  basePrice: Prisma.Decimal | number | string,
  clinicPrice?: Prisma.Decimal | number | string | null
): number {
  return Number(clinicPrice ?? basePrice)
}

/**
 * Garante que o procedimento existe no catálogo da rede e, no Enterprise,
 * que está ATIVO na unidade (a filial só atende o que ativou).
 */
export async function assertProcedureAvailable(
  tenantId: string,
  clinicId: string,
  procedureId: string
): Promise<{ id: string; name: string }> {
  const ctx = await getTenantContext(tenantId)

  const procedure = await prisma.procedure.findFirst({
    where: {
      id: procedureId,
      tenantId,
      ...(ctx.isNetwork && { clinicProcedures: { some: { clinicId, isActive: true } } }),
    },
    select: { id: true, name: true },
  })

  if (!procedure) {
    throw new AppError(
      ctx.isNetwork
        ? 'Procedimento não encontrado ou não ativo nesta unidade.'
        : 'Procedimento não encontrado.',
      404
    )
  }
  return procedure
}

/** Limite de profissionais (dentistas ativos) contratado no pacote. Sem limite quando maxProfessionals é null. */
export async function assertProfessionalLimit(tenantId: string): Promise<void> {
  const ctx = await getTenantContext(tenantId)
  if (ctx.maxProfessionals === null) return

  const active = await prisma.user.count({ where: { tenantId, isActive: true, role: 'DENTIST' } })
  if (active >= ctx.maxProfessionals) {
    throw new AppError(
      `Limite de profissionais do plano atingido (${ctx.maxProfessionals}). Solicite a ampliação do pacote.`,
      403
    )
  }
}
