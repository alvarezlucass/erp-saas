import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import insumosRouter  from './routes/insumos'
import preciosRouter  from './routes/precios'
import presupuestosRouter from './routes/presupuestos'
import institucionesRouter from './routes/instituciones'
import authRouter     from './routes/auth'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

// Rutas públicas
app.use('/api/auth', authRouter)

// Rutas protegidas
app.use('/api/insumos',       authMiddleware, insumosRouter)
app.use('/api/precios',       authMiddleware, preciosRouter)
app.use('/api/presupuestos',  authMiddleware, presupuestosRouter)
app.use('/api/instituciones', authMiddleware, institucionesRouter)

app.get('/health', (_, res) => res.json({ ok: true, version: '0.1.0' }))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Unifai API corriendo en http://localhost:${PORT}`)
})

export default app
