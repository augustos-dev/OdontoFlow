import { BillingCycle, SubscriptionStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { invalidateTenantContext } from '../lib/tenantContext'

/**
 * Entrega de um pacote ENTERPRISE (feito por você, não pelo cliente).
 * Em uma transação: marca o tenant como ENTERPRISE, grava os limites contratados,
 * promove o dono da rede a OWNER e ativa o catálogo atual nas clínicas existentes.
 *
 * Uso (script/admin interno):
 *   await provisionEnterprise({ tenantId, maxClinics: 5, maxProfessionals: 20, ownerUserId })
 */
export interface ProvisionEnterpriseInput {
  tenantId: string
  maxClinics: number
  maxProfessionals?: number | null
  ownerUserId?: string
  billingCycle?: BillingCycle
  status?: SubscriptionStatus
  currentPeriodEnd?: Date
}

export async function provisionEnterprise(input: ProvisionEnterpriseInput) {
  const { tenantId, maxClinics, maxProfessionals = null, ownerUserId } = input

  if (!Number.isInteger(maxClinics) || maxClinics < 1) {
    throw new AppError('maxClinics deve ser um inteiro >= 1.', 400)
  }
  if (maxProfessionals !== null && (!Number.isInteger(maxProfessionals) || maxProfessionals < 1)) {
    throw new AppError('maxProfessionals deve ser um inteiro >= 1 (ou null para sem limite).', 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new AppError('Tenant não encontrado.', 404)

    const clinicCount = await tx.clinic.count({ where: { tenantId, isActive: true } })
    if (maxClinics < clinicCount) {
      throw new AppError(`O tenant já tem ${clinicCount} clínicas ativas; maxClinics não pode ser menor.`, 400)
    }

    if (maxProfessionals !== null) {
      const dentists = await tx.user.count({ where: { tenantId, isActive: true, role: 'DENTIST' } })
      if (maxProfessionals < dentists) {
        throw new AppError(`O tenant já tem ${dentists} dentistas ativos; maxProfessionals não pode ser menor.`, 400)
      }
    }

    const status = input.status ?? 'ACTIVE'
    const billingCycle = input.billingCycle ?? tenant.billingCycle

    await tx.tenant.update({
      where: { id: tenantId },
      data: { plan: 'ENTERPRISE', status, billingCycle },
    })

    const periodEnd = input.currentPeriodEnd ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    await tx.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'ENTERPRISE',
        status,
        billingCycle,
        currentPeriodEnd: periodEnd,
        maxClinics,
        maxProfessionals,
      },
      update: {
        plan: 'ENTERPRISE',
        status,
        billingCycle,
        maxClinics,
        maxProfessionals,
        ...(input.currentPeriodEnd && { currentPeriodEnd: input.currentPeriodEnd }),
      },
    })

    if (ownerUserId) {
      const owner = await tx.user.findFirst({ where: { id: ownerUserId, tenantId } })
      if (!owner) throw new AppError('Usuário dono da rede não encontrado neste tenant.', 404)
      await tx.user.update({ where: { id: ownerUserId }, data: { role: 'OWNER' } })
    }

    // Catálogo: clínicas existentes passam a oferecer todos os procedimentos atuais (comportamento de hoje).
    // Clínicas criadas depois nascem vazias.
    const clinics = await tx.clinic.findMany({ where: { tenantId }, select: { id: true } })
    const procedures = await tx.procedure.findMany({ where: { tenantId }, select: { id: true } })
    const { count } = await tx.clinicProcedure.createMany({
      data: clinics.flatMap((c) =>
        procedures.map((p) => ({ tenantId, clinicId: c.id, procedureId: p.id, isActive: true }))
      ),
      skipDuplicates: true,
    })

    return { tenantId, plan: 'ENTERPRISE' as const, maxClinics, maxProfessionals, clinicProcedureLinks: count }
  })

  invalidateTenantContext(tenantId)
  return result
}
