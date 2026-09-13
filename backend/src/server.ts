import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import router from './routes/index'
import { errorHandler } from './middlewares/errorHandler.middleware'
import { apiLimiter } from './middlewares/rateLimiter.middleware'
import { swaggerSpec } from './docs/Swagger'
import swaggerUi from 'swagger-ui-express'

process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason)
  process.exit(1)
})

const app = express()
const PORT = process.env.PORT ?? 3333

// Permite capturar o IP real do cliente atrás de proxies reversos
app.set('trust proxy', 1)

// Oculta X-Powered-By e aplica headers HTTP de segurança (crossOriginResourcePolicy permite servir uploads)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// Configuração de CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'accept'],
  })
)

app.use(express.json())

// Acesso estático público aos uploads
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')))

// Documentação Swagger (livre de rate limiter)
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'OdontoFlow API — Documentação',
  })
)

// Endpoint de verificação operacional (livre de rate limiter)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Aplica limitador geral de tráfego em todos os endpoints de negócio
app.use('/api', apiLimiter, router)

// Middleware central de tratamento de erros
app.use(errorHandler)

const portNumber = Number(PORT)

app.listen(portNumber, '0.0.0.0', () => {
  console.log(`🚀 OdontoFlow API rodando com sucesso na porta ${portNumber}!`)
  console.log(`📖 Swagger em http://localhost:${portNumber}/docs`)
  console.log(`📁 Pasta de uploads acessível em http://localhost:${portNumber}/uploads`)
}).on('error', (err) => {
  console.error('❌ Erro ao iniciar servidor:', err)
  process.exit(1)
})