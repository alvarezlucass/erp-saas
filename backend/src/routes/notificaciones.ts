import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Solo accesible para administradores
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.rol !== 'SUPER_ADMIN' && req.rol !== 'CLIENT_ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: { empresaId: req.empresaId },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 10
    })

    res.json(notificaciones)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener novedades' })
  }
})

export default router
