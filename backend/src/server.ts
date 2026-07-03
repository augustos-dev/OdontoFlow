import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './routes/index'
import { errorHandler } from './middlewares/errorHandler.middleware'
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

app.use(cors())
app.use(express.json())

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'OdontoFlow API — Documentação',
}))

app.use('/api', router)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

const portNumber = Number(PORT)

app.listen(portNumber, '0.0.0.0', () => {
  console.log(`🚀 OdontoFlow API rodando com sucesso na porta ${portNumber}!`)
  console.log(`📖 Swagger em http://localhost:${portNumber}/docs`)
}).on('error', (err) => {
  console.error('❌ Erro ao iniciar servidor:', err)
  process.exit(1)
})