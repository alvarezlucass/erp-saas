import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// GET /api/clientes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const clientes = await prisma.cliente.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json(clientes)
  } catch {
    res.status(500).json({ error: 'Error al obtener clientes' })
  }
})

// POST /api/clientes
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = req.body
    const nuevo = await prisma.cliente.create({
      data: {
        empresaId,
        nombre: data.nombre,
        apellido: data.apellido || null,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        razonSocial: data.razonSocial || null,
        cuit: data.cuit || null,
        condicionIva: data.condicionIva || 'CONSUMIDOR_FINAL',
        tipoFactura: data.tipoFactura || 'C'
      }
    })
    res.json(nuevo)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: 'Error al crear cliente' })
  }
})

export default router
