<div align="center">

# 🦷 OdontoFlow

**Plataforma SaaS B2B de Gerenciamento Clínico Odontológico**

*Multi-tenant · REST API · TypeScript · Prisma ORM · PostgreSQL*

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/prisma-7.x-2D3748?style=flat-square&logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

---

## 📌 Sobre o Projeto

O **OdontoFlow** é uma API REST multi-tenant desenvolvida para gerenciar clínicas odontológicas de forma escalável. A arquitetura permite que um único sistema sirva múltiplos clientes (tenants), onde cada tenant pode ter várias filiais (clínicas), cada uma com seus próprios usuários, pacientes, agendamentos e dados financeiros completamente isolados.

> A hierarquia central do sistema é: **Tenant → Clinic → Users / Patients / Appointments / Transactions / Products**

---

## ✅ Módulos Implementados

| Módulo | Endpoints | Status |
|---|---|---|
| 🔐 **Auth** | Register, Login, Me | ✅ Concluído |
| 👥 **Patients** | CRUD + Soft Delete + Paginação | ✅ Concluído |
| 📅 **Appointments** | CRUD + Conflito de Sala/Dentista + Status | ✅ Concluído |
| 💰 **Transactions** | CRUD + Relatório Financeiro | ✅ Concluído |
| 📦 **Products** | CRUD + Estoque + Alertas | ✅ Concluído |
| 🩺 **Medical Records** | Prontuário + Odontograma + Evoluções | 🔜 Próximo |
| 📋 **Treatment Plans** | Orçamentos + Procedimentos | 🔜 Planejado |
| 👤 **Users** | Gestão de usuários por clínica | 🔜 Planejado |
| 🏥 **Clinics** | Gestão de filiais por tenant | 🔜 Planejado |
| 📊 **Dashboard** | Métricas e relatórios consolidados | 🔜 Planejado |

---

## 🏗️ Arquitetura

### Stack Principal

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 + TypeScript |
| Framework | Express 5 |
| ORM | Prisma 7 |
| Banco de dados | PostgreSQL 16 |
| Autenticação | JWT (jsonwebtoken) |
| Hash de senha | bcryptjs (salt 12) |
| Runner dev | tsx |
| Containerização | Docker + Docker Compose |

### Estrutura de Pastas

```
backend/
├── prisma/
│   ├── schema.prisma        # Schema multi-tenant completo
│   ├── seed.ts              # Dados iniciais para desenvolvimento
│   └── migrations/          # Histórico de migrations
├── prisma.config.ts         # Configuração Prisma v7 + adapter pg
├── tsconfig.json
├── docker-compose.yml
└── src/
    ├── server.ts            # Entry point da aplicação
    ├── controllers/         # Camada HTTP (req/res)
    ├── services/            # Regras de negócio + queries Prisma
    ├── routes/
    │   ├── index.ts         # Agregador central de rotas
    │   └── *.routes.ts      # Rotas por módulo
    ├── middlewares/
    │   ├── auth.middleware.ts       # JWT + RBAC
    │   └── errorHandler.middleware.ts
    ├── types/               # DTOs e tipagens TypeScript
    ├── shared/
    │   └── AppError.ts      # Classe de erro centralizada
    ├── lib/
    │   └── prisma.ts        # Singleton do PrismaClient
    ├── docs/                # Configuração Swagger
    └── __tests__/           # Testes automatizados
```

### Multi-tenancy

Todas as queries do banco são isoladas por `tenantId + clinicId`, extraídos do JWT — nunca do body da requisição. Isso garante que usuários de uma clínica jamais acessem dados de outra.

```
Token JWT
  └── tenantId  ──► filtra no WHERE de toda query
  └── clinicId  ──► filtra no WHERE de toda query
  └── role      ──► controla acesso via middleware authorize()
```

---

## 🔐 Autenticação & Autorização

O sistema usa **JWT** com payload contendo `tenantId`, `clinicId` e `role`. O controle de acesso (RBAC) é feito via middleware `authorize(...roles)`:

| Role | Permissões |
|---|---|
| `ADMIN` | Acesso total — leitura, escrita e exclusão |
| `DENTIST` | Leitura total + criar/editar pacientes e agendamentos |
| `SECRETARY` | Leitura total + criar/editar pacientes, agendamentos e transações |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Node.js >= 20
- Docker + Docker Compose

