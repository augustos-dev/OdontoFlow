# Rede de clínicas (Enterprise): pacote de mudanças

Gerado a partir do seu `schema.prisma`, dos types, middlewares e services enviados.
**O que foi verificado:** o schema valida e o client é gerado; todo o código compila em `strict`;
a migration foi aplicada num PostgreSQL 16 com dados semeados e a estrutura final ficou idêntica à do schema novo;
o SQL da baixa de estoque e a FK composta foram testados nesse banco.
**O que NÃO foi verificado:** as queries Prisma rodando de verdade (o ambiente não consegue baixar o engine do Prisma).
Teste num branch do Supabase antes de produção.

## 1. Ordem de aplicação
1. Backup do banco.
2. Rode `scripts/preflight.sql` (somente leitura) e leia o resultado.
3. Copie `prisma/schema.prisma` e as duas pastas de `prisma/migrations/` (devem rodar nesta ordem:
   `..._add_owner_read_enums`, depois `..._enterprise_network`) e execute `npx prisma migrate deploy`.
4. Copie os arquivos de `src/` por cima dos seus (mesmos nomes). Veja `diffs/` para revisar cada mudança.
5. `npx prisma generate` e `npx tsc --noEmit`: os erros de compilação apontam exatamente os controllers a ajustar (seção 3).
6. No boot do servidor, chame `assertRequiredEnv()` (de `config/env.ts`) logo após carregar o dotenv.

Rollback: `scripts/rollback.sql` (valores de enum `OWNER`/`READ` não são removíveis; são inofensivos).

## 2. Regras implementadas
| Regra | Onde |
|---|---|
| Basic/Premium = 1 clínica; Enterprise = `maxClinics` contratado | `clinicService.createClinic/reactivateClinic` (com trava contra criação simultânea) |
| Limite de profissionais (dentistas ativos) | `userService`, `authService.register` |
| Enterprise: paciente, prontuário e evoluções valem para a rede (busca por CPF em qualquer unidade) | `lib/tenantContext.ts` (`patientScope`) aplicado em patients, prontuário, agenda, orçamentos |
| Demais planos: tudo por clínica (como hoje) | mesma função |
| Cada evolução registra a unidade (`evolutions.clinicId`) | schema + `medicalRecordService` + `evolutionService` |
| Procedimento é da rede; cada unidade ativa o que oferece e pode ter preço próprio | `clinic_procedures`, `procedureService`, `clinicCatalogService` |
| Receita (ficha técnica) é por clínica; o banco recusa insumo de outra clínica | `procedure_products.clinicId` + FK composta |
| Baixa automática só da clínica do atendimento, atômica e sem saldo negativo | `utils/stockAutoExit.ts` |
| Filial nova nasce vazia; "copiar da unidade X" gera registros novos | `cloneClinicProcedures`, `reconcileRecipes` |
| Dono da rede (`OWNER`) troca de unidade; demais usam `user_clinics` | `authService.switchClinic`, `userService.assignUserToClinic` |
| Entrega do pacote Enterprise | `enterpriseProvisioningService.provisionEnterprise(...)` |
| Acesso a paciente/prontuário de outra unidade fica no `audit_logs` (`action: READ`) | patients/medicalRecord |

## 3. Controllers e rotas
> **Atualização:** a segunda leva (controllers + rotas) já está aplicada em `src/controllers/` e `src/routes/`. Veja a **seção 7**.
> O texto abaixo é o que eu havia listado antes de receber os controllers.
**Assinaturas que mudaram (o compilador vai apontar):**
- `listProcedures(tenantId, clinicId, filters)`, `getProcedureById(tenantId, clinicId, id)`, `getProcedureProducts(tenantId, clinicId, procedureId)`: agora recebem `clinicId`.
- `setProcedureProducts`: o `actor.clinicId` passou a ser obrigatório.
- `getPatientById(..., actor?)` e `getMedicalRecordByPatient(..., actor?)`: passe o `actor` para registrar o acesso entre unidades.
- Qualquer outro lugar que crie `Evolution` (ex.: serviço de transcrição por IA) precisa passar `clinicId`.
- `stockService.processAutoStockDeduction` ficou sem uso: apague depois de buscar outras referências.

