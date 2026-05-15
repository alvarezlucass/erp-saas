import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

const empresaSchema = z.object({
  nombre:  z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
})

// GET /api/empresa/me — Obtener mi empresa
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.empresaId }
    })
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' })
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.json(empresa)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos de empresa' })
  }
})

// PATCH /api/empresa/me — Actualizar perfil
router.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const rolesAutorizados = ['ADMIN', 'CLIENT_ADMIN', 'SUPER_ADMIN']
    const esAutorizado = rolesAutorizados.includes(req.rol || '') || req.permisos?.includes('ADMIN')

    if (!esAutorizado) {
      return res.status(403).json({ error: 'No tienes permisos para editar la empresa' })
    }

    const data = empresaSchema.parse(req.body)

    const actualizada = await prisma.empresa.update({
      where: { id: req.empresaId },
      data: {
        nombre:  data.nombre,
        logoUrl: data.logoUrl
      }
    })

    res.json(actualizada)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar empresa' })
  }
})

export default router
