import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

// Utility para días hábiles
function agregarDiasHabiles(fecha: Date, dias: number): Date {
  let contador = 0
  let actual = new Date(fecha)
  while (contador < dias) {
    actual.setDate(actual.getDate() + 1)
    const dia = actual.getDay() // 0 = Domingo, 6 = Sábado
    if (dia !== 0 && dia !== 6) contador++
  }
  return actual
}

function agregarDiasCorridos(fecha: Date, dias: number): Date {
  let actual = new Date(fecha)
  actual.setDate(actual.getDate() + dias)
  return actual
}

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de presupuestos
router.use(authMiddleware)

// GET /api/presupuestos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const presupuestos = await prisma.presupuesto.findMany({
      where: { empresaId },
      include: {
        cliente: { select: { nombre: true, apellido: true } },
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
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const p = await prisma.presupuesto.findFirst({
      where: { id: req.params.id, empresaId },
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
  tipoItem:        z.enum(['PRODUCTO', 'SERVICIO_BORDADO']).default('PRODUCTO'),
  productoId:      z.string().optional().nullable(),
  productoNombre:  z.string().min(1),
  talle:           z.string().optional().nullable(),
  bordado:         z.string().optional().nullable(),
  estampado:       z.string().optional().nullable(),
  cantidad:        z.number().int().positive(),
  precioBordado:   z.number().min(0).default(0),
  precioEstampado: z.number().min(0).default(0),
  precioUnitario:  z.number().min(0),
  entregado:       z.boolean().default(true),
})

const crearPresupuestoSchema = z.object({
  clienteId:       z.string().optional().nullable(),
  institucionId:   z.string().optional().nullable(),
  clienteNombre:   z.string().optional(),
  clienteContacto: z.string().optional(),
  clienteTelefono: z.string().optional(),
  modoPago:        z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']).default('TRANSFERENCIA'),
  descuento:       z.number().min(0).max(1).default(0),
  recargo:         z.number().min(0).max(1).default(0),
  senia:           z.number().min(0).default(0),
  notas:           z.string().optional(),
  
  tipoVencimiento: z.enum(['HABILES', 'CORRIDOS']).default('CORRIDOS'),
  diasVigencia:    z.number().int().default(15),
  
  aplicaIva:       z.boolean().default(false),
  canal:           z.enum(['OFFICIAL', 'GESTION']).default('GESTION'),
  estado:          z.string().optional().default('VIGENTE'),

  // Campos POS
  pagado:          z.boolean().optional().default(false),
  requiereFactura: z.boolean().optional().default(false),
  cuotas:          z.number().int().min(1).optional().default(1),
  recargoPct:      z.number().min(0).optional().default(0),
  versionDe:       z.string().optional().nullable(),
  lineas:          z.array(lineaSchema).min(1),
})

// POST /api/presupuestos
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = crearPresupuestoSchema.parse(req.body)

    const subtotal = data.lineas.reduce(
      (acc: number, l: any) =>
        acc + (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad,
      0
    )
    
    // Base Imponible / Gravado
    const subtotalDescuento = subtotal * (1 - data.descuento) * (1 + data.recargo)
    const impuestosIva = data.aplicaIva ? (subtotalDescuento * 0.21) : 0
    const total = subtotalDescuento + impuestosIva

    // Cálculo Backend de Fechas Reales
    const fechaVencimiento = data.tipoVencimiento === 'HABILES' 
      ? agregarDiasHabiles(new Date(), data.diasVigencia)
      : agregarDiasCorridos(new Date(), data.diasVigencia)

    // Autogenerar número correlativo (aislado por empresa)
    // Autogenerar número correlativo (aislado por empresa)
    const maxP = await prisma.presupuesto.aggregate({ 
      where: { empresaId },
      _max: { numero: true } 
    })
    const numero = (maxP._max.numero || 1000) + 1

    // 1. Obtener costos actuales de los productos para el snapshot
    const productoIds = data.lineas.map(l => l.productoId).filter(Boolean) as string[]
    const productosInfo = await prisma.producto.findMany({
      where: { id: { in: productoIds }, empresaId },
      select: { id: true, costoCompra: true }
    })
    const costoMap = new Map(productosInfo.map(p => [p.id, p.costoCompra || 0]))

    const presupuesto = await prisma.presupuesto.create({
      data: {
        empresaId,
        numero,
        ...(data.clienteId ? { cliente: { connect: { id: data.clienteId } } } : {}),
        ...(data.institucionId ? { institucion: { connect: { id: data.institucionId } } } : {}),
        clienteNombre:   data.clienteNombre,
        clienteContacto: data.clienteContacto,
        clienteTelefono: data.clienteTelefono,
        modoPago:        data.modoPago,
        descuento:       data.descuento,
        recargo:         data.recargo,
        senia:           data.senia,
        subtotal,
        subtotalGravado: subtotalDescuento,
        impuestosIva,
        total,
        tipoVencimiento: data.tipoVencimiento,
        diasVigencia:    data.diasVigencia,
        fechaVencimiento,
        canal:           data.canal,
        estado:          data.estado,
        pagado:          data.pagado,
        requiereFactura: data.requiereFactura,
        cuotas:          data.cuotas,
        recargoPct:      data.recargoPct,
        notas:           data.notas,
        versionDe:       data.versionDe,
        costoTotalSnapshot: 0, // Se calculará abajo
        usuarioId:       req.usuarioId,
        lineas: {
          create: data.lineas.map((l: any) => ({
            tipoItem:        l.tipoItem,
            productoId:      l.productoId,
            productoNombre:  l.productoNombre,
            talle:           l.talle,
            bordado:         l.bordado,
            estampado:       l.estampado,
            cantidad:        l.cantidad,
            precioBordado:   l.precioBordado,
            precioEstampado: l.precioEstampado,
            precioUnitario:  l.precioUnitario,
            entregado:       l.entregado,
            costoUnitarioSnapshot: l.productoId ? (costoMap.get(l.productoId) || 0) : 0,
            subtotal: (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad,
          })),
        },
      },
      include: { lineas: true },
    })

    // Actualizar el costo total del presupuesto
    const costoTotal = presupuesto.lineas.reduce((acc, l) => acc + (l.costoUnitarioSnapshot * l.cantidad), 0)
    await prisma.presupuesto.update({
      where: { id: presupuesto.id },
      data: { costoTotalSnapshot: costoTotal }
    })

    res.status(201).json(presupuesto)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    console.error('❌ Error creacion presupuesto:', error)
    res.status(500).json({ error: 'Error al crear presupuesto' })
  }
})