**Rotas novas sugeridas:** `GET /auth/clinics` (`listAccessibleClinics`), `POST /auth/switch-clinic` (`switchClinic`),
`PATCH /clinics/:id/procedures/:procedureId` (`setClinicProcedure`), `POST /clinics/:id/procedures/clone`,
`POST /clinics/:id/recipes/reconcile`, `GET /clinics/:id/procedures-without-recipe`,
`POST/DELETE /users/:id/clinics/:clinicId`.

**Resposta nova no `PATCH .../status` do agendamento:** quando falta insumo, vem `stockWarnings` (o atendimento não é bloqueado).
Um CPF já cadastrado na rede devolve 409 com `details: { code: 'PATIENT_EXISTS_IN_NETWORK', patientId }` para o front abrir o paciente existente.

## 4. Correções de segurança/integridade que fiz (leia antes de subir)
1. **[LATENTE: ver seção 9] Vazamento de prontuário no link público de anamnese** (`getPublicAnamnesisByToken`): o fallback `{ id: token.length === 36 ? token : undefined }`
   virava `{}` dentro do `OR` e o Prisma devolvia o PRIMEIRO token da tabela (nome do paciente + prontuário) para qualquer token inválido. Removido.
   O link agora também é de uso único (antes `usedAt` não era checado).
2. **`JWT_SECRET` com fallback** (`'secret'`, `'fallback_secret'`, etc.): quem soubesse o fallback forjava token com qualquer `tenantId`/`role`.
   Agora o servidor exige a variável (mínimo 32 caracteres). **Atenção:** se hoje produção roda sem `JWT_SECRET` definido, defina uma antes de subir
   (todos terão de fazer login de novo).
3. **Evolução atribuída a usuário aleatório:** se o `dentistId` não era achado, o `CreateEvolution` gravava a evolução em nome de qualquer usuário ativo do tenant. Agora retorna 404.
4. **`updateAppointment` aceitava `patientId`/`dentistId`/`procedureId` sem validar** (referência a outro tenant). Agora valida.
5. **Auto-cadastro como ENTERPRISE:** `registerTenant` aceitava `plan: 'ENTERPRISE'` vindo do cliente. Agora é bloqueado (Enterprise só via `provisionEnterprise`).
6. **Baixa de estoque duplicada:** havia dois caminhos (agendamento e evolução) e só um tinha trava, feita por `reason LIKE` fora de transação.
   Agora há um único caminho com trava atômica; evolução e agendamento da mesma visita (±12h, mesmo paciente/procedimento) baixam uma vez só.
   Também não clampa mais o saldo em silêncio com movimentação inconsistente: registra a quantidade realmente baixada.
7. **Plano lido do JWT:** `planMiddleware` e o escopo de dados agora leem o plano do banco (cache de 30 s). Upgrade/cancelamento valem sem novo login.
8. **RBAC:** a regra da unidade agora tem prioridade sobre a regra global (o `findFirst` não ordenava).
9. **`getMe` quebraria após trocar de unidade** (filtrava por `users.clinicId`): corrigido.
10. `userService.createUser` não normalizava o e-mail (o login normaliza): e-mail com maiúscula nunca conseguia entrar.
11. `registerTenant` ignorava `billingCycle` e nunca criava a linha em `subscriptions` (a migration cria as faltantes).

## 5. Decisões que assumi (mude se discordar)
- **Papel `OWNER`** (opção A): dono da rede, com bypass de RBAC e `authorize('ADMIN')` também o aceita. Só `OWNER` abre unidades no Enterprise.
- **"Profissionais" = usuários ativos com papel `DENTIST`.**
- **Fonte do plano = `tenants.plan`** (é o que o login já usa). `subscriptions` guarda os limites e o período. Mantenha os dois em sincronia
  (use `provisionEnterprise` para mudar para Enterprise).
