import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de bordados
router.use(authMiddleware)

// GET /api/bordados — Lista todos los diseños
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const bordados = await prisma.bordado.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' }
    })
    res.json(bordados)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diseños de bordado' })
  }
})

// ESQUEMA DE VALIDACIÓN
const bordadoSchema = z.object({
  nombre:           z.string().min(1),
  descripcion:      z.string().optional().nullable(),
  puntadas:         z.number().int().nonnegative(),
  precioPorMillar:  z.number().nonnegative(),
  costoPonchado:    z.number().nonnegative(),
  marginTerceros:   z.number().min(0).max(500),
  fotoUrl:          z.string().optional().nullable(),
  archivoMatrizUrl: z.string().optional().nullable(),
  activo:           z.boolean().optional(),
  
  // Precios sugeridos por segmento
  precioFinal:      z.number().optional().nullable(),
  precioRevendedor: z.number().optional().nullable(),
  precioEmpresa:    z.number().optional().nullable(),
  precioRevendido:  z.number().optional().nullable(),
})

// POST /api/bordados — Crear diseño técnico
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = bordadoSchema.parse(req.body)
    const bordado = await prisma.bordado.create({ 
      data: { ...data, empresaId } 
    })
    res.status(201).json(bordado)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear diseño de bordado' })
  }
})

// PATCH /api/bordados/:id — Editar diseño
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = bordadoSchema.partial().parse(req.body)

    // Verificar pertenencia
    const existe = await prisma.bordado.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Diseño de bordado no encontrado' })

    const bordado = await prisma.bordado.update({
      where: { id: req.params.id },
      data
    })
    res.json(bordado)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar bordado' })
  }
})

// DELETE /api/bordados/:id — Baja o eliminación
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId

    // Verificar pertenencia
    const existe = await prisma.bordado.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Diseño de bordado no encontrado' })

    await prisma.bordado.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Diseño eliminado definitivamente' })
  } catch (error) {
    res.status(500).json({ error: 'No se puede eliminar. El diseño está vinculado a fichas técnicas.' })
  }
})

export default router
