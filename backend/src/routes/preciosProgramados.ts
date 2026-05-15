import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Listar programaciones
router.get('/programaciones', async (req: AuthRequest, res: Response) => {
  try {
    const progs = await prisma.cambioPrecioProgramado.findMany({
      where: { empresaId: req.empresaId },
      include: { 
        usuario: { select: { nombre: true } }
      },
      orderBy: { fechaEjecucion: 'asc' }
    })
    res.json(progs)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar programaciones de precios' })
  }
})

// Programar nuevo cambio
router.post('/programaciones', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      tipo: z.enum(['CATEGORIA', 'PRODUCTO', 'GLOBAL']),
      targetId: z.string().optional().nullable(),
      porcentaje: z.number(),
      fechaEjecucion: z.string()
    })

    const data = schema.parse(req.body)

    const prog = await prisma.cambioPrecioProgramado.create({
      data: {
        empresaId: req.empresaId!,
        usuarioId: req.usuarioId!,
        tipo: data.tipo,
        targetId: data.targetId,
        porcentaje: data.porcentaje,
        fechaEjecucion: new Date(data.fechaEjecucion)
      }
    })

    res.status(201).json(prog)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al programar cambio de precio' })
  }
})

// Eliminar programación
router.delete('/programaciones/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.cambioPrecioProgramado.delete({
      where: { id: req.params.id, empresaId: req.empresaId }
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar programación' })
  }
})

export default router