- **Enterprise sem linha de subscription** é tratado como `maxClinics = 1` até ser provisionado.
- **Orçamentos:** a listagem geral continua por unidade (visão financeira); ao consultar um paciente específico, o Enterprise mostra os planos dele na rede toda. Alterar/aprovar/excluir continua só na unidade dona.
- **Evoluções:** só a unidade que registrou pode editar/travar.
- **Agenda:** o dentista não pode ter dois horários sobrepostos em unidades diferentes; sala só conflita dentro da mesma unidade.
- **Catálogo por unidade só vale no Enterprise.** Tenants que já eram Enterprise ganham todos os procedimentos ativos em todas as unidades (migration).

## 6. Ainda não coberto (preciso destes arquivos)
- **Importação de planilha de produtos** (não recebi): precisa só garantir `clinicId` da sessão, prévia/validação e checagem de duplicados.
- **Controllers/rotas.**
- **Outros services que consultam paciente por `clinicId`** (financeiro/recebíveis, convênios, contratos, tarefas, arquivos do prontuário, pré-cadastro, anamnese pública, dashboard).
  Enquanto não usarem `patientScope`, no Enterprise eles não enxergam pacientes cadastrados em outra unidade.
- **Lotes:** a baixa usa o registro de produto da receita (um lote). Produtos com o mesmo nome em lotes diferentes não são consumidos por validade (FEFO); isso já era assim.


## 7. Controllers e rotas (segunda leva)

**Arquivos alterados:** `authController`, `patientController`, `medicalRecordController`, `procedureController`, `userController`,
`auth.routes`, `clinic.routes`, `user.routes`. **Novos:** `clinicCatalogController`, `middlewares/clinicAccess.ts`, `scripts/provision-enterprise.ts`.
Não precisaram de mudança: `apponitmentController`, `evolutionController`, `treatmentController`, `productController`,
`supplierController`, `transactionController`, `clinicController`, `auditLogController` (as assinaturas dos services que eles chamam não mudaram).

### Achados nos controllers/rotas (do mais grave ao menos)
1. **`POST /auth/register` era público** e recebia `tenantId`, `clinicId` e `role` do corpo: qualquer pessoa que conhecesse (ou obtivesse) um `tenantId`/`clinicId`
   criava um usuário **ADMIN** nesse tenant. Agora exige ADMIN/OWNER autenticado, o `tenantId` vem do token e só o OWNER escolhe a unidade.
   Se a landing page usa essa rota sem login, ela precisa usar a rota de onboarding (`registerTenant`), que não recebi.
2. **O ADMIN de uma unidade podia editar, configurar e desativar outras unidades da rede**: as rotas só checavam o papel, e o service só filtra por `tenantId`.
   Novo `ownClinicOrOwner` (só no Enterprise): ou é o OWNER, ou é o admin da própria unidade. Desativar/reativar unidade na rede é só do OWNER (no service).
3. **`GET /users/permissions/:role` estava quebrado:** o controller chamava `getRolePermissions(tenantId, role)` e o service exige `(tenantId, clinicId, role)`;
   o papel caía no parâmetro `clinicId`. Isso só passa porque o projeto aparentemente roda sem checagem de tipos (tsx/ts-node em modo transpile).
   Recomendo rodar `npx tsc --noEmit` no CI. Corrigido, com validação do papel.
4. **`types/express.d.ts` conflita com `authMiddlewares.ts`:** os dois declaram `Request.user` com tipos diferentes (`CustomJwtPayload` x `JwtPayload`), o que o `tsc` recusa (TS2717).
   Escolha um dos dois (sugiro manter só o de `authMiddlewares`, que é o que tem `sub`/`plan`).