// POST /api/presupuestos/:id/cobrar
// Finaliza la venta, registra el pago y descuenta stock entregado
router.post('/:id/cobrar', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { id } = req.params
    const { cuentaId, recargoPct, descuento, cuotas, requiereFactura } = req.body

    const presupuesto = await prisma.presupuesto.findFirst({
      where: { id, empresaId },
      include: { lineas: true }
    })

    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' })
    if (presupuesto.pagado) return res.status(400).json({ error: 'Este presupuesto ya fue pagado' })

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Calcular total final con recargos/descuentos de último momento si los hay
      const subtotal = presupuesto.subtotal
      const totalConAjustes = subtotal * (1 - (descuento || presupuesto.descuento)) * (1 + (recargoPct || presupuesto.recargoPct))
      const iva = presupuesto.impuestosIva // Usamos el IVA ya calculado o recalculamos si es necesario
      const totalFinal = totalConAjustes + iva

      // 2. Registrar Movimiento de Caja
      await tx.movimiento.create({
        data: {
          cuentaId,
          tipo: 'INGRESO',
          concepto: `Cobro Presupuesto #${presupuesto.numero} - ${presupuesto.clienteNombre || 'Mostrador'}`,
          importe: totalFinal,
          usuarioId: req.usuarioId
        }
      })

      // 3. Descontar Stock y marcar como entregado
      for (const linea of presupuesto.lineas) {
        if (linea.entregado && linea.productoId && linea.talle) {
          // Descontar stock del talle específico
          const prodTalle = await tx.productoTalle.findFirst({
            where: { productoId: linea.productoId, talle: linea.talle }
          })

          if (prodTalle) {
            await tx.productoTalle.update({
              where: { id: prodTalle.id },
              data: { stockActual: { decrement: linea.cantidad } }
            })

            // Registrar Movimiento de Stock
            await tx.movimientoStock.create({
              data: {
                productoTalleId: prodTalle.id,
                tipo: 'VENTA',
                cantidad: -linea.cantidad,
                motivo: `Venta Mostrador Presupuesto #${presupuesto.numero}`,
                usuarioId: req.usuarioId
              }
            })
          }
        }
      }

      // 4. Si hay ítems NO entregados, el flujo industrial de Pedido se encargará luego.
      // Por ahora marcamos el presupuesto como PAGADO y CERRADO (o lo que corresponda)
      const todosEntregados = presupuesto.lineas.every(l => l.entregado)

      return await tx.presupuesto.update({
        where: { id },
        data: {
          pagado: true,
          estado: 'CERRADO',
          entregadoTodo: todosEntregados,
          recargoPct: recargoPct ?? presupuesto.recargoPct,
          descuento: descuento ?? presupuesto.descuento,
          cuotas: cuotas ?? presupuesto.cuotas,
          requiereFactura: requiereFactura ?? presupuesto.requiereFactura,
          usuarioFinalizaId: req.usuarioId
        }
      })
    })

    res.json(resultado)
  } catch (error) {
    console.error('❌ Error en cobro:', error)
    res.status(500).json({ error: 'Error al procesar el cobro' })
  }
})

export default router
