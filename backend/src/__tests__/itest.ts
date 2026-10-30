import { prisma } from '../lib/prisma'
import { AppError } from '../shared/AppError'
import { invalidateTenantContext } from '../lib/tenantContext'
import * as patientService from '../services/patientServices'
import * as procedureService from '../services/procedureService'
import * as clinicService from '../services/clinicService'
import * as userService from '../services/userService'
import * as productService from '../services/productService'
import * as appointmentService from '../services/appointmentService'
import * as transactionService from '../services/transactionService'
import * as catalog from '../services/clinicCatalogService'
import * as dashboard from '../services/dashboardService'
import * as authService from '../services/authService'
import { auditLogService } from '../services/auditLog.service'
import { EvolutionService } from '../services/evolutionService'
import { triggerAutoStockExit } from '../utils/stockAutoExit'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) { pass++; console.log('  ✔', name) } else { fail++; console.log('  ✘ FALHOU:', name, extra !== undefined ? JSON.stringify(extra) : '') }
}
async function throws(fn: () => Promise<unknown>): Promise<AppError | Error | null> { try { await fn(); return null } catch (e) { return e as Error } }
const q = <T = any>(sql: string, ...p: any[]) => prisma.$queryRawUnsafe<T[]>(sql, ...p)
const qty = async (id: string) => Number((await q('SELECT quantity FROM products WHERE id=$1', id))[0].quantity)
const reset = async () => { await q(`UPDATE products SET quantity=10 WHERE id='PRODA'`); await q(`UPDATE products SET quantity=5 WHERE id='PRODA2'`) }
const owner = { userId: 'U_OWNER', userName: 'Dono', userRole: 'OWNER' as const }
const adminB = { userId: 'U_ADMIN_B', userName: 'Admin B', userRole: 'ADMIN' as const }
const dentA = { userId: 'U_DENT_A', userName: 'Dentista A', userRole: 'DENTIST' as const }
const mkAppt = (id: string, clinicId: string, status: string, offsetMin = 0, extra: any = {}) =>
  prisma.appointment.create({ data: { id, tenantId: 'T_ENT', clinicId, patientId: 'PAT1', dentistId: 'U_DENT_A', procedureId: 'PROC1', status: status as any, dateTime: new Date(Date.now() + offsetMin * 60000), ...extra } })