5. **`loginLimiter` não aparece em nenhuma rota enviada.** Confirme que está montado em `/auth/login` no `app.ts`.
6. **`evolutionController` x `medicalRecordController`** (o primeiro é código morto: nenhuma rota o usa): há dois caminhos para criar evolução. O do `evolutionController` guarda `file.filename` dos anexos, que não existe com o
   `multer.memoryStorage()` do seu `uploadMiddleware` (os anexos ficariam `undefined`). O do `medicalRecordController` envia ao Supabase corretamente. Se a rota do `evolutionController` não for usada, remova-a.
7. **`stockMovementController`** não tem `try/catch` nem `next(error)`: no Express 4 um erro assíncrono vira *unhandled rejection* e a requisição fica pendurada
   (a menos que use `express-async-errors`).
   *Correção:* eu havia dito que os `auditLogService.createLog(...)` sem `await` do `productController` eram um risco. Não são: o `createLog` captura os próprios erros.

### Rotas novas
| Rota | Quem | Para quê |
|---|---|---|
| `GET /auth/clinics` | autenticado | unidades que posso acessar (OWNER: todas) |
| `POST /auth/switch-clinic` `{ clinicId }` | autenticado | novo token com a unidade ativa |
| `PATCH /clinics/:id/procedures/:procedureId` `{ isActive?, price? }` | ADMIN da unidade ou OWNER | ativar procedimento e preço da unidade |
| `POST /clinics/:id/procedures/clone` `{ fromClinicId, copyPrices? }` | idem | "copiar da unidade X" (`:id` = destino) |
| `POST /clinics/:id/recipes/reconcile` `{ fromClinicId }` | idem | recriar receitas depois de importar os produtos da filial |
| `GET /clinics/:id/procedures-without-recipe` | idem | procedimentos ativos que não baixam estoque na unidade |
| `GET/POST/DELETE /users/:id/clinics[/:clinicId]` | ADMIN (vincular/desvincular: OWNER) | usuário em várias unidades |
| `GET /procedures?scope=catalog` | autenticado | catálogo completo da rede (padrão: só o que a unidade oferece) |
| `GET /patients?clinicId=...&phone=...&insuranceName=...` | autenticado | filtros que o controller antigo descartava |

### Fluxo de uso na rede
1. Você entrega: `npx tsx scripts/provision-enterprise.ts --tenant <id> --clinics 5 --professionals 20 --owner <userId>`.
2. O OWNER cria a unidade nova (`POST /clinics`) e troca para ela (`POST /auth/switch-clinic`).
3. Copia os procedimentos (`.../procedures/clone`) e ajusta preços (`.../procedures/:procedureId`).
4. Importa a planilha de produtos (já com a unidade ativa), depois `.../recipes/reconcile` e confere `.../procedures-without-recipe`.
5. Cria os usuários da filial já na unidade ativa, ou vincula quem atua em mais de uma (`/users/:id/clinics/:clinicId`).

### Ainda pendente
`dashboardService`, `stockService`, `supplierService`, `transactionService`, `auditLogService`, a importação de planilha, as rotas restantes
e o `registerTenant` (onboarding). Dashboard e auditoria hoje filtram só pela unidade ativa: o OWNER não tem visão consolidada da rede.


## 8. Terceira leva (rotas restantes + services de estoque, financeiro, dashboard e auditoria)

**Alterados:** `appointmentService`, `clinicService`, `procedureService` (ajustes da leva anterior), `productService`, `transactionService`, `stockService`,
`dashboardService`, `auditLog.service`, `dashboardController`, `auditLogController`, `dashboard.routes`. **Novo:** `shared/pick.ts`.
Sem mudança: `index.ts`, `patient/medicalRecord/procedure/product/stockMovement/supplier/transaction/treatment.routes`, `supplierService`.

