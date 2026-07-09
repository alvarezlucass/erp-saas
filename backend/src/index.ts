import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

import insumosRouter  from './routes/insumos'
import preciosRouter  from './routes/precios'
import presupuestosRouter from './routes/presupuestos'
import institucionesRouter from './routes/instituciones'
import clientesRouter     from './routes/clientes'
import proveedoresRouter from './routes/proveedores'
import productosRouter from './routes/productos'
import categoriasRouter from './routes/categorias'
import tallesRouter     from './routes/talles'
import authRouter       from './routes/auth'
import uploadsRouter    from './routes/uploads'
import bordadosRouter   from './routes/bordados'
import configuracionRouter from './routes/configuracion'
import empresaRouter      from './routes/empresa'
import produccionRouter     from './routes/produccion'
import usuariosRouter from './routes/usuarios'
import superAdminRouter from './routes/superAdmin'
import importacionesRouter from './routes/importaciones'
import auditoriasRouter from './routes/auditorias'
import notificacionesRouter from './routes/notificaciones'
import subCategoriasRouter from './routes/subCategorias'
import comprasRouter from './routes/compras'
import preciosProgramadosRouter from './routes/preciosProgramados'
import finanzasRouter from './routes/finanzas'
import saasRouter from './routes/saas'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { checkSuperAdmin } from './middleware/checkSuperAdmin'
import { startCronPrecios } from './services/cronPrecios'

dotenv.config()

const app = express()
// Force reload environment variables
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'https://venzo-erp-saas.web.app'],
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Asegurar que existe public/uploads
const uploadDir = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Rutas públicas
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')))

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

app.get('/api/disable-rls', async (req, res) => {
  try {
    const tables: any[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    for (const table of tables) {
      if (table.tablename !== '_prisma_migrations') {
        await prisma.$executeRawUnsafe(`ALTER TABLE public."${table.tablename}" DISABLE ROW LEVEL SECURITY;`)
      }
    }
    res.json({ success: true, message: 'RLS deshabilitado' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/saas', saasRouter)
app.use('/api/upload', authMiddleware, uploadsRouter)

// Rutas protegidas
app.use('/api/insumos',       authMiddleware, insumosRouter)
app.use('/api/precios',       authMiddleware, preciosRouter)
app.use('/api/presupuestos',  authMiddleware, presupuestosRouter)
app.use('/api/instituciones', authMiddleware, institucionesRouter)
app.use('/api/clientes',      authMiddleware, clientesRouter)
app.use('/api/proveedores',   authMiddleware, proveedoresRouter)
app.use('/api/productos',     authMiddleware, productosRouter)
app.use('/api/categorias',    authMiddleware, categoriasRouter)
app.use('/api/talles',        authMiddleware, tallesRouter)
app.use('/api/bordados',      authMiddleware, bordadosRouter)
app.use('/api/configuracion', authMiddleware, configuracionRouter)
app.use('/api/empresa',       authMiddleware, empresaRouter)
app.use('/api/produccion',    authMiddleware, produccionRouter)
app.use('/api/usuarios',      authMiddleware, usuariosRouter)
app.use('/api/super',         authMiddleware, checkSuperAdmin, superAdminRouter)
app.use('/api/importaciones', importacionesRouter)
app.use('/api/auditoria',     authMiddleware, auditoriasRouter)
app.use('/api/novedades',     authMiddleware, notificacionesRouter)
app.use('/api/sub-categorias', authMiddleware, subCategoriasRouter)
app.use('/api/compras',        authMiddleware, comprasRouter)
app.use('/api/precios-programados', authMiddleware, preciosProgramadosRouter)
app.use('/api/finanzas', authMiddleware, finanzasRouter)

app.get('/health', (_, res) => res.json({ ok: true, version: '0.1.0' }))

// Servir Frontend en Producción
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist')
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath))
    app.get('*', (req, res) => {
      // No capturar rutas que empiecen con /api
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'))
      }
    })
  } else {
    console.warn('⚠️ Frontend dist folder not found at', frontendPath)
  }
}

app.use(errorHandler)

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Unifai API v0.1.5 (Industrial Build) corriendo en http://localhost:${PORT}`)
  console.log('✅ Rutas de Super Admin sincronizadas con usuariosExtra')
  startCronPrecios()
})

export default app
