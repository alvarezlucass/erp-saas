import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const config = await prisma.configuracion.findMany({
      where: { empresaId }
    })
    const configMap = config.reduce((acc: any, curr) => {
      acc[curr.clave] = curr.valor
      return acc
    }, {})
    res.json(configMap)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración' })
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = req.body // { clave: valor, ... }
    const entries = Object.entries(data)

    for (const [clave, valor] of entries) {
      await prisma.configuracion.upsert({
        where: { clave_empresaId: { clave, empresaId } },
        create: { clave, valor: String(valor), empresaId },
        update: { valor: String(valor) }
      })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar configuración' })
  }
})

export default router