### Achados
1. **Mass assignment em 5 `update`** (grave). `appointmentService.updateAppointment`, `clinicService.updateClinic`, `procedureService.updateProcedure`,
   `productService.updateProductService` e `transactionService.updateTransaction` passavam o corpo da requisição inteiro para o Prisma, e o Prisma aceita campos de FK num `update`
   (compilei um exemplo para confirmar). Um cliente que enviasse `{"tenantId": "..."}` ou `{"clinicId": "..."}` movia o registro para outro tenant/unidade;
   no agendamento também dava para forçar `status: 'FINALIZADO'` ou `autoStockDeducted: false`. Agora cada `update` usa uma lista explícita (`pick`).
   Efeitos colaterais: `PUT /clinics/:id` não aceita mais `isActive` (devolve 400 apontando para `/deactivate` e `/reactivate`; reativar por PUT burlaria o `maxClinics`);
   no `transactionService` a lista é `type, amount, paymentMethod, description, category, supplierId, treatmentPlanId, costCenter, isReconciled`
   (não recebi o `UpdateTransactionDTO`: se houver outro campo editável, inclua em `ALLOWED`). `quantity` continua editável pelo update do produto (como antes), o que
   contorna o histórico de movimentações. Recomendo tirar de lá e exigir o ajuste de estoque.
2. **Finalizar o atendimento pelo pagamento não baixava estoque.** `createTransaction` com `appointmentId` marcava o agendamento como `FINALIZADO` direto, sem passar pelo Exit Inteligente.
   Agora dispara `triggerAutoStockExit` (idempotente). A finalização também passou a ocorrer **depois** de gravar a transação (antes, se a criação falhasse, o agendamento já estava finalizado).
3. **No Enterprise, o ADMIN de uma unidade alterava/excluía o catálogo compartilhado da rede** (nome, preço base, exclusão). Agora, na rede, `updateProcedure`/`deleteProcedure` são só do OWNER.
   Criar continua com o ADMIN. A unidade ajusta ativação e preço em `/clinics/:id/procedures/:procedureId`. **Isso muda o comportamento para admins de filial.**
4. **Pagamento recebido em outra unidade:** `createTransaction` exigia que o plano de tratamento fosse da mesma clínica. No Enterprise agora aceita planos da rede
   (a receita fica na unidade que recebeu).
5. **`stockService`:** a saída manual lia o saldo, comparava e só depois fazia `increment`: duas saídas simultâneas deixavam o saldo negativo. Agora é um `UPDATE` condicional atômico.
   `processAutoStockDeduction` foi **removida** (era por tenant, não por clínica, sem trava de idempotência e aceitava saldo negativo).
6. **Histórico de estoque com sinais inconsistentes (não alterei):** `stockService.createStockMovement` grava `quantity` **negativa** nas saídas; `productService.adjustStock`,
   o cadastro inicial e o Exit Inteligente gravam **positiva** e deixam o `type` indicar o sentido (a antiga `processAutoStockDeduction` gravava negativa). Somar por tipo ou conciliar saldo não fecha.
   Sugestão: padronizar em "quantidade positiva + `type`" (`netQuantity` → `quantity` no `createStockMovement`) e, se o front não depender do sinal,
   corrigir o passado com `UPDATE stock_movements SET quantity = abs(quantity) WHERE quantity < 0;`.
7. **`dashboardService`** carregava **todos** os produtos em memória só para contar estoque baixo; agora conta no banco. Os cálculos de "hoje/semana/mês" usam o fuso do servidor,
   enquanto o resto do sistema usa limites em UTC (`T00:00:00.000Z`): num servidor UTC, "hoje" em Fortaleza (UTC-3) termina às 21h. Não alterei.
8. **`auditLogController`:** `?limit=` não tinha teto (`limit=1000000` lia a tabela inteira). Agora o máximo é 100.
9. **`supplier.routes` não tem `authorize`:** qualquer papel (inclusive DENTIST) cria, edita e exclui fornecedor. Sugestão: `authorize('ADMIN', 'SECRETARY')` nas escritas. Não alterei.
10. **`types/AuditLog.types.ts`:** se `CreateAuditLogInput.action` for uma união literal (`'CREATE' | 'UPDATE' | ...`), inclua `'READ'` (ou use o `AuditAction` do Prisma),
    senão os logs de acesso entre unidades não compilam.

