import { prisma } from '../lib/prisma'

interface TriggerAutoStockExitParams {
  tenantId: string
  clinicId: string
  procedureId: string
  userId: string
  appointmentId?: string
}

export async function triggerAutoStockExit(params: TriggerAutoStockExitParams) {
  const { tenantId, clinicId, procedureId, userId, appointmentId } = params

  // 1. TRAVA DE IDEMPOTÊNCIA: Evita baixa duplicada para o mesmo agendamento
  if (appointmentId) {
    const existingMovement = await prisma.stockMovement.findFirst({
      where: {
        tenantId,
        clinicId,
        type: 'EXIT_AUTO',
        reason: {
          contains: appointmentId,
        },
      },
    })

    if (existingMovement) {
      console.log(`[EXIT INTELIGENTE] Baixa já realizada para o agendamento ${appointmentId}. Operação ignorada.`)
      return { skipped: true, reason: 'ALREADY_DISCHARGED' }
    }
  }

  // 2. Busca os insumos da Ficha Técnica do procedimento
  const procedureProducts = await prisma.procedureProduct.findMany({
    where: { procedureId, tenantId },
    include: { product: true },
  })

  if (!procedureProducts || procedureProducts.length === 0) {
    return { skipped: true, reason: 'NO_PRODUCTS_IN_RECIPE' }
  }

  // 3. Executa a baixa atômica
  return await prisma.$transaction(async (tx) => {
    const movements = []

    for (const item of procedureProducts) {
      const product = item.product
      if (!product) continue

      let exitQty = Number(item.quantity)

      // Conversão Caixa (CX) -> Unidade (UN)
      if (product.unit === 'CX' && item.unit === 'UN') {
        const pkgCount = product.itemsPerPackage || 100
        exitQty = exitQty / pkgCount
      }

      const newQty = Math.max(0, product.quantity - exitQty)

      // Atualiza saldo no estoque
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQty },
      })

      // Registra a movimentação
      const mov = await tx.stockMovement.create({
        data: {
          tenantId,
          clinicId,
          productId: product.id,
          userId,
          type: 'EXIT_AUTO',
          quantity: exitQty,
          reason: `Exit Inteligente: Procedimento Realizado (Agendamento: ${appointmentId || 'Evolução Direta'})`,
        },
      })

      movements.push(mov)
    }

    return { skipped: false, movements }
  })
}