import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// 1. Reutiliza ou cria o Pool do PG no global
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

// Sem este listener, uma conexão ociosa que o banco derruba (restart, pooler do Supabase) emite 'error' sem tratador,
// vira uncaughtException e o server.ts encerra o processo inteiro.
if (!globalForPrisma.pool) {
  pool.on('error', (err) => {
    console.error('[pg pool] erro em conexão ociosa (será recriada):', err.message)
  })
}

const adapter = new PrismaPg(pool)

// 2. Reutiliza ou cria o PrismaClient com o Adapter
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// 3. Salva as instâncias no objeto global em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}