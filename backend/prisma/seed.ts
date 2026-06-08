import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })
async function main() {
  console.log('🌱 Iniciando a semeadura do ambiente de testes do OdontoFlow...')

  // 1. O Tenant representa a EMPRESA DO CLIENTE que comprou o software (Não a Omnia Tech)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sorriso-prime' },
    update: {},
    create: {
      name: 'Clínicas Sorriso Prime', 
      slug: 'sorriso-prime',
      plan: 'ENTERPRISE', 
      isActive: true,
    },
  })

  // 2. A Clinic representa a FILIAL física onde o atendimento acontece
  const existingClinic = await prisma.clinic.findFirst({
    where: { tenantId: tenant.id },
  })

  let clinic = existingClinic

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        tenantId: tenant.id,
        name: 'Sorriso Prime - Filial Centro', 
        cnpj: '11222333000199',
        isActive: true,
      },
    })
  }

  console.log('\n======================================================')
  console.log('✅ AMBIENTE DE TESTE CONFIGURADO COM SUCESSO!')
  console.log('======================================================')
  console.log(`📦 PRODUTO SAAS:   OdontoFlow (Gerenciado via Omnia Tech)`)
  console.log('------------------------------------------------------')
  console.log(`🏢 CLIENTE (Tenant): ${tenant.name}`)
  console.log(`🆔 tenantId:         ${tenant.id}`)
  console.log('------------------------------------------------------')
  console.log(`🏥 UNIDADE (Clinic): ${clinic.name}`)
  console.log(`🆔 clinicId:         ${clinic.id}`)
  console.log('======================================================')
  console.log('👉 Use esses IDs no Postman/Bruno para simular o cliente real!\n')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })