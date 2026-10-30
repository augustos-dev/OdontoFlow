/**
 * Entrega de pacote Enterprise (uso interno; não é uma rota HTTP).
 *
 *   npx tsx scripts/provision-enterprise.ts --tenant <tenantId> --clinics 5 --professionals 20 --owner <userId>
 *
 * --professionals e --owner são opcionais (sem --professionals = sem limite).
 */
import 'dotenv/config'
import { provisionEnterprise } from '../src/services/enterpriseProvioningService'
import { prisma } from '../src/lib/prisma'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const tenantId = arg('tenant')
  const maxClinics = Number(arg('clinics'))
  const professionals = arg('professionals')
  const ownerUserId = arg('owner')

  if (!tenantId || !Number.isInteger(maxClinics)) {
    console.error('Uso: --tenant <id> --clinics <n> [--professionals <n>] [--owner <userId>]')
    process.exit(1)
  }

  const result = await provisionEnterprise({
    tenantId,
    maxClinics,
    maxProfessionals: professionals ? Number(professionals) : null,
    ownerUserId,
  })
  console.log('Enterprise provisionado:', result)
  console.log('Obs.: se a API já estiver rodando, o cache de plano expira em até 30s.')
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