### 1. Clone o repositório

```bash
git clone https://github.com/augustos-dev/OdontoFlow.git
cd OdontoFlow/backend
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://odontoflow:odontoflow_secret@localhost:5432/odontoflow"
JWT_SECRET="seu_segredo_super_forte_aqui"
JWT_EXPIRES_IN="8h"
PORT=3333
```

### 3. Suba o banco de dados

```bash
docker compose up -d
```

### 4. Instale as dependências

```bash
npm install
```

### 5. Execute as migrations e o seed

```bash
npx prisma migrate dev --name init
npm run seed
```

O seed cria um **Tenant** e uma **Clinic** de exemplo e exibe os IDs no terminal — use-os no Postman para testar os endpoints.

### 6. Inicie o servidor

```bash
npm run dev
```

A API estará disponível em `http://localhost:3333`

---

## 📡 Endpoints Disponíveis

### Health Check
```
GET http://localhost:3333/health
```

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Patients
```
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
```

### Appointments
```
GET    /api/appointments
GET    /api/appointments/:id
POST   /api/appointments
PUT    /api/appointments/:id
PATCH  /api/appointments/:id/status
DELETE /api/appointments/:id
```

### Transactions
```
GET    /api/transactions
GET    /api/transactions/report?startDate=&endDate=
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

### Products
```
GET    /api/products
GET    /api/products/low-stock
GET    /api/products/expiring
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
PATCH  /api/products/:id/stock
DELETE /api/products/:id
```

---

## 🗄️ Modelo de Dados

O schema completo está em `backend/prisma/schema.prisma`. Os principais modelos são:

```
Tenant           → Entidade máxima (assinatura SaaS)
  └── Clinic     → Filiais do tenant
       ├── User           → Usuários (ADMIN, DENTIST, SECRETARY)
       ├── Patient        → Pacientes
       │    └── MedicalRecord   → Prontuário clínico (1:1)
       │         ├── Evolution       → Evoluções clínicas
       │         └── ToothCondition  → Odontograma
       ├── Appointment    → Agendamentos
       ├── Transaction    → Financeiro
       ├── Product        → Estoque
       ├── Supplier       → Fornecedores
       └── TreatmentPlan  → Planos de tratamento / Orçamentos
            └── PlanProcedure → Procedimentos do plano
```

---

## 🧪 Testes

> Suíte de testes em planejamento — será implementada com **Vitest** + **Supertest**.

```bash
# Em breve
npm run test
npm run test:coverage
```

---

## 📖 Documentação

A documentação interativa via **Swagger UI** está disponível em:

```
GET http://localhost:3333/docs
```

> Documentação em desenvolvimento — endpoints sendo documentados progressivamente.

---

## 🗺️ Roadmap

- [x] Fase 1 — Infraestrutura (Docker, Prisma v7, Express, AppError)
- [x] Fase 2 — Auth (JWT, RBAC, bcrypt)
- [x] Fase 3 — Patients (CRUD, soft delete, paginação)
- [x] Fase 4 — Appointments (CRUD, conflito de sala/dentista)
- [x] Fase 5 — Transactions (financeiro, relatório por período)
- [x] Fase 6 — Products (estoque, alertas semáforo)
- [ ] Fase 7 — Medical Records (prontuário, odontograma, evoluções)
- [ ] Fase 8 — Treatment Plans (orçamentos, procedimentos)
- [ ] Fase 9 — Users & Clinics (gestão interna)
- [ ] Fase 10 — Dashboard & Relatórios
- [ ] Fase 11 — Testes automatizados (Vitest + Supertest)
- [ ] Fase 12 — CI/CD + Dockerfile produção

---

## 💡 Ideias Futuras

- Isolamento por banco de dados para clientes Enterprise (campo `databaseUrl` já previsto no `Tenant`)
- Notificações de consulta via WhatsApp/SMS
- Upload de radiografias e documentos por paciente (S3/Supabase Storage)
- App mobile em React Native consumindo a mesma API
- Auditoria completa de ações por usuário

---

## 👨‍💻 Autor

Desenvolvido por **Vicente Augusto** — [@augustos-dev](https://github.com/augustos-dev)

---

<div align="center">

*OdontoFlow — Gerenciamento clínico inteligente para odontologia moderna*

