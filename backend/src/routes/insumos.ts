import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de insumos
router.use(authMiddleware)

// GET /api/insumos — lista todos con precio actual y trazabilidad de proveedor
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const { tipo, categoria, buscar } = req.query

    const insumos = await prisma.insumo.findMany({
      where: {
        empresaId,
        activo: true,
        ...(tipo      ? { tipo:      { equals: String(tipo) } } : {}),
        ...(categoria ? { categoria: { equals: String(categoria) } } : {}),
        ...(buscar    ? { 
          OR: [
            { nombre:    { contains: String(buscar) } },
            { codigoInterno: { contains: String(buscar) } }
          ]
        } : {}),
      },
      include: {
        proveedores: {
          include: { proveedor: true }
        },
        precios: {
          orderBy: { fechaDesde: 'desc' as const },
          take: 1,
        },
      },
      orderBy: [{ tipo: 'asc' as const }, { categoria: 'asc' as const }, { nombre: 'asc' as const }],
    })

    const resultado = insumos.map((i: any) => {
      const principal = i.proveedores.find((p: any) => p.esPrincipal) || i.proveedores[0]
      return {
        ...i,
        proveedor: principal?.proveedor ?? null,
        costoActual:         i.precios[0]?.costo ?? null,
        ultimaActualizacion: i.precios[0]?.fechaDesde ?? null,
      }
    })

    res.json(resultado)
  } catch (error) {
    console.error('Error al obtener insumos:', error)
    res.status(500).json({ error: 'Error al obtener insumos' })
  }
})

// GET /api/insumos/:id/trazabilidad
router.get('/:id/trazabilidad', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    
    // Verificar que el insumo pertenezca a la empresa
    const insumo = await prisma.insumo.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' })

    const historial = await prisma.precioInsumo.findMany({
      where: { insumoId: req.params.id },
      orderBy: { fechaDesde: 'desc' },
      take: 20,
    })

    const usos = await prisma.insumoProducto.findMany({
      where: { insumoId: req.params.id },
      include: {
        producto: { select: { nombre: true, categoria: { select: { nombre: true } } } }
      }
    })

    res.json({ historial, usos })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener trazabilidad' })
  }
})

// POST /api/insumos — crear insumo industrial
const crearInsumoSchema = z.object({
  codigoInterno: z.string().optional().nullable(),
  tipo:          z.string().min(1),
  categoria:     z.string().min(1),
  nombre:        z.string().min(1),
  descripcion:   z.string().optional().nullable(),
  unidad:        z.string().optional().nullable(),
  composicion:   z.string().optional().nullable(),
  gramaje:       z.number().optional().nullable(),
  ancho:         z.number().optional().nullable(),
  color:         z.string().optional().nullable(),
  stockMinimo:   z.number().optional().nullable(),
  proveedorId:   z.string().optional().nullable(),
  costo:         z.number().positive(),
  fotoUrl:       z.string().optional().nullable(),
  fichaTecnicaUrl: z.string().optional().nullable(),
  talle:         z.string().optional().nullable(),
  especificaciones: z.string().optional().nullable(),
  tiempoEntrega: z.string().optional().nullable(),
  leadTimeDays:  z.number().optional().nullable(),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = crearInsumoSchema.parse(req.body)
    const insumo = await prisma.insumo.create({
      data: {
        empresaId,
        codigoInterno: data.codigoInterno,
        tipo:          data.tipo,
        categoria:     data.categoria,
        nombre:        data.nombre,
        descripcion:   data.descripcion,
        unidad:        data.unidad,
        composicion:   data.composicion,
        gramaje:       data.gramaje,
        ancho:         data.ancho,
        color:         data.color,
        stockMinimo:   data.stockMinimo,
        fotoUrl:       data.fotoUrl,
        fichaTecnicaUrl: data.fichaTecnicaUrl,
        talle:         data.talle,
        especificaciones: data.especificaciones,
        proveedores: data.proveedorId ? {
          create: {
            proveedorId: data.proveedorId,
            esPrincipal: true,
            costo: data.costo,
            tiempoEntrega: data.tiempoEntrega,
            leadTimeDays:  data.leadTimeDays
          }
        } : undefined,
        precios: {
          create: { costo: data.costo, motivo: 'Precio inicial' },
        },
      },
      include: { precios: true, proveedores: { include: { proveedor: true } } } as any,
    })
    res.status(201).json(insumo)
  } catch (error) {
    console.error('❌ Error al crear insumo:', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear insumo industrial' })
  }
})

