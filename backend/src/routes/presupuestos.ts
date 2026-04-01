import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/presupuestos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const presupuestos = await prisma.presupuesto.findMany({
      include: {
        institucion: { select: { nombre: true } },
        lineas: { select: { cantidad: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    })
    res.json(presupuestos)
  } catch {
    res.status(500).json({ error: 'Error al obtener presupuestos' })
  }
})

// GET /api/presupuestos/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const p = await prisma.presupuesto.findUnique({
      where: { id: req.params.id },
      include: {
        institucion: true,
        lineas: { include: { producto: true } },
      },
    })
    if (!p) return res.status(404).json({ error: 'Presupuesto no encontrado' })
    res.json(p)
  } catch {
    res.status(500).json({ error: 'Error al obtener presupuesto' })
  }
})

const lineaSchema = z.object({
  productoId:      z.string().optional(),
  productoNombre:  z.string().min(1),
  talle:           z.string().min(1),
  bordado:         z.string().optional(),
  estampado:       z.string().optional(),
  cantidad:        z.number().int().positive(),
  precioBordado:   z.number().min(0).default(0),
  precioEstampado: z.number().min(0).default(0),
  precioUnitario:  z.number().positive(),
})

const crearPresupuestoSchema = z.object({
  institucionId:   z.string().optional(),
  clienteNombre:   z.string().optional(),
  clienteContacto: z.string().optional(),
  clienteTelefono: z.string().optional(),
  modoPago:        z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']).default('TRANSFERENCIA'),
  descuento:       z.number().min(0).max(1).default(0),
  recargo:         z.number().min(0).max(1).default(0),
  senia:           z.number().min(0).default(0),
  notas:           z.string().optional(),
  lineas:          z.array(lineaSchema).min(1),
})

// POST /api/presupuestos
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = crearPresupuestoSchema.parse(req.body)

    const subtotal = data.lineas.reduce(
      (acc: number, l: z.infer<typeof lineaSchema>) =>
        acc + (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad,
      0
    )
    const total = subtotal * (1 - data.descuento) * (1 + data.recargo)

    const presupuesto = await prisma.presupuesto.create({
      data: {
        institucionId:   data.institucionId,
        clienteNombre:   data.clienteNombre,
        clienteContacto: data.clienteContacto,
        clienteTelefono: data.clienteTelefono,
        modoPago:        data.modoPago,
        descuento:       data.descuento,
        recargo:         data.recargo,
        senia:           data.senia,
        subtotal,
        total,
        notas:           data.notas,
        lineas: {
          create: data.lineas.map((l: z.infer<typeof lineaSchema>) => ({
            productoId:      l.productoId,
            productoNombre:  l.productoNombre,
            talle:           l.talle,
            bordado:         l.bordado,
            estampado:       l.estampado,
            cantidad:        l.cantidad,
            precioBordado:   l.precioBordado,
            precioEstampado: l.precioEstampado,
            precioUnitario:  l.precioUnitario,
            subtotal: (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad,
          })),
        },
      },
      include: { lineas: true },
    })

    res.status(201).json(presupuesto)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear presupuesto' })
  }
})

// PATCH /api/presupuestos/:id/estado
router.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.body
    const p = await prisma.presupuesto.update({
      where: { id: req.params.id },
      data: { estado },
    })
    res.json(p)
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' })
  }
})

export default router