async function main() {
  console.log('\n[1] Escopo de pacientes (rede x clínica)')
  let r: { data: unknown[]; meta: { total: number } } = await patientService.listPatients('T_ENT', 'B', { cpf: '11111111111' })
  ok('Enterprise: unidade B acha por CPF paciente cadastrado na A', r.meta.total === 1 && (r.data[0] as any).clinic.name === 'Messejana', r.meta)
  r = await patientService.listPatients('T_PREM', 'P', { name: 'Ana' })
  ok('Premium: não enxerga paciente de outra clínica do tenant', r.meta.total === 0, r.meta)
  r = await patientService.listPatients('T_PREM', 'P2', { name: 'Ana' })
  ok('Premium: enxerga o da própria clínica', r.meta.total === 1)
  let e: Error | null = await throws(() => patientService.createPatient('T_ENT', 'B', { name: 'Maria', phone: '1', cpf: '111.111.111-11' }, owner))
  ok('Enterprise: CPF existente na rede -> 409 com patientId', e instanceof AppError && e.statusCode === 409 && (e.details as any)?.patientId === 'PAT1', e?.message)
  e = await throws(() => patientService.createPatient('T_PREM', 'P', { name: 'X', phone: '1', cpf: '44444444444' }, owner)) as AppError
  ok('Premium: CPF de outra clínica -> 409 sem expor o paciente', e instanceof AppError && e.statusCode === 409 && !e.details, e?.message)
  const p = await patientService.getPatientById('T_ENT', 'B', 'PAT1', { userId: 'U_ADMIN_B', userName: 'Admin B', userRole: 'ADMIN' })
  ok('getPatientById na rede devolve o paciente', p.id === 'PAT1')
  ok('acesso entre unidades gerou audit_log READ', Number((await q(`SELECT count(*) c FROM audit_logs WHERE action='READ' AND "entityId"='PAT1'`))[0].c) === 1)
  e = await throws(() => patientService.getPatientById('T_PREM', 'P', 'PP2')) as AppError
  ok('Premium: getPatientById de outra clínica -> 404', e instanceof AppError && e.statusCode === 404)

  console.log('\n[2] Baixa automática de estoque')
  await mkAppt('AP1', 'A', 'EM_ATENDIMENTO')
  const base = { tenantId: 'T_ENT', clinicId: 'A', procedureId: 'PROC1', userId: 'U_DENT_A' }
  let x: any = await triggerAutoStockExit({ ...base, appointmentId: 'AP1' })
  ok('baixa feita: 2 movimentações', x.skipped === false && x.movements.length === 2, x)
  ok('PRODA 10 -> 7', (await qty('PRODA')) === 7)
  ok('falta de insumo vira aviso (shortages) e saldo vai a 0, nunca negativo', x.shortages.length === 1 && x.shortages[0].missing === 0.5 && (await qty('PRODA2')) === 0, x.shortages)
  ok('movimentação registra a quantidade REAL (0.5) e o appointmentId', Number((await q(`SELECT quantity FROM stock_movements WHERE "productId"='PRODA2' AND "appointmentId"='AP1'`))[0].quantity) === 0.5)
  x = await triggerAutoStockExit({ ...base, appointmentId: 'AP1' })
  ok('segunda chamada: ALREADY_DISCHARGED e saldo intacto', x.skipped && x.reason === 'ALREADY_DISCHARGED' && (await qty('PRODA')) === 7)
  await reset(); await mkAppt('AP2', 'A', 'EM_ATENDIMENTO', 1)
  const par = await Promise.all([1, 2, 3, 4].map(() => triggerAutoStockExit({ ...base, appointmentId: 'AP2' })))
  ok('4 chamadas SIMULTÂNEAS: só uma baixa', par.filter((z: any) => !z.skipped).length === 1 && (await qty('PRODA')) === 7, par.map((z: any) => z.reason ?? 'baixou'))
  await mkAppt('AP_B', 'B', 'EM_ATENDIMENTO')
  x = await triggerAutoStockExit({ tenantId: 'T_ENT', clinicId: 'B', procedureId: 'PROC1', userId: 'U_SEC_B', appointmentId: 'AP_B' })
  ok('unidade B sem receita: NO_RECIPE_FOR_CLINIC e estoque da A intacto', x.skipped && x.reason === 'NO_RECIPE_FOR_CLINIC' && (await qty('PRODA')) === 7)

  console.log('\n[3] Receita por clínica')
  e = await throws(() => procedureService.setProcedureProducts('T_ENT', 'PROC1', { items: [{ productId: 'PRODA', quantity: 1 }] }, { clinicId: 'B', userId: 'U_ADMIN_B', userName: 'x', userRole: 'ADMIN' })) as AppError
  ok('B não consegue usar produto da A na receita (400)', e instanceof AppError && e.statusCode === 400, e?.message)
  const rb = await procedureService.setProcedureProducts('T_ENT', 'PROC1', { items: [{ productId: 'PRODB', quantity: 2 }] }, { clinicId: 'B', userId: 'U_ADMIN_B', userName: 'x', userRole: 'ADMIN' })
  ok('B salva a própria receita', rb.length === 1 && rb[0].productId === 'PRODB')
  ok('receita da A não foi tocada', Number((await q(`SELECT count(*) c FROM procedure_products WHERE "clinicId"='A' AND "procedureId"='PROC1'`))[0].c) === 2)
  e = await throws(() => q(`INSERT INTO procedure_products (id,"tenantId","clinicId","procedureId","productId",quantity) VALUES ('hack','T_ENT','B','PROC2','PRODA',1)`)) as Error
  ok('BANCO recusa receita da B com produto da A (FK composta)', !!e && /foreign key/i.test(e.message))

  console.log('\n[4] Limites do pacote')
  e = await throws(() => clinicService.createClinic('T_ENT', { name: 'Filial X' }, adminB)) as AppError
  ok('Enterprise: ADMIN de filial não cria unidade (403)', e instanceof AppError && e.statusCode === 403, e?.message)
  const c3 = await clinicService.createClinic('T_ENT', { name: 'Filial 3' }, owner)
  ok('OWNER cria a 3ª unidade (limite 3)', !!c3.id)
  e = await throws(() => clinicService.createClinic('T_ENT', { name: 'Filial 4' }, owner)) as AppError
  ok('4ª unidade -> 403 por limite', e instanceof AppError && e.statusCode === 403 && /Limite/.test(e.message), e?.message)
  await q(`UPDATE subscriptions SET "maxClinics"=4 WHERE "tenantId"='T_ENT'`); invalidateTenantContext('T_ENT')
  const rs = await Promise.allSettled([1, 2, 3, 4].map((i) => clinicService.createClinic('T_ENT', { name: 'Race ' + i }, owner)))
  ok('4 criações SIMULTÂNEAS com 1 vaga: exatamente 1 passa', rs.filter((z) => z.status === 'fulfilled').length === 1, rs.map((z) => z.status))
  e = await throws(() => clinicService.createClinic('T_PREM', { name: 'Outra' }, { userId: 'U_PADM', userName: 'p', userRole: 'ADMIN' })) as AppError
  ok('Premium: segunda clínica -> 403', e instanceof AppError && e.statusCode === 403, e?.message)
  e = await throws(() => userService.createUser('T_ENT', 'A', { name: 'D2', email: 'd2@r.com', password: 'x', role: 'DENTIST' }, owner)) as AppError
  ok('limite de profissionais (1) -> 403 ao criar 2º dentista', e instanceof AppError && e.statusCode === 403, e?.message)
  const sec = await userService.createUser('T_ENT', 'B', { name: 'S2', email: '  Novo@R.com ', password: 'x', role: 'SECRETARY' }, owner)
  ok('e-mail normalizado (trim + minúsculas)', sec.email === 'novo@r.com', sec.email)
  e = await throws(() => userService.createUser('T_ENT', 'B', { name: 'O2', email: 'o2@r.com', password: 'x', role: 'OWNER' }, adminB)) as AppError
  ok('ADMIN não cria OWNER (403)', e instanceof AppError && e.statusCode === 403)

  console.log('\n[5] Mass assignment bloqueado')
  const cl = await clinicService.updateClinic('T_ENT', 'B', { name: 'Meireles X', tenantId: 'T_PREM' } as any, owner)
  ok('updateClinic ignora tenantId do corpo', cl.tenantId === 'T_ENT' && cl.name === 'Meireles X')
  e = await throws(() => clinicService.updateClinic('T_ENT', 'B', { isActive: false } as any, owner)) as AppError
  ok('updateClinic: isActive só pelos endpoints próprios (400)', e instanceof AppError && e.statusCode === 400)
  const pr = await productService.updateProductService('T_ENT', 'A', 'PRODA', { name: 'Pasta A2', tenantId: 'T_PREM', clinicId: 'B' } as any)
  ok('updateProduct ignora tenantId/clinicId do corpo', pr.tenantId === 'T_ENT' && pr.clinicId === 'A' && pr.name === 'Pasta A2')
  await q(`UPDATE products SET name='Pasta A' WHERE id='PRODA'`)
  await mkAppt('AP_U', 'A', 'CONFIRMADO', 60 * 24 * 3, { room: 'SALA_2' })
  const au: any = await appointmentService.updateAppointment('T_ENT', 'A', 'AP_U', { notes: 'ok', status: 'FINALIZADO', autoStockDeducted: true, clinicId: 'B' } as any, dentA)
  ok('updateAppointment ignora status/autoStockDeducted/clinicId do corpo', au.status === 'CONFIRMADO' && au.clinicId === 'A' && au.notes === 'ok' && au.autoStockDeducted === false)
  e = await throws(() => appointmentService.updateAppointment('T_ENT', 'A', 'AP_U', { patientId: 'PP1' }, dentA)) as AppError
  ok('updateAppointment: paciente de OUTRO tenant -> 404', e instanceof AppError && e.statusCode === 404)

  console.log('\n[6] Pagamento finaliza o atendimento e baixa estoque')
  await reset(); await mkAppt('AP3', 'A', 'CONFIRMADO', 5)
  await transactionService.createTransaction('T_ENT', 'A', { type: 'RECEITA', amount: 100, paymentMethod: 'PIX', appointmentId: 'AP3' } as any, dentA)
  const a3 = (await q('SELECT status,"autoStockDeducted" FROM appointments WHERE id=$1', 'AP3'))[0]
  ok('agendamento ficou FINALIZADO e baixou estoque (10 -> 7)', a3.status === 'FINALIZADO' && a3.autoStockDeducted === true && (await qty('PRODA')) === 7, a3)
  e = await throws(() => transactionService.createTransaction('T_ENT', 'A', { type: 'RECEITA', amount: 1, paymentMethod: 'PIX', appointmentId: 'AP3' } as any, dentA)) as AppError
  ok('segundo pagamento do mesmo agendamento -> 409', e instanceof AppError && e.statusCode === 409)
  const tx: any = (await q('SELECT id FROM transactions LIMIT 1'))[0]
  const tu: any = await transactionService.updateTransaction('T_ENT', 'A', tx.id, { description: 'novo', clinicId: 'B', tenantId: 'T_PREM', appointmentId: null } as any, dentA)
  ok('updateTransaction ignora clinicId/tenantId/appointmentId do corpo', tu.clinicId === 'A' && tu.tenantId === 'T_ENT' && tu.appointmentId === 'AP3' && tu.description === 'novo')

  console.log('\n[7] Catálogo por unidade')
  r = await procedureService.listProcedures('T_ENT', 'B', {})
  ok('B nasce sem procedimentos ativos', r.meta.total === 0)
  r = await procedureService.listProcedures('T_ENT', 'B', { scope: 'catalog' })
  ok('scope=catalog mostra o catálogo da rede', r.meta.total === 2)
  await catalog.setClinicProcedure('T_ENT', 'B', 'PROC1', { isActive: true, price: 120 }, adminB)
  r = await procedureService.listProcedures('T_ENT', 'B', {})
  ok('B ativa PROC1 com preço próprio (effectivePrice 120)', r.meta.total === 1 && (r.data[0] as any).effectivePrice === 120, (r.data[0] as any)?.effectivePrice)
  r = await procedureService.listProcedures('T_ENT', 'A', { name: 'Restaura' })
  ok('A continua com o preço base (100)', (r.data[0] as any).effectivePrice === 100)
  const cl2 = await catalog.cloneClinicProcedures('T_ENT', 'A', 'B', { copyPrices: true }, owner)
  ok('clonar A->B copia só o que falta e não sobrescreve preço da B', cl2.copied === 1 && cl2.alreadyPresent === 1 && Number((await q(`SELECT price FROM clinic_procedures WHERE "clinicId"='B' AND "procedureId"='PROC1'`))[0].price) === 120, cl2)
  const rc1: any = await catalog.reconcileRecipes('T_ENT', 'A', 'B', owner)
  ok('reconciliar sem produtos na B: 0 criados, 2 pendentes', rc1.created === 0 && rc1.pending.length === 2, rc1)
  await q(`INSERT INTO products (id,"tenantId","clinicId",name,quantity,"minQuantity","updatedAt") VALUES ('PRODB2','T_ENT','B','  PASTA a ',4,1,now())`)
  const rc2: any = await catalog.reconcileRecipes('T_ENT', 'A', 'B', owner)
  ok('depois de importar o produto (nome com caixa/espaços): cria 1, resta 1 pendente', rc2.created === 1 && rc2.pending.length === 1 && rc2.pending[0].productName === 'Pomada A', rc2)
  const wr = await catalog.listProceduresWithoutRecipe('T_ENT', 'B')
  ok('procedimento ativo sem receita na B é listado', wr.some((p) => p.id === 'PROC2'), wr)
  e = await throws(() => catalog.cloneClinicProcedures('T_PREM', 'P', 'P2', {}, owner)) as AppError
  ok('catálogo por unidade exige Enterprise (403)', e instanceof AppError && e.statusCode === 403)
  e = await throws(() => procedureService.updateProcedure('T_ENT', 'PROC1', { basePrice: 1 } as any, { clinicId: 'B', ...adminB })) as AppError
  ok('Enterprise: ADMIN de filial não altera o catálogo da rede (403)', e instanceof AppError && e.statusCode === 403)
  const up = await procedureService.updateProcedure('T_ENT', 'PROC1', { basePrice: 110, tenantId: 'T_PREM' } as any, { clinicId: 'A', ...owner })
  ok('OWNER altera o catálogo; tenantId do corpo ignorado', Number(up.basePrice) === 110 && up.tenantId === 'T_ENT')

  console.log('\n[8] Evolução x agendamento (mesma visita)')
  await q(`DELETE FROM stock_movements`); await q(`UPDATE appointments SET "autoStockDeducted"=true`); await reset()
  const evo = new EvolutionService()
  await mkAppt('AP4', 'A', 'EM_ATENDIMENTO', 10)
  const ev = await evo.createEvolution('T_ENT', 'A', 'PAT1', 'U_DENT_A', { description: 'restauração 36', procedureId: 'PROC1' }, dentA)
  ok('evolução baixa o estoque UMA vez (10 -> 7) vinculada ao agendamento', (await qty('PRODA')) === 7)
  ok('trava ficou no agendamento (AP4), não na evolução', (await q('SELECT "autoStockDeducted" a FROM appointments WHERE id=$1', 'AP4'))[0].a === true && (await q('SELECT "stockDeducted" s FROM evolutions WHERE id=$1', ev.id))[0].s === false)
  await appointmentService.updateAppointmentStatus('T_ENT', 'A', 'AP4', { status: 'FINALIZADO' } as any, dentA)
  ok('finalizar o agendamento depois NÃO baixa de novo (continua 7)', (await qty('PRODA')) === 7)
  ok('evolução gravou a unidade (clinicId = A)', (await q('SELECT "clinicId" c FROM evolutions WHERE id=$1', ev.id))[0].c === 'A')
  // dois agendamentos na janela: o mais recente já baixado; o outro ainda não
  await q(`DELETE FROM stock_movements`); await q(`UPDATE appointments SET "autoStockDeducted"=true`); await reset()
  await mkAppt('AP5_old', 'A', 'EM_ATENDIMENTO', -60)
  await mkAppt('AP5_new', 'A', 'EM_ATENDIMENTO', 30, { autoStockDeducted: true })
  await evo.createEvolution('T_ENT', 'A', 'PAT1', 'U_DENT_A', { description: 'segunda visita', procedureId: 'PROC1' }, dentA)
  const old = (await q('SELECT "autoStockDeducted" a FROM appointments WHERE id=$1', 'AP5_old'))[0].a
  ok('2 agendamentos na janela, o mais recente já baixado: evolução usa o que ainda NÃO baixou', (await qty('PRODA')) === 7 && old === true, { PRODA: await qty('PRODA'), AP5_old: old })
  // evolução na unidade B para paciente da A (rede): grava a unidade B
  await q(`UPDATE users SET "clinicId"='B' WHERE id='U_ADMIN_B'`)
  const evB = await evo.createEvolution('T_ENT', 'B', 'PAT1', 'U_ADMIN_B', { description: 'retorno no Meireles' }, adminB)
  ok('Enterprise: evolução na unidade B para paciente cadastrado na A', (await q('SELECT "clinicId" c FROM evolutions WHERE id=$1', evB.id))[0].c === 'B')
  const lst: any[] = await evo.getEvolutionsByPatient('T_ENT', 'B', 'PAT1')
  ok('prontuário único: B vê evoluções das duas unidades, com o nome da unidade', lst.length >= 2 && lst.some((z) => z.clinic.name === 'Messejana') && lst.some((z) => z.clinic.name === 'Meireles X'), lst.map((z) => z.clinic?.name))
  e = await throws(() => evo.lockEvolution('T_ENT', 'B', ev.id, adminB)) as AppError
  ok('B não trava evolução registrada pela A (404)', e instanceof AppError && e.statusCode === 404)
  e = await throws(() => evo.getEvolutionsByPatient('T_PREM', 'P', 'PP2')) as AppError
  ok('Premium: prontuário de paciente de outra clínica -> 404', e instanceof AppError && e.statusCode === 404)

  console.log('\n[9] Autenticação / troca de unidade')
  let s: any = await authService.switchClinic('U_OWNER', 'T_ENT', 'B')
  ok('OWNER troca para a unidade B (token novo com clinicId B)', s.user.clinicId === 'B' && typeof s.token === 'string')
  e = await throws(() => authService.switchClinic('U_SEC_B', 'T_ENT', 'A')) as AppError
  ok('secretária de B não troca para A (403)', e instanceof AppError && e.statusCode === 403)
  await userService.assignUserToClinic('T_ENT', 'U_SEC_B', 'A', owner)
  s = await authService.switchClinic('U_SEC_B', 'T_ENT', 'A')
  ok('depois do vínculo (user_clinics), ela troca para A', s.user.clinicId === 'A')
  e = await throws(() => userService.assignUserToClinic('T_ENT', 'U_SEC_B', 'B', adminB)) as AppError
  ok('só o OWNER vincula usuário a unidade (403)', e instanceof AppError && e.statusCode === 403)
  const me: any = await authService.getMe('U_OWNER', 'T_ENT', 'B')
  ok('getMe com unidade ativa diferente da principal', me.clinic.id === 'B' && me.clinics.length >= 3)
  e = await throws(() => authService.registerTenant({ tenantName: 'X', slug: 'x1', plan: 'ENTERPRISE', adminName: 'a', email: 'x@x.com', password: 'p' } as any)) as AppError
  ok('auto-cadastro ENTERPRISE bloqueado (403)', e instanceof AppError && e.statusCode === 403)
  const rt: any = await authService.registerTenant({ tenantName: 'Nova Clinica', slug: 'nova1', adminName: 'a', email: 'novo@tenant.com', password: 'p' } as any)
  const sub = (await q(`SELECT "maxClinics" m FROM subscriptions WHERE "tenantId"=$1`, rt.tenant.id))[0]
  ok('registerTenant cria a subscription com maxClinics = 1', sub?.m === 1, sub)

  console.log('\n[10] Visão do dono da rede')
  const bd = await dashboard.getClinicsBreakdown('T_ENT')
  ok('comparativo por unidade lista as unidades ativas', bd.length >= 4 && bd.some((z) => z.name === 'Messejana'), bd.map((z) => z.name))
  const ds: any = await dashboard.getDashboardSummary('T_ENT', 'A', { network: true })
  const dsA: any = await dashboard.getDashboardSummary('T_ENT', 'A')
  ok('dashboard consolidado >= dashboard da unidade', ds.patients.total >= dsA.patients.total && ds.appointments.thisMonth >= dsA.appointments.thisMonth)
  const lg = await auditLogService.getLogs('T_ENT', null, 1, 50)
  ok('auditoria da rede (todas as unidades, com nome da unidade)', lg.total >= 1 && (lg.logs as any[]).every((l) => l.clinic?.name))

  console.log(`\n=== ${pass} passaram, ${fail} falharam ===`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
}
main().catch(async (err) => { console.error('ERRO NO TESTE:', err); await prisma.$disconnect(); process.exit(2) })
