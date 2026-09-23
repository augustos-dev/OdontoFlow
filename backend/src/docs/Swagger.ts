import swaggerJsdoc from 'swagger-jsdoc'
import path from 'node:path'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OdontoFlow API',
      version: '1.0.0',
      description:
        'API REST multi-tenant para gerenciamento clínico odontológico. ' +
        'Todas as rotas privadas exigem autenticação via Bearer Token (JWT).',
      contact: {
        name: 'Augusto Dev',
        url: 'https://github.com/augustos-dev',
      },
    },
    servers: [
      {
        url: 'https://odontoflow-bbcl.onrender.com/api',
        description: 'Servidor de produção (Render)',
      },
      {
        url: 'http://localhost:3333/api',
        description: 'Servidor local de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ─── Auth ──────────────────────────────────────────────────────────
        RegisterTenantDTO: {
          type: 'object',
          required: ['tenantName', 'slug', 'adminName', 'email', 'password'],
          properties: {
            tenantName: { type: 'string', example: 'Clínica Prime Odonto' },
            slug: { type: 'string', example: 'prime-odonto' },
            plan: { type: 'string', enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'], default: 'PREMIUM' },
            billingCycle: { type: 'string', enum: ['MONTHLY', 'ANNUAL'], default: 'ANNUAL' },
            phone: { type: 'string', example: '85999990000' },
            cnpjOrCpf: { type: 'string', example: '00.000.000/0001-00' },
            adminName: { type: 'string', example: 'Dr. Vicente Augusto' },
            email: { type: 'string', format: 'email', example: 'admin@primeodonto.com' },
            password: { type: 'string', minLength: 6, example: 'senha123' },
          },
        },
        RegisterDTO: {
          type: 'object',
          required: ['tenantId', 'clinicId', 'name', 'email', 'password', 'role'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            clinicId: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Dr. João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@odontoflow.com' },
            password: { type: 'string', minLength: 6, example: 'senha123' },
            role: { type: 'string', enum: ['ADMIN', 'DENTIST', 'SECRETARY'] },
            phone: { type: 'string', example: '85999990000' },
            cro: { type: 'string', example: 'CE-12345' },
          },
        },
        LoginDTO: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string', format: 'uuid' },
                clinicId: { type: 'string', format: 'uuid' },
                avatarUrl: { type: 'string', nullable: true },
                plan: { type: 'string', enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'] },
              },
            },
          },
        },

        // ─── Meu Consultório (Dentist Profile) ─────────────────────────────
        DentistProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            specialties: { type: 'array', items: { type: 'string' }, example: ['Ortodontia', 'Implantodontia'] },
            bio: { type: 'string', nullable: true },
            defaultRoom: { type: 'string', enum: ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4'] },
            signatureImageUrl: { type: 'string', nullable: true },
            croState: { type: 'string', example: 'CE' },
            rqe: { type: 'string', nullable: true },
            slotDurationMin: { type: 'integer', example: 30 },
            workSchedule: { type: 'object' },
            aiVoiceShortcut: { type: 'boolean', example: true },
            quickNotes: { type: 'object' },
          },
        },
        UpdateDentistProfileDTO: {
          type: 'object',
          properties: {
            specialties: { type: 'array', items: { type: 'string' } },
            bio: { type: 'string' },
            defaultRoom: { type: 'string', enum: ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4'] },
            signatureImageUrl: { type: 'string' },
            croState: { type: 'string' },
            rqe: { type: 'string' },
            slotDurationMin: { type: 'integer' },
            workSchedule: { type: 'object' },
            aiVoiceShortcut: { type: 'boolean' },
            quickNotes: { type: 'object' },
          },
        },

        // ─── IA & Transcrição Clínica ──────────────────────────────────────
        ClinicalAiTranscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dentistId: { type: 'string', format: 'uuid' },
            audioUrl: { type: 'string', nullable: true },
            durationSeconds: { type: 'integer', example: 45 },
            rawTranscription: { type: 'string', example: 'Paciente relata dor moderada no elemento 36...' },
            structuredData: { type: 'object' },
            tokensUsed: { type: 'integer', example: 120 },
            modelName: { type: 'string', example: 'whisper-1 / gpt-4o-mini' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateAiTranscriptionDTO: {
          type: 'object',
          required: ['rawTranscription'],
          properties: {
            audioUrl: { type: 'string' },
            durationSeconds: { type: 'integer' },
            rawTranscription: { type: 'string' },
            structuredData: { type: 'object' },
            tokensUsed: { type: 'integer' },
            modelName: { type: 'string' },
          },
        },

        // ─── Tarefas Clínicas (Tasks) ──────────────────────────────────────
        ClinicTask: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            creatorId: { type: 'string', format: 'uuid' },
            assignedToId: { type: 'string', format: 'uuid', nullable: true },
            patientId: { type: 'string', format: 'uuid', nullable: true },
            title: { type: 'string', example: 'Confirmar envio de molde de prótese' },
            description: { type: 'string', nullable: true },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateClinicTaskDTO: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Comprar reposição de anestésicos' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
            assignedToId: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
        UpdateClinicTaskDTO: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] },
            assignedToId: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Comissões (Commissions) ───────────────────────────────────────
        DentistCommission: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dentistId: { type: 'string', format: 'uuid' },
            grossAmount: { type: 'number', example: 500.0 },
            materialsCost: { type: 'number', example: 80.0 },
            netBaseAmount: { type: 'number', example: 420.0 },
            percentage: { type: 'number', example: 40.0 },
            commissionAmount: { type: 'number', example: 168.0 },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELED'] },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateCommissionDTO: {
          type: 'object',
          required: ['dentistId', 'grossAmount'],
          properties: {
            dentistId: { type: 'string', format: 'uuid' },
            treatmentPlanId: { type: 'string', format: 'uuid' },
            procedureId: { type: 'string', format: 'uuid' },
            grossAmount: { type: 'number', example: 450.0 },
            materialsCost: { type: 'number', example: 50.0 },
            percentage: { type: 'number', example: 40.0 },
          },
        },

        // ─── Contratos & Pré-Cadastro ──────────────────────────────────────
        ClinicalContract: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Termo de Consentimento - Implantes' },
            contentHtml: { type: 'string' },
            status: { type: 'string', enum: ['DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'REJECTED'] },
            signatureUrl: { type: 'string', nullable: true },
            signedAt: { type: 'string', format: 'date-time', nullable: true },
            signerIp: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateContractDTO: {
          type: 'object',
          required: ['patientId', 'title', 'contentHtml'],
          properties: {
            patientId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            contentHtml: { type: 'string' },
          },
        },
        CreatePreRegLinkDTO: {
          type: 'object',
          required: ['patientName', 'phone'],
          properties: {
            patientName: { type: 'string', example: 'Beatriz Almeida' },
            phone: { type: 'string', example: '85988889999' },
            patientId: { type: 'string', format: 'uuid' },
            expiresInDays: { type: 'integer', default: 7 },
          },
        },

        // ─── Erros & Metadados Padrão ──────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Recurso não encontrado.' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token não fornecido ou inválido.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Permissão insuficiente para este recurso.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Recurso não encontrado.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Conflict: {
          description: 'Conflito — recurso duplicado ou regra violada.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    // Lê as rotas documentadas dentro de src/docs/routes/ (tanto dev em .ts como dist em .js)
    path.resolve(__dirname, './routes/**/*.{ts,js}'),
    path.resolve(__dirname, './routes/*.{ts,js}'),
    // Fallback caso existam anotações em src/routes/
    path.resolve(__dirname, '../routes/**/*.{ts,js}'),
    path.resolve(__dirname, '../routes/*.{ts,js}'),
  ],
}

export const swaggerSpec = swaggerJsdoc(options)