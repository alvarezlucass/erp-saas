import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/insumos — lista todos con precio actual
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tipo, categoria, buscar } = req.query

    const insumos = await prisma.insumo.findMany({
      where: {
        activo: true,
        ...(tipo      ? { tipo:      { equals: String(tipo),      mode: 'insensitive' } } : {}),
        ...(categoria ? { categoria: { equals: String(categoria), mode: 'insensitive' } } : {}),
        ...(buscar    ? { nombre:    { contains: String(buscar),  mode: 'insensitive' } } : {}),
      },
      include: {
        precios: {
          orderBy: { fechaDesde: 'desc' as const },
          take: 1,
        },
      },
      orderBy: [{ tipo: 'asc' as const }, { categoria: 'asc' as const }, { nombre: 'asc' as const }],
    })

    const resultado = insumos.map((i) => ({
      id:                  i.id,
      tipo:                i.tipo,
      categoria:           i.categoria,
      nombre:              i.nombre,
      unidad:              i.unidad,
      costoActual:         i.precios[0]?.costo ?? null,
      ultimaActualizacion: i.precios[0]?.fechaDesde ?? null,
    }))

    res.json(resultado)
  } catch {
    res.status(500).json({ error: 'Error al obtener insumos' })
  }
})

// GET /api/insumos/:id/historial
router.get('/:id/historial', async (req: Request, res: Response) => {
  try {
    const historial = await prisma.precioInsumo.findMany({
      where: { insumoId: req.params.id },
      orderBy: { fechaDesde: 'desc' },
      take: 20,
    })
    res.json(historial)
  } catch {
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// POST /api/insumos — crear insumo
const crearInsumoSchema = z.object({
  tipo:      z.string().min(1),
  categoria: z.string().min(1),
  nombre:    z.string().min(1),
  unidad:    z.string().optional(),
  costo:     z.number().positive(),
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = crearInsumoSchema.parse(req.body)
    const insumo = await prisma.insumo.create({
      data: {
        tipo:      data.tipo,
        categoria: data.categoria,
        nombre:    data.nombre,
        unidad:    data.unidad,
        precios: {
          create: { costo: data.costo, motivo: 'Precio inicial' },
        },
      },
      include: { precios: true },
    })
    res.status(201).json(insumo)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear insumo' })
  }
})

// PATCH /api/insumos/:id/precio — actualizar precio individual
const actualizarPrecioSchema = z.object({
  costo:  z.number().positive(),
  motivo: z.string().optional(),
})

router.patch('/:id/precio', async (req: Request, res: Response) => {
  try {
    const { costo, motivo } = actualizarPrecioSchema.parse(req.body)
    const precio = await prisma.precioInsumo.create({
      data: {
        insumoId: req.params.id,
        costo,
        motivo: motivo ?? 'Actualización manual',
      },
    })
    res.json(precio)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar precio' })
  }
})

// POST /api/insumos/actualizar-masivo
const actualizarMasivoSchema = z.object({
  porcentaje:   z.number().min(-99).max(500),
  tipo:         z.string().optional(),
  categoria:    z.string().optional(),
  nombreFiltro: z.string().optional(),
  motivo:       z.string().optional(),
})

router.post('/actualizar-masivo', async (req: Request, res: Response) => {
  try {
    const data = actualizarMasivoSchema.parse(req.body)
    const factor = 1 + data.porcentaje / 100

    const insumos = await prisma.insumo.findMany({
      where: {
        activo: true,
        ...(data.tipo         ? { tipo:      { equals: data.tipo,         mode: 'insensitive' as const } } : {}),
        ...(data.categoria    ? { categoria: { contains: data.categoria,  mode: 'insensitive' as const } } : {}),
        ...(data.nombreFiltro ? { nombre:    { contains: data.nombreFiltro, mode: 'insensitive' as const } } : {}),
      },
      include: {
        precios: { orderBy: { fechaDesde: 'desc' as const }, take: 1 },
      },
    })

    if (insumos.length === 0) {
      return res.status(400).json({ error: 'No se encontraron insumos con ese filtro' })
    }

    const nuevosPrecios = await prisma.$transaction(
      insumos.map((insumo) => {
        const costoActual = Number(insumo.precios[0]?.costo ?? 0)
        const nuevoCosto  = Math.round(costoActual * factor * 100) / 100
        return prisma.precioInsumo.create({
          data: {
            insumoId: insumo.id,
            costo:    nuevoCosto,
            motivo:   data.motivo ?? `Actualización masiva ${data.porcentaje > 0 ? '+' : ''}${data.porcentaje}%`,
          },
        })
      })
    )

    res.json({
      actualizados: nuevosPrecios.length,
      porcentaje:   data.porcentaje,
      filtroAplicado: { tipo: data.tipo, categoria: data.categoria },
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error en actualización masiva' })
  }
})

export default router
