import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { checkSuperAdmin } from '../middleware/checkSuperAdmin'

const router = Router()
const prisma = new PrismaClient()

// ─── Config Multer ───────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'staging')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${Date.now()}_${base}${ext}`)
  }
})

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['.xlsx', '.xls', '.csv']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
})

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS DEL CLIENTE (tenant propio)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/importaciones/upload
 * El cliente sube un archivo → queda en cuarentena como PENDIENTE
 */
router.post('/upload', authMiddleware, upload.single('archivo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const { tipo = 'INSUMOS' } = req.body
    const tiposPermitidos = ['INSUMOS', 'PRODUCTOS', 'PRECIOS']
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Opciones: ${tiposPermitidos.join(', ')}` })
    }

    const archivoUrl = `/uploads/staging/${req.file.filename}`

    const importacion = await prisma.importacionStaging.create({
      data: {
        empresaId: req.empresaId!,
        tipo,
        archivoUrl,
        nombre: req.file.originalname,
        estado: 'PENDIENTE'
      }
    })

    res.status(201).json({
      mensaje: 'Archivo recibido correctamente. Será revisado y cargado por el equipo de Unifai.',
      importacion
    })
  } catch (error: any) {
    if (error.message?.includes('Solo se permiten')) {
      return res.status(400).json({ error: error.message })
    }
    console.error('Error en upload staging:', error)
    res.status(500).json({ error: 'Error al procesar el archivo' })
  }
})

/**
 * GET /api/importaciones/mis-archivos
 * El cliente ve sus propios archivos subidos y su estado
 */
router.get('/mis-archivos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const importaciones = await prisma.importacionStaging.findMany({
      where: { empresaId: req.empresaId! },
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        estado: true,
        notas: true,
        creadoEn: true,
        ejecutadoEn: true
      }
    })
    res.json(importaciones)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener archivos' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS DEL SUPER ADMIN (control total)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/importaciones/staging
 * Super Admin ve TODOS los archivos pendientes de TODAS las empresas
 */
router.get('/staging', authMiddleware, checkSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const importaciones = await prisma.importacionStaging.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        empresa: { select: { id: true, nombre: true, plan: true } }
      }
    })
    res.json(importaciones)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la bandeja de staging' })
  }
})

/**
 * PATCH /api/importaciones/staging/:id
 * Super Admin guarda el JSON procesado y notas de revisión
 */
router.patch('/staging/:id', authMiddleware, checkSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { jsonData, notas, estado } = req.body

    const actualizada = await prisma.importacionStaging.update({
      where: { id },
      data: {
        ...(jsonData !== undefined && { jsonData }),
        ...(notas !== undefined && { notas }),
        ...(estado !== undefined && { estado })
      }
    })
    res.json(actualizada)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el registro de staging' })
  }
})

/**
 * POST /api/importaciones/staging/:id/ejecutar
 * Super Admin ejecuta la carga del JSON a la DB del tenant
 */
router.post('/staging/:id/ejecutar', authMiddleware, checkSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const importacion = await prisma.importacionStaging.findUnique({ where: { id } })
    if (!importacion) return res.status(404).json({ error: 'Importación no encontrada' })
    if (!importacion.jsonData) return res.status(400).json({ error: 'No hay JSON validado para ejecutar. Revisá primero el archivo.' })
    if (importacion.estado === 'EJECUTADO') return res.status(400).json({ error: 'Esta importación ya fue ejecutada anteriormente.' })

    const data = importacion.jsonData as any[]
    if (!Array.isArray(data)) return res.status(400).json({ error: 'El JSON debe ser un array de registros.' })

    const empresaId = importacion.empresaId
    let cargados = 0
    let errores: string[] = []

    // ── Lógica según tipo ──────────────────────────────────────────────────
    if (importacion.tipo === 'INSUMOS') {
      for (const item of data) {
        try {
          await prisma.insumo.upsert({
            where: {
              tipo_nombre_talle_empresaId: {
                tipo: item.tipo || 'GENERAL',
                nombre: item.nombre,
                talle: item.talle || null,
                empresaId
              }
            },
            create: {
              empresaId,
              tipo: item.tipo || 'GENERAL',
              categoria: item.categoria || 'SIN CATEGORÍA',
              nombre: item.nombre,
              unidad: item.unidad || 'unidad',
              stockActual: Number(item.stockActual) || 0,
              stockMinimo: Number(item.stockMinimo) || 0,
              talle: item.talle || null
            },
            update: {
              categoria: item.categoria || 'SIN CATEGORÍA',
              unidad: item.unidad || 'unidad',
              stockActual: Number(item.stockActual) || 0,
              stockMinimo: Number(item.stockMinimo) || 0,
            }
          })
          cargados++
        } catch (e: any) {
          errores.push(`Fila "${item.nombre}": ${e.message}`)
        }
      }
    } else if (importacion.tipo === 'PRODUCTOS') {
      for (const item of data) {
        try {
          await prisma.producto.upsert({
            where: { nombre_empresaId: { nombre: item.nombre, empresaId } },
            create: {
              empresaId,
              nombre: item.nombre,
              precioFinal: Number(item.precioFinal) || 0,
              precioRevendedor: Number(item.precioRevendedor) || 0,
              precioEmpresa: Number(item.precioEmpresa) || 0,
            },
            update: {
              precioFinal: Number(item.precioFinal) || 0,
              precioRevendedor: Number(item.precioRevendedor) || 0,
              precioEmpresa: Number(item.precioEmpresa) || 0,
            }
          })
          cargados++
        } catch (e: any) {
          errores.push(`Fila "${item.nombre}": ${e.message}`)
        }
      }
    }

    // Marcar como ejecutado
    await prisma.importacionStaging.update({
      where: { id },
      data: {
        estado: errores.length > 0 ? 'ERROR' : 'EJECUTADO',
        ejecutadoEn: new Date(),
        notas: errores.length > 0
          ? `Ejecutado con ${errores.length} errores:\n${errores.join('\n')}`
          : `✅ ${cargados} registros cargados exitosamente.`
      }
    })

    res.json({
      mensaje: `Importación finalizada. ${cargados} registros cargados.`,
      cargados,
      errores
    })
  } catch (error: any) {
    console.error('Error al ejecutar importación:', error)
    res.status(500).json({ error: 'Error al ejecutar la importación' })
  }
})

export default router
