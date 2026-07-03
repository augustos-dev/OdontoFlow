<div align="center">

# 🦷 OdontoFlow

**Plataforma SaaS B2B de Gerenciamento Clínico Odontológico**

*Multi-tenant · REST API · TypeScript · Prisma ORM · PostgreSQL*

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/prisma-7.x-2D3748?style=flat-square&logo=prisma)
![Deploy](https://img.shields.io/badge/deploy-render-46E3B7?style=flat-square&logo=render)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**🚀 API em produção:** [`https://odontoflow-bbcl.onrender.com`](https://odontoflow-bbcl.onrender.com)  
**📖 Documentação Swagger:** [`https://odontoflow-bbcl.onrender.com/docs`](https://odontoflow-bbcl.onrender.com/docs)

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
| 📦 **Products** | CRUD + Estoque Semáforo + Alertas | ✅ Concluído |
| 📊 **Dashboard** | Métricas consolidadas (dia/semana/mês) | ✅ Concluído |
| 🏥 **Clinics** | CRUD + Ativar/Desativar filiais | ✅ Concluído |
| 👤 **Users** | CRUD + Role + Status + Senha | ✅ Concluído |
| 🩺 **Medical Records** | Prontuário + Odontograma + Evoluções | ✅ Concluído |
| 💉 **Procedures** | Catálogo de procedimentos | ✅ Concluído |
| 📋 **Treatment Plans** | Orçamentos + Procedimentos vinculados | ✅ Concluído |

**Total: 65 endpoints documentados e em produção.**

---

## 🏗️ Arquitetura

### Stack Principal

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 + TypeScript |
| Framework | Express 5 |
| ORM | Prisma 7 |
| Banco de dados | PostgreSQL (Supabase) |
| Autenticação | JWT (jsonwebtoken) |
| Hash de senha | bcryptjs (salt 12) |
| Runner dev | tsx |
| Containerização | Docker + Docker Compose |
| Deploy | Render |
| Documentação | Swagger UI (OpenAPI 3.0) |

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
    │   └── *.routes.ts      # Rotas por módulo com JSDoc Swagger
    ├── middlewares/
    │   ├── authMiddlewares.ts       # JWT + RBAC
    │   └── errorHandler.middleware.ts
    ├── types/               # DTOs e tipagens TypeScript
    ├── shared/
    │   └── AppError.ts      # Classe de erro centralizada
    ├── lib/
    │   └── prisma.ts        # Singleton do PrismaClient
    └── docs/
        └── Swagger.ts       # Configuração OpenAPI + schemas
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
| `DENTIST` | Leitura total + criar/editar pacientes, agendamentos e prontuários |
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
NODE_ENV=development
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
O Swagger em `http://localhost:3333/docs`

---

## 📡 Endpoints Disponíveis

### Health Check
```
GET /health
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

### Dashboard (ADMIN)
```
GET /api/dashboard/summary
GET /api/dashboard/revenue-chart?startDate=&endDate=
GET /api/dashboard/upcoming-appointments
GET /api/dashboard/top-dentists
```

### Clinics
```
GET    /api/clinics
GET    /api/clinics/:id
POST   /api/clinics
PUT    /api/clinics/:id
PATCH  /api/clinics/:id/deactivate
PATCH  /api/clinics/:id/reactivate
```

### Users
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
PATCH  /api/users/:id/role
PATCH  /api/users/:id/status
PATCH  /api/users/me/change-password
DELETE /api/users/:id
```

### Medical Records
```
GET    /api/medical-records/:patientId
PUT    /api/medical-records/:patientId
GET    /api/medical-records/:patientId/odontogram
PUT    /api/medical-records/:patientId/odontogram
DELETE /api/medical-records/:patientId/odontogram/:toothNumber
POST   /api/medical-records/:patientId/evolutions
PUT    /api/medical-records/evolutions/:evolutionId
PATCH  /api/medical-records/evolutions/:evolutionId/lock
```

### Procedures
```
GET    /api/procedures
GET    /api/procedures/:id
POST   /api/procedures
PUT    /api/procedures/:id
DELETE /api/procedures/:id
```

### Treatment Plans
```
GET    /api/treatment-plans
GET    /api/treatment-plans/:id
POST   /api/treatment-plans
PUT    /api/treatment-plans/:id
PATCH  /api/treatment-plans/:id/status
DELETE /api/treatment-plans/:id
```

> 📖 Todos os endpoints estão documentados e testáveis em [`https://odontoflow-bbcl.onrender.com/docs`](https://odontoflow-bbcl.onrender.com/docs)

---

## 🗄️ Modelo de Dados

```
Tenant           → Entidade máxima (assinatura SaaS)
  └── Clinic     → Filiais do tenant
       ├── User           → Usuários (ADMIN, DENTIST, SECRETARY)
       ├── Patient        → Pacientes
       │    ├── MedicalRecord   → Prontuário clínico (1:1)
       │    │    ├── Evolution       → Evoluções clínicas
       │    │    └── ToothCondition  → Odontograma (dente a dente)
       │    └── MedicalFile    → Radiografias e documentos
       ├── Appointment    → Agendamentos
       ├── Transaction    → Financeiro
       ├── Product        → Estoque
       ├── Supplier       → Fornecedores
       └── TreatmentPlan  → Planos de tratamento / Orçamentos
            └── PlanProcedure → Procedimentos do plano
                 └── Procedure → Catálogo de procedimentos
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

## 🗺️ Roadmap

- [x] Fase 1 — Infraestrutura (Docker, Prisma v7, Express, AppError)
- [x] Fase 2 — Auth (JWT, RBAC, bcrypt)
- [x] Fase 3 — Patients (CRUD, soft delete, paginação)
- [x] Fase 4 — Appointments (CRUD, conflito de sala/dentista)
- [x] Fase 5 — Transactions (financeiro, relatório por período)
- [x] Fase 6 — Products (estoque, alertas semáforo)
- [x] Fase 7 — Dashboard (métricas consolidadas)
- [x] Fase 8 — Clinics & Users (gestão interna)
- [x] Fase 9 — Medical Records (prontuário, odontograma, evoluções)
- [x] Fase 10 — Treatment Plans & Procedures (orçamentos)
- [x] Fase 11 — Swagger/OpenAPI (65 endpoints documentados)
- [x] Fase 12 — Deploy em produção (Render + Supabase)
- [ ] Fase 13 — Testes automatizados (Vitest + Supertest)
- [ ] Fase 14 — Frontend (React + Vite)
- [ ] Fase 15 — CI/CD com GitHub Actions

---

## 💡 Ideias Futuras

| Ideia | Descrição |
|---|---|
| **Isolamento por banco** | Campo `databaseUrl` no `Tenant` já previsto — banco dedicado para Enterprise |
| **Multi-clínica por usuário** | Dentista atendendo em múltiplas filiais do mesmo tenant |
| **Notificações** | Lembretes de consulta via WhatsApp/SMS (Twilio ou Z-API) |
| **Upload de arquivos** | Radiografias e documentos por paciente (S3/Supabase Storage) |
| **Agenda visual** | Endpoint otimizado para calendário semanal por sala/dentista |
| **Plano por features** | Limitar funcionalidades por `TenantPlan` (STANDARD / PREMIUM / ENTERPRISE) |
| **Auditoria** | Log de ações por usuário (quem criou, editou, deletou e quando) |
| **App mobile** | React Native consumindo a mesma API |

---

## 👨‍💻 Autor

Desenvolvido por **Augusto** — [@augustos-dev](https://github.com/augustos-dev)

---

<div align="center">

*OdontoFlow — Gerenciamento clínico inteligente para odontologia moderna*

**🚀 [`https://odontoflow-bbcl.onrender.com`](https://odontoflow-bbcl.onrender.com) · 📖 [`/docs`](https://odontoflow-bbcl.onrender.com/docs)**

</div>
