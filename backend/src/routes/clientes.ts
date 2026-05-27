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
      where: { empresaId },
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
        tipoFactura: data.tipoFactura || 'C',
        vencimiento: data.vencimiento ? new Date(data.vencimiento) : null,
        configSuscripcion: data.configSuscripcion || null
      }
    })
    res.json(nuevo)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: 'Error al crear cliente' })
  }
})

// PATCH /api/clientes/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const { id } = req.params
    const data = req.body
    const actualizado = await prisma.cliente.update({
      where: { id, empresaId },
      data: {
        nombre: data.nombre,
        apellido: data.apellido !== undefined ? data.apellido : undefined,
        telefono: data.telefono !== undefined ? data.telefono : undefined,
        email: data.email !== undefined ? data.email : undefined,
        direccion: data.direccion !== undefined ? data.direccion : undefined,
        razonSocial: data.razonSocial !== undefined ? data.razonSocial : undefined,
        cuit: data.cuit !== undefined ? data.cuit : undefined,
        condicionIva: data.condicionIva !== undefined ? data.condicionIva : undefined,
        tipoFactura: data.tipoFactura !== undefined ? data.tipoFactura : undefined,
        activo: data.activo !== undefined ? data.activo : undefined,
        vencimiento: data.vencimiento !== undefined ? (data.vencimiento ? new Date(data.vencimiento) : null) : undefined,
        configSuscripcion: data.configSuscripcion !== undefined ? data.configSuscripcion : undefined,
      }
    })
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: 'Error al actualizar cliente' })
  }
})

// DELETE /api/clientes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const { id } = req.params
    await prisma.cliente.update({
      where: { id, empresaId },
      data: { activo: false }
    })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: 'Error al eliminar cliente' })
  }
})

export default router
