import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de proveedores
router.use(authMiddleware)

// Zod schemas para validación
const proveedorSchema = z.object({
  nombre:         z.string().min(1),
  razonSocial:    z.string().optional().nullable(),
  cuit:           z.string().optional().nullable(),
  // Domicilio Legal
  dirLegalCalle:     z.string().optional().nullable(),
  dirLegalNro:       z.string().optional().nullable(),
  dirLegalPiso:      z.string().optional().nullable(),
  dirLegalCiudad:    z.string().optional().nullable(),
  dirLegalProvincia: z.string().optional().nullable(),
  dirLegalCP:        z.string().optional().nullable(),
  // Domicilio Real
  dirRealCalle:      z.string().optional().nullable(),
  dirRealNro:        z.string().optional().nullable(),
  dirRealPiso:       z.string().optional().nullable(),
  dirRealCiudad:     z.string().optional().nullable(),
  dirRealProvincia:  z.string().optional().nullable(),
  dirRealCP:         z.string().optional().nullable(),
  // Condiciones
  formaPago:         z.string().optional().nullable(),
  diasPago:          z.number().int().min(0).optional().nullable(),
  tiempoEntrega:     z.string().optional().nullable(),
  medioPedido:       z.string().optional().nullable(),

  telefono:       z.string().optional().nullable(),
  email:          z.string().email().optional().or(z.literal('')).nullable(),
  contactoNombre: z.string().optional().nullable(),
  rubro:          z.string().optional().nullable(),
  notas:          z.string().optional().nullable(),
})

// GET /api/proveedores — listar
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const proveedores = await prisma.proveedor.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' }
    })
    res.json(proveedores)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' })
  }
})

// POST /api/proveedores — crear
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = proveedorSchema.parse(req.body)
    const proveedor = await prisma.proveedor.create({ 
      data: { ...data, empresaId } 
    })
    res.status(201).json(proveedor)
  } catch (error: any) {
    console.error('❌ Error creacion proveedor:', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    
    // Manejo específico de nombre duplicado (Prisma P2002)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese nombre.' })
    }
    
    res.status(500).json({ error: 'Error al crear proveedor' })
  }
})

// PATCH /api/proveedores/:id — editar
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = proveedorSchema.partial().parse(req.body)

    // Verificar pertenencia
    const existe = await prisma.proveedor.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Proveedor no encontrado' })

    const proveedor = await prisma.proveedor.update({
      where: { id: req.params.id },
      data
    })
    res.json(proveedor)
  } catch (error) {
    console.error('❌ Error actualizacion proveedor:', error)
    res.status(500).json({ error: 'Error al actualizar proveedor' })
  }
})

// DELETE /api/proveedores/:id — baja lógica
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    
    // Verificar pertenencia
    const existe = await prisma.proveedor.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Proveedor no encontrado' })

    await prisma.proveedor.update({
      where: { id: req.params.id },
      data: { activo: false }
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Error al dar de baja' })
  }
})

export default router