// PATCH /api/insumos/:id/precio — actualizar precio individual
router.patch('/:id/precio', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { costo, motivo } = z.object({
      costo:  z.number().positive(),
      motivo: z.string().optional(),
    }).parse(req.body)

    // Verificar pertenencia
    const insumo = await prisma.insumo.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' })

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
router.post('/actualizar-masivo', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = z.object({
      porcentaje:   z.number().min(-99).max(500),
      tipo:         z.string().optional(),
      categoria:    z.string().optional(),
      nombreFiltro: z.string().optional(),
      motivo:       z.string().optional(),
    }).parse(req.body)

    const factor = 1 + data.porcentaje / 100

    const insumos = await prisma.insumo.findMany({
      where: {
        empresaId,
        activo: true,
        ...(data.tipo         ? { tipo:      { equals: data.tipo } } : {}),
        ...(data.categoria    ? { categoria: { contains: data.categoria } } : {}),
        ...(data.nombreFiltro ? { nombre:    { contains: data.nombreFiltro } } : {}),
      },
      include: {
        precios: { orderBy: { fechaDesde: 'desc' as const }, take: 1 },
      },
    })

    if (insumos.length === 0) {
      return res.status(400).json({ error: 'No se encontraron insumos con ese filtro' })
    }

    const nuevosPrecios = await prisma.$transaction(async (tx) => {
      const results = []
      for (const insumo of insumos) {
        const costoActual = Number(insumo.precios[0]?.costo ?? 0)
        const nuevoCosto  = Math.round(costoActual * factor * 100) / 100
        
        const np = await tx.precioInsumo.create({
          data: {
            insumoId: insumo.id,
            costo:    nuevoCosto,
            motivo:   data.motivo ?? `Actualización masiva ${data.porcentaje > 0 ? '+' : ''}${data.porcentaje}%`,
          },
        })
        results.push(np)
      }
      return results
    })

    res.json({
      actualizados: nuevosPrecios.length,
      porcentaje:   data.porcentaje,
      filtroAplicado: { tipo: data.tipo, categoria: data.categoria },
    })
  } catch (error) {
    console.error('❌ Error en actualización masiva:', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error en actualización masiva' })
  }
})

// PATCH /api/insumos/:id — edición general de ficha técnica
const editarInsumoSchema = z.object({
  codigoInterno: z.string().optional().nullable(),
  tipo:          z.string().optional(),
  categoria:     z.string().optional(),
  nombre:        z.string().optional(),
  descripcion:   z.string().optional().nullable(),
  unidad:        z.string().optional(),
  composicion:   z.string().optional().nullable(),
  gramaje:       z.number().optional().nullable(),
  ancho:         z.number().optional().nullable(),
  color:         z.string().optional().nullable(),
  stockMinimo:   z.number().optional().nullable(),
  proveedorId:   z.string().optional().nullable(),
  activo:        z.boolean().optional(),
  fotoUrl:       z.string().optional().nullable(),
  fichaTecnicaUrl: z.string().optional().nullable(),
  talle:         z.string().optional().nullable(),
  especificaciones: z.string().optional().nullable(),
  tiempoEntrega: z.string().optional().nullable(),
  leadTimeDays:  z.number().optional().nullable(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = editarInsumoSchema.parse(req.body)

    // Verificar pertenencia
    const existe = await prisma.insumo.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Insumo no encontrado' })

    const insumo = await prisma.insumo.update({
      where: { id: req.params.id },
      data: {
        ...data,
        proveedores: data.proveedorId ? {
          upsert: {
            where: {
              insumoId_proveedorId: {
                insumoId: req.params.id,
                proveedorId: data.proveedorId
              }
            },
            update: { 
              esPrincipal: true,
              tiempoEntrega: data.tiempoEntrega,
              leadTimeDays:  data.leadTimeDays
            },
            create: { 
              proveedorId: data.proveedorId, 
              esPrincipal: true,
              tiempoEntrega: data.tiempoEntrega,
              leadTimeDays:  data.leadTimeDays
            }
          }
        } : undefined
      },
      include: { 
        proveedores: { include: { proveedor: true } }, 
        precios: { orderBy: { fechaDesde: 'desc' }, take: 1 } 
      }
    })
    
    // Si se cambió el proveedorId, asegurar que otros no sean principal
    if (data.proveedorId) {
      await prisma.insumoProveedor.updateMany({
        where: { 
          insumoId: req.params.id,
          proveedorId: { not: data.proveedorId }
        },
        data: { esPrincipal: false }
      })
    }
    res.json(insumo)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar ficha técnica de insumo' })
  }
})

