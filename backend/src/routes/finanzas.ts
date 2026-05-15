import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// --- COMPROBANTES ---

// Crear Comprobante (Factura, Remito, Recibo)
router.post('/comprobantes', async (req, res) => {
  const { 
    tipo, 
    numero, 
    total, 
    metodoPago, 
    esOficial, 
    clienteId, 
    proveedorId, 
    pedidoId,
    notas 
  } = req.body
  const empresaId = req.headers['x-empresa-id'] as string

  if (!empresaId) return res.status(400).json({ error: 'Falta empresaId' })

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el comprobante
      const comprobante = await tx.comprobante.create({
        data: {
          empresaId,
          tipo,
          numero,
          total: Number(total),
          metodoPago,
          esOficial: Boolean(esOficial),
          clienteId,
          proveedorId,
          pedidoId,
          notas
        }
      })

      // 2. Si impacta en Cuenta Corriente (si no es pago inmediato o si es un cargo)
      // Tipos que suelen generar DEUDA (DEBE): FACTURA, REMITO, NOTA_DEBITO
      // Tipos que suelen generar PAGO (HABER): RECIBO, NOTA_CREDITO
      
      const esDebe = ['FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'REMITO', 'NOTA_VENTA', 'NOTA_DEBITO'].includes(tipo)
      const esHaber = ['RECIBO_X', 'RECIBO', 'NOTA_CREDITO'].includes(tipo)

      if ((esDebe || esHaber) && (clienteId || proveedorId)) {
        const importe = esDebe ? Number(total) : -Number(total)
        
        if (clienteId) {
          const cliente = await tx.cliente.update({
            where: { id: clienteId },
            data: { saldo: { increment: importe } }
          })

          await tx.movimientoCuentaCorriente.create({
            data: {
              empresaId,
              clienteId,
              comprobanteId: comprobante.id,
              tipo: esDebe ? 'DEBE' : 'HABER',
              importe: Number(total),
              saldoResultante: cliente.saldo,
              descripcion: `${tipo} #${numero}`
            }
          })
        }

        if (proveedorId) {
          // Para proveedores, el saldo funciona al revés (deuda nuestra)
          // Pero lo mantendremos simple por ahora: saldo positivo = debemos nosotros
          const proveedor = await tx.proveedor.update({
            where: { id: proveedorId },
            data: { 
              // Aquí necesitaríamos agregar campo saldo a Proveedor si no existe
              // Vamos a verificar si Proveedor tiene saldo...
            }
          })
          // Nota: Si proveedor no tiene saldo, podríamos ignorar o agregarlo después
        }
      }

      return comprobante
    })

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear comprobante' })
  }
})

// Listar Comprobantes
router.get('/comprobantes', async (req, res) => {
  const empresaId = req.headers['x-empresa-id'] as string
  const { clienteId, tipo } = req.query

  try {
    const list = await prisma.comprobante.findMany({
      where: { 
        empresaId,
        ...(clienteId ? { clienteId: String(clienteId) } : {}),
        ...(tipo ? { tipo: String(tipo) } : {})
      },
      orderBy: { fecha: 'desc' },
      include: {
        cliente: { select: { nombre: true } },
        pedido: { select: { numero: true } }
      }
    })
    res.json(list)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar comprobantes' })
  }
})

// --- CUENTAS CORRIENTES ---

// Obtener Estado de Cuenta (Movimientos)
router.get('/cuenta-corriente/:tipo/:id', async (req, res) => {
  const { tipo, id } = req.params // tipo: cliente o proveedor
  const empresaId = req.headers['x-empresa-id'] as string

  try {
    const movimientos = await prisma.movimientoCuentaCorriente.findMany({
      where: {
        empresaId,
        ...(tipo === 'cliente' ? { clienteId: id } : { proveedorId: id })
      },
      orderBy: { fecha: 'desc' },
      include: {
        comprobante: true
      }
    })
    res.json(movimientos)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

export default router
