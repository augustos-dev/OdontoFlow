# OdontoFlow

API backend para gerenciamento clínico odontológico (OdontoFlow).

Este repositório contém o backend em TypeScript com Express e Prisma, projetado como uma plataforma multi-tenant para clínicas odontológicas. O README abaixo resume o schema Prisma, o estado atual das rotas e instruções rápidas para rodar o projeto localmente.

**Links úteis**
- Schema Prisma: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Código do servidor: [backend/src/server.ts](backend/src/server.ts)
- Rotas registradas: [backend/src/routes/index.ts](backend/src/routes/index.ts)
- Package.json (scripts): [backend/package.json](backend/package.json)

**Status atual do backend**
- Linguagem: TypeScript
- Framework HTTP: Express
- ORM: Prisma (Postgres)
- Autenticação: JWT
- Rotas já implementadas: Auth, Patients, Appointments, Transactions

Principais dependências: `@prisma/client`, `prisma`, `express`, `dotenv`, `jsonwebtoken`, `bcryptjs`.

**Visão geral do schema (resumo)**
O schema Prisma está em [backend/prisma/schema.prisma](backend/prisma/schema.prisma) e contém modelos e enums pensados para um sistema multi-tenant. Modelos principais:
- Tenant, Clinic, User
- Patient, MedicalRecord, Evolution, ToothCondition, MedicalFile
- Appointment, TreatmentPlan, Procedure, PlanProcedure
- Product, Supplier, Transaction

Enums importantes:
- `TenantPlan`, `UserRole`, `AppointmentStatus`, `AppointmentType`, `TreatmentStatus`, `Room`, `PaymentMethod`, `TransactionType`, `Gender`.

Esses modelos suportam controle de multi-tenancy (tenantId) e índices para consultas comuns (agenda, relatório financeiro, histórico de pacientes, etc.).

**APIs principais (resumo de endpoints)**
- Auth: `/api/auth`
	- `POST /register` — criar usuário (vinculado a tenant/clinic)
	- `POST /login` — autenticar e receber JWT
	- `GET /me` — obter perfil (autenticado)

- Patients: `/api/patients` (todas as rotas protegidas)
	- `GET /` — listar pacientes (filtros: name, cpf, page, limit)
	- `GET /:id` — obter paciente
	- `POST /` — criar paciente (roles: ADMIN, SECRETARY, DENTIST)
	- `PUT /:id` — atualizar (roles: ADMIN, SECRETARY, DENTIST)
	- `DELETE /:id` — deletar (role: ADMIN)

- Appointments: `/api/appointments` (protegidas)
	- `GET /` — listar
	- `GET /:id` — obter
	- `POST /` — criar (roles: ADMIN, SECRETARY, DENTIST)
	- `PUT /:id` — atualizar
	- `PATCH /:id/status` — atualizar status
	- `DELETE /:id` — deletar

- Transactions: `/api/transactions` (protegidas)
	- `GET /` — listar (filtros)
	- `GET /report` — relatório financeiro (ADMIN)
	- `GET /:id` — obter
	- `POST /` — criar (ADMIN, SECRETARY)
	- `PUT /:id` — atualizar (ADMIN, SECRETARY)
	- `DELETE /:id` — deletar (ADMIN)

Para ver os arquivos das rotas, consulte [backend/src/routes](backend/src/routes).

**Variáveis de ambiente (mínimas)**
- `DATABASE_URL` — string de conexão PostgreSQL usada pelo Prisma
- `JWT_SECRET` — segredo para assinar tokens JWT
- `JWT_EXPIRES_IN` — tempo de expiração do JWT (ex: `8h`) (opcional, padrão: `8h`)
- `PORT` — porta da API (opcional, padrão: `3333`)

Observação: o projeto já usa `dotenv`, então crie um arquivo `.env` na pasta `backend` com essas variáveis antes de iniciar.

**Executando localmente (rápido)**
1. Instale dependências e prepare banco:

```bash
cd backend
npm install
# Defina DATABASE_URL no .env (Postgres)
npx prisma migrate dev --name init
npm run seed     # popula dados de exemplo (se aplicável)
```

2. Rodar em modo desenvolvimento:

```bash
npm run dev
```

Scripts úteis (em [backend/package.json](backend/package.json)):

```json
"scripts": {
	"dev": "tsx --tsconfig tsconfig.json src/server.ts",
	"build": "tsc",
	"start": "node dist/server.js",
	"seed": "tsx prisma/seed.ts"
}
```

**Testes e documentação**
- Não existem testes automatizados configurados no momento.
- O projeto inclui integração com Swagger (`swagger-jsdoc` e `swagger-ui-express`) — ver [backend/src/docs](backend/src/docs) para a configuração.

**Próximos passos sugeridos**
- Documentar endpoints com exemplos (Swagger ou Postman collection).
- Implementar testes unitários e de integração.
- Adicionar instruções de deploy (Docker / docker-compose).

Se quiser, eu atualizo este README com exemplos de requests, uma collection do Postman ou instruções de Docker.
