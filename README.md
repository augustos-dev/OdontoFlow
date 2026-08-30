
<div align="center">

# 🦷 OdontoFlow

**Plataforma SaaS B2B Fullstack de Gestão Clínica & Comercial Odontológica**

*Multi-tenant · Next.js 15 · REST API · TypeScript · Prisma ORM · PostgreSQL*

![Status](https://img.shields.io/badge/status-em%20produ%C3%A7%C3%A3o%20%2F%20beta-brightgreen?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square&logo=node.js)
![Next.js](https://img.shields.io/badge/next.js-15.x-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/prisma-7.x-2D3748?style=flat-square&logo=prisma)
![Deploy](https://img.shields.io/badge/deploy-render-46E3B7?style=flat-square&logo=render)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**🚀 API em produção:** [`https://odontoflow-bbcl.onrender.com`](https://odontoflow-bbcl.onrender.com)  
**📖 Documentação Swagger:** [`https://odontoflow-bbcl.onrender.com/docs`](https://odontoflow-bbcl.onrender.com/docs)

</div>

---

## 📌 Sobre o Projeto

O **OdontoFlow** é um ecossistema SaaS multi-tenant desenvolvido especificamente para clínicas odontológicas que buscam precisão cirúrgica no controle clínico e lucratividade comercial. A plataforma integra o atendimento odontológico da recepção ao mocho do dentista, sincronizando prontuário visual, baixa automática de estoque por procedimento, fluxo de caixa e emissão de orçamentos.

> **Hierarquia Multi-Tenant Segura:** > `Tenant (Assinante SaaS)` → `Clinic (Filial)` → `Users / Patients / Appointments / Transactions / Inventory / Procedures`

---

## 🖥️ Módulos & Recursos Implementados

### 1. 📊 Dashboards Especializados (Role-Based Views)
- **Visão Executiva (ADMIN):** Inspirada na linguagem visual executiva *Omnia Hub SaaS*, com KPIs consolidados (Faturamento Mensal, Lucro Líquido, Pacientes Ativos), gráfico SVG contínuo de fluxo diário de receita, monitor de insumos críticos e ranking de dentistas com barra de produtividade proporcional.
- **Visão Operacional (RECEPTIONIST):** Grade da agenda do dia dividida por salas clínicas, controle de fila de espera e ocultação automática de relatórios e métricas financeiras confidenciais.

### 2. 🩺 Prontuário Clínico & Odontograma Interativo
- **Odontograma Visual Dente a Dente:** Marcação de faces dentárias com codificação visual padrão (Cárie, Restaurado, Canal, Prótese/Coroa, Ausente/Extraído, Limpeza).
- **Galeria Radiográfica & Laudos:** Visualizador de exames de imagem e radiografias panorâmicas por paciente.
- **Histórico de Evoluções Clínicas Inalteráveis:** Carimbo digital de data/hora e identificação do dentista responsável em conformidade com as diretrizes do CFO e LGPD.

### 3. 💳 Gestão Financeira & Planos de Tratamento
- **Pipeline de Orçamentos:** Criação de planos de tratamento com múltiplos procedimentos, descontos por item e controle de status (`ORCAMENTO`, `APROVADO`, `EM_ANDAMENTO`, `CONCLUIDO`, `RECUSADO`).
- **Automação de Caixa:** Ao aprovar um plano de tratamento, o sistema gera instantaneamente o lançamento correspondente no fluxo de caixa (`POST /transactions`).
- **Modal de Finalização Rápida (`Finalizar & Cobrar`):** Baixa de consulta com suporte a multimeios de pagamento (Pix, Crédito, Débito, Dinheiro) e integração de dados de operadoras de convênio.

### 4. 📦 Ficha Técnica & Estoque Semáforo
- **Exit Inteligente:** Vinculação de insumos consumidos diretamente na ficha técnica de cada procedimento clínico.
- **Alertas Automatizados:** Classificação de insumos em nível normal, estoque crítico de reposição imediata e produtos a vencer em até 30 dias.

### 5. ⚙️ Administração & Configurações da Unidade
- Gestão completa de equipe com controle de acesso RBAC (`ADMIN`, `DENTIST`, `RECEPTIONIST`).
- Edição cadastral de funcionários e redefinição de senhas com modal administrativo seguro.
- Customização visual da unidade (paletas de cores e dados no cabeçalho de documentos).
- Toggles de conformidade e regras de expiração de sessão.

---

## 🏗️ Arquitetura & Stack Tecnológica

┌─────────────────────────────────────────────────────────────┐
│                    ODONTOFLOW ECOSYSTEM                     │
├──────────────────────────────┬──────────────────────────────┤
│ FRONTEND (Next.js 15)        │ BACKEND (REST API Express)   │
│ • React 19 + TypeScript      │ • Node.js 20+ + Express 5    │
│ • CSS Modules + Lucide Icons │ • Prisma ORM v7 (pg adapter) │
│ • App Router + Auth Context  │ • PostgreSQL (Supabase)      │
│ • RBAC Dinâmico por Token    │ • JWT + bcryptjs (salt 12)   │
└──────────────────────────────┴──────────────────────────────┘


### Multi-tenancy & Segurança

Todas as consultas e mutações ao banco de dados são isoladas estritamente por `tenantId + clinicId` validados criptograficamente pelo token JWT:

Token JWT (Bearer)
├── tenantId  ──► Injetado automaticamente no WHERE do Prisma
├── clinicId  ──► Isolamento estrito por filial
└── role      ──► Validação de permissões via middleware authorize()


---

## 📡 Endpoints em Produção (65 Endpoints Swagger)

| Módulo | Métodos | Principais Rotas | Descrição |
|---|---|---|---|
| 🔐 **Auth** | `POST`, `GET` | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` | Autenticação e sessão JWT |
| 👥 **Patients** | `GET`, `POST`, `PUT`, `DELETE` | `/api/patients`, `/api/patients/:id` | Gestão de pacientes e dados cadastrais |
| 📅 **Appointments** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/api/appointments`, `/api/appointments/:id/status` | Grade de consultas e bloqueio de conflitos |
| 💰 **Transactions** | `GET`, `POST`, `PUT`, `DELETE` | `/api/transactions`, `/api/transactions/report` | Livro caixa e relatório de conciliação |
| 📋 **Treatment Plans** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/api/treatment-plans`, `/api/treatment-plans/:id/status` | Orçamentos e conversão em receita |
| 🩺 **Medical Records** | `GET`, `PUT`, `POST`, `PATCH` | `/api/medical-records/:id/odontogram`, `/evolutions` | Prontuário, Odontograma e Laudos |
| 💉 **Procedures** | `GET`, `POST`, `PUT`, `DELETE` | `/api/procedures`, `/api/procedures/:id` | Catálogo de serviços e ficha técnica |
| 📦 **Products** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/api/products`, `/api/products/low-stock` | Controle de insumos e reposição |
| 📊 **Dashboard** | `GET` | `/api/dashboard/summary`, `/revenue-chart`, `/top-dentists` | Visão executiva consolidada |
| 👤 **Users** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/api/users`, `/api/users/:id/role`, `/change-password` | Gestão de usuários da clínica |
| 🏥 **Clinics** | `GET`, `POST`, `PUT`, `PATCH` | `/api/clinics`, `/api/clinics/:id/deactivate` | Gestão multi-filiais |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js >= 20
- Docker & Docker Compose

### 1. Clonar e Instalar o Backend

```bash
git clone [https://github.com/augustos-dev/OdontoFlow.git](https://github.com/augustos-dev/OdontoFlow.git)
cd OdontoFlow/backend

# Configuração de Ambiente
cp .env.example .env

# Subir Banco PostgreSQL via Docker
docker compose up -d

# Instalação e Migrações
npm install
npx prisma migrate dev --name init
npm run seed

# Executar Backend
npm run dev
API: http://localhost:3333 | Documentação: http://localhost:3333/docs

2. Executar o Frontend
Bash
cd ../frontend
npm install
npm run dev
Acesso: http://localhost:3000

🗺️ Roadmap & Status de Desenvolvimento
🏁 Fase 13 — Módulo Financeiro, Funil de Orçamentos & Visão Executiva
[x] Transações, fluxo de caixa e baixa de consultas (POST /transactions).

[x] Pipeline de Planos de Tratamento com sincronização contábil via PATCH /treatment-plans/:id/status.

[x] Modal de encerramento rápido multimeios (FinalizarAtendimentoModal).

[x] Dashboard Executivo Hub SaaS (curva diária, KPIs e ranking de produtividade).

[x] Sidebar corporativa recolhível com categorização de módulos e RBAC integrado.

[x] Painel de Configurações Administrativas com gestão completa de equipe e redefinição de senhas.

🎯 Fase 14 — Go-To-Market, Beta Fechado & Idempotência (Em Andamento)
[ ] Mecanismo de Idempotência no Estoque: Trava contra baixas duplicadas na finalização de consultas.

[ ] Exportação de Documentos em PDF: Prontuário Odontológico compilado com Odontograma e termo de Orçamento assinado.

[ ] Planos Recorrentes & Auto-Agendamento: Módulo de manutenção ortodôntica periódica (+30 dias).

[ ] Onboarding dos parceiros clínicos em ambiente de homologação.

💳 Fase 15 — Tabela Comercial, Billing & Expansão Multi-Clínicas
[ ] Matriz de planos de assinatura SaaS (Básico, Premium e Enterprise).

[ ] Checkout atômico (prisma.$transaction) com webhooks de recorrência.

[ ] Banco dedicado sob demanda (getTenantPrisma) para grandes redes/franquias.

👨‍💻 Autor
Desenvolvido por Vicente Augusto — @augustos-dev

OdontoFlow — Gerenciamento clínico inteligente para odontologia moderna

🚀 https://odontoflow-bbcl.onrender.com · 📖 /docs