// DELETE /api/insumos/:id — eliminación definitiva
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    // Verificar pertenencia antes de borrar
    const insumo = await prisma.insumo.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' })

    await prisma.insumo.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Insumo eliminado del sistema' })
  } catch (error) {
    res.status(500).json({ error: 'No se puede eliminar el insumo. Es posible que esté vinculado a una ficha de producción.' })
  }
})

// GET /api/insumos/movimientos
router.get('/movimientos', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { insumoId, productoTalleId, productoId } = req.query
    
    const where: any = {
      OR: [
        { insumo: { empresaId } },
        { productoTalle: { producto: { empresaId } } }
      ]
    }
    if (insumoId)         where.insumoId = String(insumoId)
    if (productoTalleId)  where.productoTalleId = String(productoTalleId)
    if (productoId)       where.productoTalle = { productoId: String(productoId) }

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: { 
        usuario: { select: { nombre: true, email: true } },
        insumo: { select: { nombre: true, unidad: true } },
        productoTalle: { 
          include: { 
            producto: { select: { nombre: true } }
          }
        },
        pedido: { select: { numero: true } }
      },
      orderBy: { creadoEn: 'desc' },
      take: 20
    })
    res.json(movimientos)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar movimientos de auditoría' })
  }
})

// POST /api/insumos/stock-ajuste
router.post('/stock-ajuste', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = z.object({
      insumoId: z.string(),
      tipo:     z.enum(['INGRESO', 'EGRESO', 'AJUSTE']),
      cantidad: z.number().positive(),
      motivo:   z.string().min(3),
      costoUnitario: z.number().optional().nullable(),
      proveedorId:   z.string().optional().nullable()
    }).parse(req.body)

    // Verificar que el insumo pertenece a la empresa
    const existe = await prisma.insumo.findFirst({
      where: { id: data.insumoId, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Insumo no encontrado' })

    const factor = data.tipo === 'EGRESO' ? -1 : 1

    const resultado = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoStock.create({
        data: {
          insumoId: data.insumoId,
          tipo:     data.tipo,
          cantidad: data.cantidad * factor,
          motivo:   data.motivo,
          usuarioId: req.usuarioId,
          proveedorId: data.proveedorId,
          costoUnitario: data.costoUnitario
        }
      })

      const insumo = await tx.insumo.update({
        where: { id: data.insumoId },
        data: {
          stockActual: data.tipo === 'AJUSTE' 
            ? data.cantidad 
            : { increment: data.cantidad * factor }
        }
      })

      // Si es ingreso con costo, actualizamos el historial de precios
      if (data.tipo === 'INGRESO' && data.costoUnitario) {
        await tx.precioInsumo.create({
          data: {
            insumoId: data.insumoId,
            costo:    data.costoUnitario,
            motivo:   `Recepción de mercadería: ${data.motivo}`
          }
        })
      }

      return { mov, stockActualizado: insumo.stockActual }
    })

    res.status(201).json(resultado)
  } catch (error) {
    console.error('❌ Error en ajuste de stock:', error)
    res.status(400).json({ error: 'Error al procesar el ajuste de stock' })
  }
})

export default router
