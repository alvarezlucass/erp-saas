import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de talles
router.use(authMiddleware)

// GET /api/talles — listar curvas de talles con sus items
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const curvas = await prisma.curvaTalle.findMany({
      where: { empresaId },
      include: { items: { orderBy: { orden: 'asc' } } },
      orderBy: { nombre: 'asc' }
    })
    res.json(curvas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener curvas de talles' })
  }
})

// POST /api/talles — crear curva de talles industrial
const crearCurvaSchema = z.object({
  nombre: z.string().min(1),
  items:  z.array(z.string()).min(1) // Ej: ["S", "M", "L", "XL"]
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = crearCurvaSchema.parse(req.body)
    const curva = await prisma.curvaTalle.create({
      data: {
        empresaId,
        nombre: data.nombre,
        items: {
          create: data.items.map((it, idx) => ({ 
            nombre: it, 
            orden:  idx 
          }))
        }
      },
      include: { items: true }
    })
    res.status(201).json(curva)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear curva de talles' })
  }
})

// PATCH /api/talles/:id — editar nombre de curva o estado
const editarCurvaSchema = z.object({
  nombre: z.string().optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = editarCurvaSchema.parse(req.body)

    // Verificar pertenencia
    const existe = await prisma.curvaTalle.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Curva de talles no encontrada' })

    const curva = await prisma.curvaTalle.update({
      where: { id: req.params.id },
      data,
      include: { items: { orderBy: { orden: 'asc' } } }
    })
    res.json(curva)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar curva de talles' })
  }
})

// DELETE /api/talles/:id — eliminación definitiva
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId

    // Obtener los nombres de los talles de esta curva (verificando empresa)
    const curva = await prisma.curvaTalle.findFirst({
      where: { id: req.params.id, empresaId },
      include: { items: true }
    })

    if (!curva) return res.status(404).json({ error: 'Curva de talles no encontrada' })

    const nombresTalles = curva.items.map(it => it.nombre)

    // Verificar si hay medidas cargadas que usen estos nombres de talle EN ESTA EMPRESA
    const enUso = await prisma.medidaTalle.count({
        where: { 
          talle: { in: nombresTalles },
          producto: { empresaId }
        }
    })
    
    if (enUso > 0) {
      return res.status(400).json({ error: 'No se puede eliminar. Hay fichas técnicas de productos de su empresa que usan los nombres de talle de esta curva.' })
    }

    // Borrado en cascada manual (o por Prisma si estuviera configurado)
    await prisma.talleItem.deleteMany({
      where: { curvaId: req.params.id }
    })

    await prisma.curvaTalle.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Curva de talles eliminada definitivamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al intentar eliminar la curva de talles.' })
  }
})

export default router