### Visão do dono da rede (OWNER)
- `GET /dashboard/summary|revenue-chart|upcoming-appointments|top-dentists?scope=network`: consolidado da rede (403 para quem não é OWNER).
- `GET /dashboard/clinics-breakdown`: comparativo do mês por unidade (receita, despesa, lucro, atendimentos, pacientes novos).
- `GET /audit-logs?scope=network`: auditoria de todas as unidades, com o nome da unidade em cada linha.
- Financeiro (`/transactions`, `/transactions/report`) e estoque continuam por unidade ativa. Para consolidar, use o dashboard ou troque de unidade.

### Ainda pendente (não recebi)
- `app.ts` e as rotas públicas: o `index.ts` não monta `registerTenant`, anamnese pública, pré-cadastro nem IA/contratos/tarefas, mas o schema tem essas tabelas
  (`account_receivables`, `insurance_*`, `clinical_contracts`, `clinic_tasks`, `dentist_commissions`, `clinical_ai_transcriptions`, `medical_files`, `public_pre_registrations`).
  Se existirem em outro arquivo, mande: eles filtram paciente por `clinicId` e precisam do mesmo `patientScope` (e o fluxo do link de anamnese é onde corrigi o vazamento).
- Importação de planilha de produtos.


## 9. Quarta leva (`server.ts`, `prisma.ts`) e correções ao que eu disse antes

Os arquivos com sufixo `_1` eram idênticos aos já enviados. Os únicos novos foram `server.ts` e `prisma.ts`.

### Correções
- **O vazamento da anamnese pública é latente, não ativo.** Nenhum controller ou rota importa `getPublicAnamnesisByToken`, `updatePublicAnamnesisByToken` nem `generateAnamnesisToken`,
  e o `server.ts` só monta o router do `index.ts`. Hoje ele é inalcançável; a correção vale para o dia em que a rota for exposta. Eu o tratei como urgência máxima, mas o que está **de fato exposto** e é
  mais grave é o `POST /auth/register` público (seção 7) e o mass assignment (seção 8).
- **`registerTenant` também não está roteado** (então o bloqueio de ENTERPRISE no auto-cadastro é latente). Se contas são criadas à mão ou por seed, ótimo. Se for expor um onboarding, ponha rate limit e mantenha o bloqueio.
- **Código morto:** `rateLimiter.middleware`, `audioUpload.middleware` e `evolutionController` não são usados por nada.
- **Funcionalidades sem rota hoje:** pré-cadastro, IA, contratos, tarefas, comissões, recebíveis e convênios têm tabelas no schema mas nenhuma rota. Não há o que corrigir agora.
  Quando forem implementados, filtre paciente com `patientScope` e valide toda referência recebida do cliente.

### Achados no `server.ts` / `prisma.ts` (todos corrigidos nos arquivos novos)
1. **Rate limit não estava montado.** `loginLimiter` e `apiLimiter` existiam, mas ninguém os usava. O login só tinha o bloqueio de conta (5 erros = 15 min), que deixa qualquer pessoa travar a conta de outra
   sabendo o e-mail, sem limite por IP. Agora `apiLimiter` está em `/api` e `loginLimiter` em `/api/auth/login`. Como o limiter é por IP e uma clínica inteira costuma sair por um IP só,
   o teto geral passou de 300 para **1500/15 min** (configurável em `API_RATE_LIMIT_MAX`). Atrás de proxy, defina `TRUST_PROXY=1`, senão todos os usuários viram o IP do proxy.
2. **`/uploads` é público e sem autenticação.** Qualquer pessoa com a URL baixa o arquivo, e `/uploads/temp` (onde o `audioUpload` grava áudios de consultas) está dentro dele.
   Bloqueei `/uploads/temp` e `dotfiles`, mas o certo é **remover a rota** se nada local depende dela. **Verifique também o `storageService`:** se o bucket do Supabase for público,
   radiografias e exames (`evolutions.attachments`, `medical_files.url`) são acessíveis por URL sem login. Para dado de saúde use bucket privado e URL assinada.
