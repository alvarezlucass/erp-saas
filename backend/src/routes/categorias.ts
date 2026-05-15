import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de categorías
router.use(authMiddleware)

// GET /api/categorias — listar categorías con sus puntos de medición
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const cats = await prisma.categoriaProducto.findMany({
      where: { empresaId, activo: true },
      include: { 
        puntosReferencia: true,
        medidasBase: true,
        subCategorias: { include: { puntosReferencia: true, medidasBase: true } }
      },
      orderBy: { nombre: 'asc' }
    })
    res.json(cats)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

// POST /api/categorias — crear categoría
const crearCatSchema = z.object({
  nombre:      z.string().min(1),
  descripcion: z.string().optional(),
  parentId:    z.string().optional().nullable(),
  puntos:      z.array(z.string()).optional() // Nombres de puntos de medición sugeridos
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = crearCatSchema.parse(req.body)
    const cat = await prisma.categoriaProducto.create({
      data: {
        empresaId,
        nombre:      data.nombre,
        descripcion: data.descripcion,
        parentId:    data.parentId || null,
        puntosReferencia: {
          create: data.puntos?.map(p => ({ nombre: p, empresaId })) || []
        }
      },
      include: { puntosReferencia: true, parent: true }
    })
    res.status(201).json(cat)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear categoría' })
  }
})

// PATCH /api/categorias/:id — editar categoría de producto
const editarCatSchema = z.object({
  nombre:      z.string().optional(),
  descripcion: z.string().optional().nullable(),
  parentId:    z.string().optional().nullable(),
  activo:      z.boolean().optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = editarCatSchema.parse(req.body)

    // Verificar pertenencia
    const existe = await prisma.categoriaProducto.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Categoría no encontrada' })

    const cat = await prisma.categoriaProducto.update({
      where: { id: req.params.id },
      data,
      include: { puntosReferencia: true }
    })
    res.json(cat)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar categoría de producto' })
  }
})

// DELETE /api/categorias/:id — eliminación definitiva
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    
    // Verificar pertenencia
    const existe = await prisma.categoriaProducto.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Categoría no encontrada' })

    // Verificar si tiene productos vinculados
    const enUso = await prisma.producto.count({ where: { categoriaId: req.params.id } })
    if (enUso > 0) return res.status(400).json({ error: 'No se puede eliminar. Hay productos vinculados a esta categoría técnica.' })

    await prisma.categoriaProducto.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Categoría eliminada' })
  } catch (error) {
    res.status(500).json({ error: 'Error al intentar eliminar la categoría.' })
  }
})

// --- GESTIÓN DE MATRIZ DE MEDIDAS BASE (EXCEL-LIKE) ---
const medidasBaseSchema = z.array(z.object({
  talle:   z.string(),
  puntoId: z.string(),
  valorCm: z.number()
}))

router.post('/:id/medidas-base', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = medidasBaseSchema.parse(req.body)
    const catId = req.params.id

    // Verificar pertenencia
    const existe = await prisma.categoriaProducto.findFirst({
      where: { id: catId, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Categoría no encontrada' })

    // Sincronización: Eliminar existentes y crear nuevas
    await prisma.$transaction([
      prisma.medidaBaseCategoria.deleteMany({ where: { categoriaId: catId } }),
      prisma.medidaBaseCategoria.createMany({
        data: data.map(m => ({
          categoriaId: catId,
          talle: m.talle,
          puntoId: m.puntoId,
          valorCm: m.valorCm
        }))
      })
    ])

    res.json({ success: true, count: data.length })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    console.error(error)
    res.status(500).json({ error: 'Error al persistir matriz de medidas base' })
  }
})

export default router
