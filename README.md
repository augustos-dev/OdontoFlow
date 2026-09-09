<div align="center">

# 🦷 OdontoFlow

**Plataforma SaaS B2B Full-Stack de Gerenciamento Clínico Odontológico**

*Multi-tenant · Next.js 15 · REST API · TypeScript · Prisma ORM · PostgreSQL*

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)
![Next.js](https://img.shields.io/badge/next.js-15.x-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/react-19.x-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/prisma-7.x-2D3748?style=flat-square&logo=prisma)
![Deploy](https://img.shields.io/badge/deploy-render-46E3B7?style=flat-square&logo=render)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**🚀 API em produção:** [`https://odontoflow-bbcl.onrender.com`](https://odontoflow-bbcl.onrender.com)  
**📖 Swagger Docs:** [`https://odontoflow-bbcl.onrender.com/docs`](https://odontoflow-bbcl.onrender.com/docs)

</div>

---

## 📌 Sobre o Projeto

O **OdontoFlow** é uma solução SaaS completa (Web App + REST API) desenhada para a gestão de clínicas e consultórios odontológicos. Construído sob uma arquitetura multi-tenant escalável e modular, o sistema isola completamente dados de clínicas e filiais, combinando rigor clínico com inteligência financeira e operacional.

> **Hierarquia Central:** `Tenant → Clinic → Users / Patients / Appointments / Transactions / Products`

---

## 🌟 Destaques & Diferenciais do Sistema

* **🎨 White-Label Nativo:** Customização dinâmica por CSS Variables (`--primary-color`, logo da clínica, fontes e naming da unidade).
* **🔍 Busca Global Unificada:** Barra de pesquisa instantânea com debounce de 300ms indexando pacientes, procedimentos e planos de tratamento em paralelo.
* **🔔 Central de Notificações em Tempo Real:** Monitoramento dinâmico alimentado por alertas de estoque crítico, consultas do dia e entradas financeiras (com persistência de leitura).
* **📦 Exit Inteligente de Estoque:** Fichas técnicas com cálculo fracionado de insumos por procedimento (ex: g/ml por seringa, un por caixa), disparando baixas automáticas na finalização da consulta e alertas de validade de lotes.
* **🩺 Prontuário Clínico Integrado:** Anamnese com auto-save em rascunhos locais, odontograma gráfico com snapshots versionados por evolução e visualizador embutido para exames/radiografias panorâmicas.

---

## ✅ Módulos Implementados

### 🖥️ Frontend (Next.js 15 App Router)

| Módulo | Funcionalidades Principais | Status |
|---|---|---|
| 🧭 **Shell & Navegação** | Sidebar retrátil, busca global tripla, central de notificações e suporte a White-label | ✅ Concluído |
| 📅 **Agenda Clínica** | Visão multi-salas, status visual em tempo real e modal de faturamento rápido | ✅ Concluído |
| 📦 **Estoque & Insumos** | Controle de lotes/validade, reposição rápida (1 clique), métricas de capital imobilizado e Recharts | ✅ Concluído |
| 📋 **Planos & Tratamentos** | Funil comercial, taxa de conversão em vendas, Donut Chart de planos mais aderidos e tabela com layout fixo | ✅ Concluído |
| 💉 **Procedimentos** | Ficha técnica vinculada a insumos, análise de markup/margem de lucro e gráfico de representatividade | ✅ Concluído |
| 👥 **Pacientes** | Listagem paginada, filtros rápidos, métricas cadastrais e gráfico de novos pacientes cadastrados | ✅ Concluído |
| 🩺 **Prontuário do Paciente** | Histórico clínico, mapa bucal interativo (odontograma), visualizador de panorâmica e exportação de prontuário em PDF | ✅ Concluído |

### ⚙️ Backend (REST API Express + Prisma)

| Módulo | Endpoints | Status |
|---|---|---|
| 🔐 **Auth & RBAC** | Register, Login, Me (controle para ADMIN, DENTIST e SECRETARY) | ✅ Concluído |
| 👥 **Patients** | CRUD completo, Soft Delete, paginação e busca por nome/CPF | ✅ Concluído |
| 📅 **Appointments** | CRUD, validação de conflitos por sala/dentista e transição de status | ✅ Concluído |
| 💰 **Transactions** | CRUD financeiro, conciliação e relatórios por período | ✅ Concluído |
| 📦 **Products & Stock** | CRUD, semáforo de estoque (`/low-stock`), validade (`/expiring`) e histórico de movimentações | ✅ Concluído |
| 🩺 **Medical Records** | Anamnese, snapshot de Odontograma dente a dente e evoluções clínicas | ✅ Concluído |
| 💉 **Procedures** | Catálogo de procedimentos e relacionamento com insumos | ✅ Concluído |
| 📋 **Treatment Plans** | Orçamentos odontológicos, vinculação de procedimentos e integração com caixa | ✅ Concluído |
| 🏥 **Clinics & Users** | Gestão de filiais, ativação/desativação e controle de membros | ✅ Concluído |
| 📊 **Dashboard** | Agregação executiva de receita, consultas futuras e dentistas mais produtivos | ✅ Concluído |

**Total: 65 endpoints REST documentados e em produção.**

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend Framework | Next.js 15 (App Router, React 19) |
| Estilização | CSS Modules + Variáveis Globais (White-label) |
| Gráficos & Analytics | Recharts |
| Ícones | Lucide React |
| Exportação de Documentos | React-PDF (`@react-pdf/renderer`) |
| Backend Runtime | Node.js 24 + TypeScript 5.x |
| Framework Backend | Express 5 |
| ORM & Database | Prisma 7 + PostgreSQL (Supabase) |
| Segurança & Auth | JWT (JSON Web Token) + bcryptjs (Salt 12) + RBAC |
| Containerização | Docker + Docker Compose |
| Deploy | Render (API + Swagger) |

### Estrutura de Pastas

```
OdontoFlow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schema multi-tenant completo
│   │   ├── seed.ts              # Carga inicial para desenvolvimento
│   │   └── migrations/          # Histórico de migrações
│   └── src/
│       ├── server.ts            # Entry point Express
│       ├── controllers/         # Camada HTTP
│       ├── services/            # Regras de negócio e Prisma queries
│       ├── routes/              # Rotas da API com JSDoc OpenAPI
│       ├── middlewares/         # JWT, RBAC e Error Handling
│       └── lib/                 # PrismaClient singleton
└── frontend/
    └── app/
        ├── (dashboard)/
        │   ├── agenda/          # Agenda clínica multi-salas
        │   ├── pacientes/       # Prontuário e odontograma
        │   ├── tratamentos/     # Planos comerciais e orçamentos
        │   ├── procedimentos/   # Fichas técnicas e custos
        │   ├── estoque/         # Gestão de materiais e lotes
        │   └── financeiro/      # Fluxo de caixa
        └── components/          # Modais, Shell e Gráficos
```


## 🔐 Isolamento Multi-Tenancy & Segurança

Todas as consultas ao banco de dados no backend aplicam filtros compostos com base no token JWT, sem depender de parâmetros do corpo da requisição:

```
Token JWT
  ├── tenantId  ──► Cláusula WHERE mandatória em todas as queries
  ├── clinicId  ──► Isolamento estrito por filial da clínica
  └── role      ──► RBAC via middleware authorize('ADMIN', 'DENTIST', 'SECRETARY')
```

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js >= 20
- Docker e Docker Compose

### 1. Clonar o repositório
```bash
git clone [https://github.com/augustos-dev/OdontoFlow.git](https://github.com/augustos-dev/OdontoFlow.git)
cd OdontoFlow

2. Backend
Bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
API local: http://localhost:3333 | Documentação Swagger: http://localhost:3333/docs

3. Frontend
Bash
cd ../frontend
npm install
npm run dev
Aplicação Web: http://localhost:3000

🗺️ Roadmap de Evolução
[x] Infraestrutura Docker, Prisma v7 e Express

[x] Autenticação JWT com RBAC por filial

[x] Módulos core de backend (Pacientes, Agenda, Financeiro, Estoque, Prontuário, Planos)

[x] Documentação Swagger com 65 endpoints

[x] Deploy da API no Render com banco PostgreSQL Supabase

[x] Frontend moderno em Next.js com DashboardShell modular

[x] Módulo de Estoque com controle de lote, rendimento e reposição rápida

[x] Módulo de Planos & Tratamentos com Donut Chart e funil de conversão

[x] Catálogo de Procedimentos com ficha técnica e análise de markup

[x] Prontuário com odontograma interativo e histórico paginado de evoluções

[x] Central de notificações dinâmica conectada ao banco

[ ] Módulo Financeiro & Caixa (DRE simplificado e fluxo por método)

[ ] Configurações da Clínica com upload de logo e seletor de cores do tema

[ ] Testes automatizados (Vitest + Supertest)

[ ] CI/CD com GitHub Actions
```

👨‍💻 Autor
Desenvolvido por Vicente Augusto — @augustos-dev

OdontoFlow — Gerenciamento clínico inteligente para odontologia moderna

🚀 https://odontoflow-bbcl.onrender.com · 📖 /docs