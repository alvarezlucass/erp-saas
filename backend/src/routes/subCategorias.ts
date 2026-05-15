import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// GET /api/sub-categorias — listar sub-categorías (opcionalmente filtradas por categoriaId)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { categoriaId } = req.query

    const subs = await prisma.subCategoriaProducto.findMany({
      where: { 
        empresaId,
        ...(categoriaId ? { categoriaId: String(categoriaId) } : {})
      },
      orderBy: { nombre: 'asc' }
    })
    res.json(subs)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sub-categorías' })
  }
})

// POST /api/sub-categorias — crear sub-categoría
const crearSubSchema = z.object({
  nombre:      z.string().min(1),
  categoriaId: z.string().min(1)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = crearSubSchema.parse(req.body)
    const sub = await prisma.subCategoriaProducto.create({
      data: {
        empresaId,
        nombre:      data.nombre,
        categoriaId: data.categoriaId
      }
    })
    res.status(201).json(sub)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear sub-categoría' })
  }
})

// DELETE /api/sub-categorias/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const existe = await prisma.subCategoriaProducto.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Sub-categoría no encontrada' })

    await prisma.subCategoriaProducto.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
     res.status(500).json({ error: 'Error al eliminar sub-categoría' })
  }
})

export default router
