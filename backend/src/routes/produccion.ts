import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de producción
router.use(authMiddleware)

// POST /api/produccion/aprobar/:presupuestoId
// Corazón industrial: Convierte presupuesto en pedido y explota el BOM
router.post('/aprobar/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const { id } = req.params

    const presupuesto = await prisma.presupuesto.findFirst({
      where: { id, empresaId },
      include: { 
        lineas: { 
          include: { 
            producto: { 
              include: { 
                insumos: { 
                  include: { 
                    insumo: true 
                  } 
                } 
              } 
            } 
          } 
        } 
      }
    })

    if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' })
    if (presupuesto.estado !== 'VIGENTE') return res.status(400).json({ error: 'El presupuesto ya fue procesado o cancelado' })

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado del Presupuesto
      await tx.presupuesto.update({
        where: { id },
        data: { estado: 'PEDIDO' }
      })

      // 2. Crear el Pedido (aislado por empresa)
      const maxP = await tx.pedido.aggregate({ 
        where: { empresaId },
        _max: { numero: true } 
      })
      const numero = (maxP._max.numero || 2000) + 1

      const pedido = await tx.pedido.create({
        data: {
          empresaId,
          numero,
          presupuestoId: id,
          canal: presupuesto.canal,
          estado: 'CORTE', // Empezamos en Corte
          ordenes: {
            create: [
              { tipo: 'CORTE', descripcion: 'Corte de piezas según moldería' },
              { tipo: 'BORDADO', descripcion: 'Proceso de bordado' },
              { tipo: 'COSTURA', descripcion: 'Ensamble y confección' },
            ]
          },
          etapas: {
            create: [
              { nombreEtapa: 'CORTE', estado: 'PROCESO', fechaInicio: new Date() },
              { nombreEtapa: 'BORDADO', estado: 'PENDIENTE' },
              { nombreEtapa: 'COSTURA', estado: 'PENDIENTE' },
              { nombreEtapa: 'TERMINADO', estado: 'PENDIENTE' },
            ]
          }
        }
      })

      // 3. EXPLOSIÓN DE BOM (Cálculo de Consumo de Insumos)
      // ... (existing BOM logic)
      for (const linea of presupuesto.lineas) {
        if (linea.tipoItem === 'PRODUCTO' && linea.producto) {
          for (const itemBOM of linea.producto.insumos) {
            const cantidadTotal = itemBOM.cantidad * linea.cantidad
            
            await tx.movimientoStock.create({
              data: {
                insumoId: itemBOM.insumoId,
                tipo:     'CONSUMO_PRODUCCION',
                cantidad: -cantidadTotal,
                motivo:   `Consumo Pedido #${numero} (Prenda: ${linea.productoNombre})`,
                pedidoId: pedido.id,
                usuarioId: req.usuarioId
              }
            })

            await tx.insumo.update({
              where: { id: itemBOM.insumoId },
              data: { 
                stockActual: { decrement: cantidadTotal }
              }
            })
          }
        }
      }

      return pedido
    })

    res.status(201).json(resultado)
  } catch (error) {
    console.error('❌ Error en aprobación industrial:', error)
    res.status(500).json({ error: 'Error al procesar la aprobación del pedido' })
  }
})

// GET /api/produccion
// Listado real de pedidos con su progreso
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { empresaId: req.empresaId },
      include: {
        presupuesto: {
          include: {
            cliente: { select: { nombre: true, apellido: true } },
            lineas: true
          }
        },
        ordenes: true
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(pedidos)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar pedidos' })
  }
})

// PATCH /api/produccion/pedidos/:id/estado
// Cambia la etapa en el Kanban
router.patch('/pedidos/:id/estado', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { estado } = req.body // CORTE, BORDADO, COSTURA, TERMINADO

    const pedido = await prisma.pedido.update({
      where: { id, empresaId: req.empresaId },
      data: { estado }
    })
    res.json(pedido)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado del pedido' })
  }
})

// GET /api/produccion/ordenes
router.get('/ordenes', async (req: AuthRequest, res: Response) => {
  try {
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: { pedido: { empresaId: req.empresaId } },
      include: { pedido: true }
    })
    res.json(ordenes)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes de trabajo' })
  }
})

// PATCH /api/produccion/ordenes/:id
// Marcar OT como completada
router.patch('/ordenes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { completada } = req.body

    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { completada }
    })
    res.json(ot)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar orden de trabajo' })
  }
})

// --- ETAPAS DETALLADAS ---

// GET /api/produccion/pedidos/:id/etapas
router.get('/pedidos/:id/etapas', async (req: AuthRequest, res: Response) => {
  try {
    const etapas = await prisma.etapaPedido.findMany({
      where: { pedidoId: req.params.id },
      orderBy: { creadoEn: 'asc' }
    })
    res.json(etapas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener etapas' })
  }
})

// PATCH /api/produccion/etapas/:id
router.patch('/etapas/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { estado, notas, fechaFin, fechaInicio } = req.body

    const etapa = await prisma.etapaPedido.update({
      where: { id },
      data: { 
        estado, 
        notas, 
        usuarioId: req.usuarioId,
        ...(fechaInicio ? { fechaInicio: new Date(fechaInicio) } : {}),
        ...(fechaFin ? { fechaFin: new Date(fechaFin) } : {}),
        ...(estado === 'COMPLETADO' ? { fechaFin: new Date() } : {})
      }
    })
    res.json(etapa)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar etapa' })
  }
})

export default router

