import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const instituciones = await prisma.institucion.findMany({
      where: { activo: true },
      include: { _count: { select: { presupuestos: true, listas: true } } },
      orderBy: { nombre: 'asc' },
    })
    res.json(instituciones)
  } catch {
    res.status(500).json({ error: 'Error al obtener instituciones' })
  }
})

router.get('/:id/listas', async (req: Request, res: Response) => {
  try {
    const listas = await prisma.listaPrecio.findMany({
      where: { institucionId: req.params.id, activa: true },
      include: { items: true },
    })
    res.json(listas)
  } catch {
    res.status(500).json({ error: 'Error al obtener listas' })
  }
})

export default router
