import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const instituciones = await prisma.institucion.findMany({
      where: { empresaId, activo: true },
      include: { _count: { select: { presupuestos: true, listas: true } } },
      orderBy: { nombre: 'asc' },
    })
    res.json(instituciones)
  } catch {
    res.status(500).json({ error: 'Error al obtener instituciones' })
  }
})

router.get('/:id/listas', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    
    // Verificar pertenencia
    const inst = await prisma.institucion.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!inst) return res.status(404).json({ error: 'Institución no encontrada' })

    const listas = await prisma.listaPrecio.findMany({
      where: { institucionId: req.params.id, activa: true },
      include: { items: true },
    })
    res.json(listas)
  } catch {
    res.status(500).json({ error: 'Error al obtener listas' })
  }
})

// Permite cargar un cliente/institucion nuevo rápido desde Presupuestos
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = req.body
    const nuevo = await prisma.institucion.create({
      data: {
        empresaId,
        nombre: data.nombre,
        tipo: data.tipo || 'COLEGIO',
        contacto: data.contacto,
        telefono: data.telefono
      }
    })
    res.json(nuevo)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: 'Error al crear institución' })
  }
})

export default router