3. **`unhandledRejection` → `process.exit(1)` derruba a API inteira.** No Express 4, qualquer erro em handler `async` sem `try/catch` vira `unhandledRejection` e encerra o servidor para **todos** os tenants.
   O `stockMovementController` era assim: tentar uma saída maior que o saldo (um 400 de negócio) derrubava a API. Corrigido com `try/catch`. Se vocês usam Express 5, esses erros iriam para o `errorHandler`;
   confirme a versão no `package.json`. Sugiro também que esse handler só registre o erro em vez de encerrar o processo.
4. **Pool do `pg` sem `pool.on('error')`.** Uma conexão ociosa derrubada pelo banco (restart, pooler do Supabase) emitia `error` sem tratador, virava `uncaughtException` e o `server.ts` encerrava o processo.
   Adicionei o listener, timeouts e `DB_POOL_MAX`.
5. **`errorHandler`:** violação de unicidade (dois cadastros simultâneos com o mesmo CPF), FK, registro inexistente, JSON inválido, arquivo grande demais e erros do multer viravam 500. Agora viram 409, 404, 400 e 413.
6. **CORS `origin: '*'`.** Defina `CORS_ORIGINS="https://app...,https://..."`; sem a variável o comportamento antigo continua, com aviso em produção.

### Variáveis de ambiente
`JWT_SECRET` (obrigatória, ≥ 32 caracteres), `CORS_ORIGINS`, `TRUST_PROXY`, `API_RATE_LIMIT_MAX`, `DB_POOL_MAX`.

### Não recebi / falta confirmar
`package.json` (versão do Express), `storageService.ts` e a configuração do bucket, `docs/Swagger` (as rotas novas não estão documentadas) e `types/AuditLog.types.ts`.
Também não adicionei `helmet`; vale instalar.


## 10. Quinta leva (`package.json`, `tsconfig`, `storageService`, `supabase`) + testes automatizados

### Sua stack e como validei
`package.json`/`package-lock.json`: **Prisma 7.8.0** (`@prisma/client`, `adapter-pg`), **Express 5.2.1**, TypeScript 5.9.3, tsx, `strict: true`, alvo ES2020.
Até aqui eu tinha validado com Prisma 6.19; refiz tudo com as **suas versões**: o código compila com o seu `tsconfig`, e o Prisma 7 roda sem o engine em Rust,
então consegui **executar os services de verdade** contra um PostgreSQL 16 (com `adapter-pg`):

| Suíte | Resultado |
|---|---|
| `tests/itest.ts`: 65 verificações sobre os services (escopo de rede, baixa de estoque, limites, mass assignment, catálogo, evolução, troca de unidade, dashboard, auditoria) | 65 passaram |
| `tests/unit_storage.ts`: funções de anexos (caminhos, URLs, validação) | 11 passaram |

Para rodar no seu ambiente: banco de **teste vazio** → `npx prisma migrate deploy` → `psql -f tests/seed.sql` →
`DATABASE_URL=... JWT_SECRET=<32+ caracteres> SUPABASE_URL=https://x.supabase.co SUPABASE_SERVICE_KEY=k npx tsx tests/itest.ts`
(sugestão: `"test:rede": "tsx tests/itest.ts"` no `package.json`).

**Um bug que os testes pegaram em código meu** (já corrigido em `utils/stockAutoExit.ts`): com dois agendamentos do mesmo paciente na janela de 12 h, se o mais recente
já tinha baixado estoque, a evolução não baixava nada. Agora ela prefere o agendamento da visita que **ainda não** baixou; se todos já baixaram, entende que a visita foi contabilizada.

### Antes de subir: instale o `express-rate-limit`
Ele **não está** nas suas dependências (por isso o `rateLimiter.middleware` nunca foi usado). O `server.ts` novo o importa, então sem isto **o servidor não sobe**:
`npm i express-rate-limit`. (Também sugiro `npm i helmet`.)

