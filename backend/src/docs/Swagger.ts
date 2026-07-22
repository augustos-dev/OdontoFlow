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
              },
            },
          },
        },

        // ─── Patient ───────────────────────────────────────────────────────
        CreatePatientDTO: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string', example: 'Carlos Souza' },
            phone: { type: 'string', example: '85988887777' },
            email: { type: 'string', format: 'email' },
            cpf: { type: 'string', example: '123.456.789-00' },
            birthDate: { type: 'string', format: 'date', example: '1990-05-15' },
            gender: { type: 'string', enum: ['MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO'] },
            address: { type: 'string' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            cpf: { type: 'string' },
            birthDate: { type: 'string', format: 'date' },
            gender: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Appointment ───────────────────────────────────────────────────
        CreateAppointmentDTO: {
          type: 'object',
          required: ['patientId', 'dentistId', 'dateTime', 'type', 'room'],
          properties: {
            patientId: { type: 'string', format: 'uuid' },
            dentistId: { type: 'string', format: 'uuid' },
            dateTime: { type: 'string', format: 'date-time', example: '2026-07-10T09:00:00.000Z' },
            durationMin: { type: 'integer', example: 60 },
            type: { type: 'string', enum: ['PARTICULAR', 'CONVENIO'] },
            room: { type: 'string', enum: ['SALA_1', 'SALA_2', 'SALA_3', 'SALA_4'] },
            notes: { type: 'string' },
          },
        },
        UpdateAppointmentStatusDTO: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO', 'FALTOU', 'ESPERA'],
            },
            cancellationReason: { type: 'string' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dateTime: { type: 'string', format: 'date-time' },
            durationMin: { type: 'integer' },
            status: { type: 'string' },
            type: { type: 'string' },
            room: { type: 'string' },
            notes: { type: 'string' },
          },
        },

        // ─── Transaction ───────────────────────────────────────────────────
        CreateTransactionDTO: {
          type: 'object',
          required: ['type', 'amount', 'paymentMethod'],
          properties: {
            type: { type: 'string', enum: ['RECEITA', 'DESPESA'] },
            amount: { type: 'number', format: 'decimal', example: 350.0 },
            paymentMethod: { type: 'string', enum: ['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO', 'CONVENIO'] },
            description: { type: 'string' },
            category: { type: 'string' },
            appointmentId: { type: 'string', format: 'uuid' },
            paidAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            amount: { type: 'number' },
            paymentMethod: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            paidAt: { type: 'string', format: 'date-time' },
          },
        },
        FinancialReport: {
          type: 'object',
          properties: {
            period: {
              type: 'object',
              properties: {
                startDate: { type: 'string' },
                endDate: { type: 'string' },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalReceitas: { type: 'number' },
                totalDespesas: { type: 'number' },
                lucro: { type: 'number' },
                totalTransacoes: { type: 'integer' },
              },
            },
          },
        },

        // ─── Product ───────────────────────────────────────────────────────
        CreateProductDTO: {
          type: 'object',
          required: ['name', 'quantity', 'minQuantity'],
          properties: {
            name: { type: 'string', example: 'Anestésico Tubete' },
            quantity: { type: 'integer', example: 50 },
            minQuantity: { type: 'integer', example: 10 },
            supplierId: { type: 'string', format: 'uuid' },
            expiryDate: { type: 'string', format: 'date' },
          },
        },
        AdjustStockDTO: {
          type: 'object',
          required: ['quantity', 'reason'],
          properties: {
            quantity: { type: 'integer', example: -5, description: 'Positivo = entrada, negativo = saída' },
            reason: { type: 'string', example: 'Uso clínico' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            minQuantity: { type: 'integer' },
            expiryDate: { type: 'string', format: 'date' },
            stockStatus: { type: 'string', enum: ['CRITICO', 'BAIXO', 'OK'] },
          },
        },

        // ─── Dashboard ─────────────────────────────────────────────────────
        DashboardSummary: {
          type: 'object',
          properties: {
            patients: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                newThisMonth: { type: 'integer' },
              },
            },
            appointments: {
              type: 'object',
              properties: {
                today: { type: 'integer' },
                thisWeek: { type: 'integer' },
                thisMonth: { type: 'integer' },
              },
            },
            financial: {
              type: 'object',
              properties: {
                todayRevenue: { type: 'number' },
                monthRevenue: { type: 'number' },
                monthExpenses: { type: 'number' },
                monthProfit: { type: 'number' },
              },
            },
            inventory: {
              type: 'object',
              properties: {
                lowStockCount: { type: 'integer' },
                expiringCount: { type: 'integer' },
              },
            },
          },
        },

        // ─── Erros ─────────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Recurso não encontrado.' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
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
          description: 'Conflito — recurso duplicado ou regra de negócio violada.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
 apis: [path.join(process.cwd(), 'src/docs/routes/*.routes.ts')],
}

export const swaggerSpec = swaggerJsdoc(options)