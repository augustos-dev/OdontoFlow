import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './routes/index'
import { errorHandler } from './middlewares/errorHandler.middleware'

const app = express()
const PORT = process.env.PORT ?? 3333

app.use(cors())
app.use(express.json())

app.use('/api', router)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log('?? OdontoFlow API rodando em http://localhost:' + PORT)
})
