import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const PRECIOS_MODULOS: Record<string, number> = {
  ADMIN: 0, // Incluido gratis por defecto
  COMERCIAL: 15000,   // Ventas & POS
  INVENTARIO: 10000,  // Inventario
  PRODUCCION: 25000,  // Producción Avanzada
  FINANZAS: 20000     // Finanzas Completas
}

export interface DetalleAbono {
  diasDesdeAlta: number
  modulosActivos: string[]
  precioListaTotal: number
  porcentajeDescuento: number
  descuentoMonto: number
  precioFinal: number
  proximaEscalaDias: number | null
  proximaEscalaDescuento: number | null
}

/**
 * Calcula el abono mensual de una empresa basándose en sus módulos activos y la promoción de bienvenida.
 */
export async function calcularDetalleAbono(empresaId: string): Promise<DetalleAbono> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId }
  })

  if (!empresa) {
    throw new Error('Empresa no encontrada')
  }

  // Calcular diferencia en días
  const hoy = new Date()
  const fechaAlta = new Date(empresa.creadoEn)
  const diffTime = Math.abs(hoy.getTime() - fechaAlta.getTime())
  const diasDesdeAlta = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Calcular descuento progresivo
  let porcentajeDescuento = 0
  let proximaEscalaDias: number | null = null
  let proximaEscalaDescuento: number | null = null

  if (diasDesdeAlta <= 90) {
    porcentajeDescuento = 100
    proximaEscalaDias = 91
    proximaEscalaDescuento = 50
  } else if (diasDesdeAlta <= 180) {
    porcentajeDescuento = 50
    proximaEscalaDias = 181
    proximaEscalaDescuento = 40
  } else if (diasDesdeAlta <= 225) {
    porcentajeDescuento = 40
    proximaEscalaDias = 226
    proximaEscalaDescuento = 30
  } else if (diasDesdeAlta <= 270) {
    porcentajeDescuento = 30
    proximaEscalaDias = 271
    proximaEscalaDescuento = 20
  } else if (diasDesdeAlta <= 315) {
    porcentajeDescuento = 20
    proximaEscalaDias = 316
    proximaEscalaDescuento = 10
  } else if (diasDesdeAlta <= 360) {
    porcentajeDescuento = 10
    proximaEscalaDias = 361
    proximaEscalaDescuento = 0
  } else {
    porcentajeDescuento = 0
    proximaEscalaDias = null
    proximaEscalaDescuento = null
  }

  // Calcular precio total de lista de los módulos contratados
  const modulosActivos = empresa.modulos || []
  let precioListaTotal = 0
  modulosActivos.forEach(mod => {
    const precio = PRECIOS_MODULOS[mod] || 0
    precioListaTotal += precio
  })

  // Precio base mínimo si no tiene módulos (por ejemplo, mantenimiento)
  if (precioListaTotal === 0 && modulosActivos.includes('ADMIN')) {
    precioListaTotal = 5000 // Cargo base de mantenimiento
  }

  const descuentoMonto = Math.round(precioListaTotal * (porcentajeDescuento / 100))
  const precioFinal = precioListaTotal - descuentoMonto

  return {
    diasDesdeAlta,
    modulosActivos,
    precioListaTotal,
    porcentajeDescuento,
    descuentoMonto,
    precioFinal,
    proximaEscalaDias,
    proximaEscalaDescuento
  }
}
