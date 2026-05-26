import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Esquemas de validación
const ordenCompraSchema = z.object({
  proveedorId: z.string().min(1),
  fechaEntregaEstimada: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  items: z.array(z.object({
    insumoId: z.string().optional().nullable(),
    productoId: z.string().optional().nullable(),
    talle: z.string().optional().nullable(),
    cantidadPedida: z.number().positive(),
    costoUnitarioEstimado: z.number().nonnegative(),
  })).min(1)
})

// --- ÓRDENES DE COMPRA ---

// Listar OC
router.get('/ordenes', async (req: AuthRequest, res: Response) => {
  try {
    const { proveedorId, estado } = req.query
    const ordenes = await prisma.ordenCompra.findMany({
      where: {
        empresaId: req.empresaId,
        ...(proveedorId ? { proveedorId: String(proveedorId) } : {}),
        ...(estado ? { estado: String(estado) } : {}),
      },
      include: {
        proveedor: { select: { nombre: true } },
        _count: { select: { items: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(ordenes)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes de compra' })
  }
})

// Obtener detalle de OC
router.get('/ordenes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const orden = await prisma.ordenCompra.findFirst({
      where: { id: req.params.id, empresaId: req.empresaId },
      include: {
        proveedor: true,
        items: {
          include: {
            insumo: true,
            producto: true
          }
        }
      }
    })
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
    res.json(orden)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener detalle de orden' })
  }
})

// Crear OC
router.post('/ordenes', async (req: AuthRequest, res: Response) => {
  try {
    const data = ordenCompraSchema.parse(req.body)
    
    const totalEstimado = data.items.reduce((acc, item) => acc + (item.cantidadPedida * item.costoUnitarioEstimado), 0)

    const orden = await prisma.ordenCompra.create({
      data: {
        empresaId: req.empresaId!,
        proveedorId: data.proveedorId,
        fechaEntregaEstimada: data.fechaEntregaEstimada ? new Date(data.fechaEntregaEstimada) : null,
        notas: data.notas,
        totalEstimado,
        items: {
          create: data.items.map(item => ({
            insumoId: item.insumoId,
            productoId: item.productoId,
            talle: item.talle,
            cantidadPedida: item.cantidadPedida,
            costoUnitarioEstimado: item.costoUnitarioEstimado,
            subtotal: item.cantidadPedida * item.costoUnitarioEstimado
          }))
        }
      },
      include: { items: true }
    })

    res.status(201).json(orden)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear orden de compra' })
  }
})

// --- RECEPCIONES ---

// Registrar Recepción (Macheo)
router.post('/recepciones', async (req: AuthRequest, res: Response) => {
  try {
    const receptionSchema = z.object({
      proveedorId: z.string().min(1),
      ordenCompraId: z.string().optional().nullable(),
      nroRemito: z.string().optional().nullable(),
      notas: z.string().optional().nullable(),
      items: z.array(z.object({
        lineaOrdenCompraId: z.string().optional().nullable(),
        insumoId: z.string().optional().nullable(),
        productoTalleId: z.string().optional().nullable(),
        cantidadRecibida: z.number().positive(),
        costoUnitarioReal: z.number().nonnegative(),
      })).min(1)
    })

    const data = receptionSchema.parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la Recepción
      const recepcion = await tx.recepcionMercaderia.create({
        data: {
          empresaId: req.empresaId!,
          proveedorId: data.proveedorId,
          ordenCompraId: data.ordenCompraId,
          nroRemito: data.nroRemito,
          notas: data.notas,
          items: {
            create: data.items.map(item => ({
              lineaOrdenCompraId: item.lineaOrdenCompraId,
              insumoId: item.insumoId,
              productoTalleId: item.productoTalleId,
              cantidadRecibida: item.cantidadRecibida,
              costoUnitarioReal: item.costoUnitarioReal,
            }))
          }
        }
      })

      // 2. Actualizar Stocks y Costos
      for (const item of data.items) {
        // Si es Insumo
        if (item.insumoId) {
          await tx.insumo.update({
            where: { id: item.insumoId },
            data: { 
              stockActual: { increment: item.cantidadRecibida },
              // Guardar histórico de precio
              precios: {
                create: {
                  costo: item.costoUnitarioReal,
                  motivo: `Recepción ${data.nroRemito || recepcion.id}`
                }
              }
            }
          })
          
          // Auditoría de stock
          await tx.movimientoStock.create({
            data: {
              insumoId: item.insumoId,
              tipo: 'INGRESO',
              cantidad: item.cantidadRecibida,
              motivo: `Recepción Remito: ${data.nroRemito || 'S/N'}`,
              usuarioId: req.usuarioId,
              proveedorId: data.proveedorId,
              costoUnitario: item.costoUnitarioReal
            }
          })
        }

        // Si es Producto Talle
        if (item.productoTalleId) {
          await tx.productoTalle.update({
            where: { id: item.productoTalleId },
            data: { stockActual: { increment: item.cantidadRecibida } }
          })

          // Actualizar costoCompra del producto base (promedio o último)
          const pt = await tx.productoTalle.findUnique({ where: { id: item.productoTalleId }, select: { productoId: true } })
          if (pt) {
            await tx.producto.update({
              where: { id: pt.productoId },
              data: { costoCompra: item.costoUnitarioReal }
            })
          }

          await tx.movimientoStock.create({
            data: {
              productoTalleId: item.productoTalleId,
              tipo: 'INGRESO',
              cantidad: item.cantidadRecibida,
              motivo: `Recepción Remito: ${data.nroRemito || 'S/N'}`,
              usuarioId: req.usuarioId,
              proveedorId: data.proveedorId,
              costoUnitario: item.costoUnitarioReal
            }
          })
        }

        // 3. Si viene de una OC, actualizar cantidadRecibida en la línea de OC
        if (item.lineaOrdenCompraId) {
          await tx.lineaOrdenCompra.update({
            where: { id: item.lineaOrdenCompraId },
            data: { cantidadRecibida: { increment: item.cantidadRecibida } }
          })
        }
      }

      // 4. Si es OC, verificar si se completó
      if (data.ordenCompraId) {
        const lineas = await tx.lineaOrdenCompra.findMany({
          where: { ordenCompraId: data.ordenCompraId }
        })
        const todasCompletas = lineas.every(l => l.cantidadRecibida >= l.cantidadPedida)
        const algunaRecibida = lineas.some(l => l.cantidadRecibida > 0)

        await tx.ordenCompra.update({
          where: { id: data.ordenCompraId },
          data: {
            estado: todasCompletas ? 'RECIBIDA_TOTAL' : algunaRecibida ? 'RECIBIDA_PARCIAL' : 'ENVIADA'
          }
        })
      }

      return recepcion
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('[RECEPCION ERROR]', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al registrar recepción' })
  }
})

export default router