### Correções ao que eu disse antes
- **Express 5:** erros em handlers `async` são encaminhados ao `errorHandler`. Então o `stockMovementController` sem `try/catch` **não derrubava a API**, como eu havia afirmado
  (eu tinha condicionado isso ao Express 4). O `try/catch` que adicionei é inofensivo. O `process.on('unhandledRejection') → exit(1)` continua sendo um risco para código assíncrono "solto" (fora de handler).
- O `pool.on('error')` no `prisma.ts` continua necessário: é independente da versão do Express.

### `storageService` / `supabase`
**Confirmado: o bucket `odontoflow-uploads` é público** (`getPublicUrl`). Radiografias e exames em `evolutions.attachments` abrem por URL, sem login. O que mudei:
1. **Caminho do arquivo:** `{tenantId}/{clinicId}/evolutions/{hash}.{ext}`. Antes o nome original do arquivo, que costuma ter o nome do paciente, ficava na URL.
2. **Validação real do arquivo:** PDF precisa começar com `%PDF-`; imagem precisa ser aceita pelo Sharp. Antes só o `mimetype` (que o cliente escolhe) valia, e uma imagem inválida virava 500.
   Falha de upload agora é `AppError` (antes `Error` genérico).
3. **Anexos vindos no corpo da requisição** (`req.body.attachments`) eram gravados sem validação (qualquer URL de terceiros). Agora só são aceitos arquivos do nosso bucket e do próprio tenant.
4. **Modo privado opcional (`STORAGE_PRIVATE=true`):** o upload guarda só o caminho e as leituras devolvem **URLs assinadas e temporárias** (`STORAGE_SIGNED_URL_TTL`, padrão 3600 s).
   As URLs públicas antigas já gravadas são convertidas automaticamente na leitura. Pontos que assinam: prontuário, lista de evoluções e criação de evolução.
   **Ordem segura:** (a) defina `STORAGE_PRIVATE=true` e faça o deploy (URLs assinadas funcionam com bucket público); (b) confira no front; (c) só então torne o bucket privado no painel do Supabase.
   O front não deve guardar essas URLs em cache (elas expiram).
5. Cada upload agora gera um registro de auditoria (o `actor` passou a ser informado pelo controller).
Não coberto: `medical_files.url` (nenhuma rota lê essa tabela hoje) e a limpeza de arquivos órfãos no bucket.

### Outras observações
- **Aviso do `pg`** ("Calling client.query() when the client is already executing a query... removed in pg@9.0") aparece nos testes. A origem está no interpretador do Prisma 7 com `adapter-pg`
  (queries em paralelo dentro de transação), não no código do projeto. Acompanhe as atualizações do Prisma antes de subir para `pg@9`.
- **`class-validator` e `class-transformer` estão instalados, mas nenhum controller valida `req.body`** (todos fazem `req.body as XDto`). O `pick` limita o estrago do mass assignment, mas não valida tipos.
  Recomendo validar na borda (`class-validator` ou `zod`), principalmente `amount`, `quantity` e `role`.
- **`npm run build` (`tsc` estrito):** rodei o `tsc` com o seu `tsconfig` nos arquivos entregues e nos stubs, mas não nos seus arquivos originais que não recebi. Confirme que `npm run build` passa:
  a chamada de `getRolePermissions` (corrigida) e o conflito de `Request.user` entre `express.d.ts` e `authMiddlewares.ts` são os candidatos a falhar.
- **`prisma/seed.ts`** (script `npm run seed`) não foi enviado. Com o schema novo, `evolutions.clinicId` e `procedure_products.clinicId` são obrigatórios e o tenant precisa de `subscriptions`: se o seed cria esses registros, vai falhar até ser ajustado.
- **`prisma.config.ts`** não foi enviado; nada nele precisa mudar para as migrations novas.
