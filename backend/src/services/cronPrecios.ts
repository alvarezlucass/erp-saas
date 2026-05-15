import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function checkAndExecuteScheduledPrices() {
  const now = new Date()
  
  try {
    const pendings = await prisma.cambioPrecioProgramado.findMany({
      where: {
        fechaEjecucion: { lte: now },
        ejecutado: false
      }
    })

    if (pendings.length === 0) return

    console.log(`[CRON PRECIOS] Ejecutando ${pendings.length} cambios programados...`)

    for (const prog of pendings) {
      const { id, empresaId, tipo, targetId, porcentaje } = prog
      const factor = 1 + (porcentaje / 100)

      try {
        if (tipo === 'GLOBAL') {
          await prisma.producto.updateMany({
            where: { empresaId, activo: true },
            data: {
              precioFinal: { multiply: factor },
              precioRevendedor: { multiply: factor },
              precioEmpresa: { multiply: factor },
              precioRevendido: { multiply: factor },
            }
          })
          // Nota: Prisma updateMany con multiply no funciona directamente en todos los DBs o versiones.
          // Para ser seguros en Prisma con Postgres, usaremos executeRaw si es necesario, 
          // pero updateMany con campos numéricos a veces requiere una lógica distinta.
          // En Postgres:
          await prisma.$executeRawUnsafe(`
            UPDATE productos 
            SET "precioFinal" = "precioFinal" * ${factor},
                "precioRevendedor" = "precioRevendedor" * ${factor},
                "precioEmpresa" = "precioEmpresa" * ${factor},
                "precioRevendido" = "precioRevendido" * ${factor}
            WHERE "empresaId" = '${empresaId}' AND activo = true
          `)
        } else if (tipo === 'CATEGORIA' && targetId) {
          await prisma.$executeRawUnsafe(`
            UPDATE productos 
            SET "precioFinal" = "precioFinal" * ${factor},
                "precioRevendedor" = "precioRevendedor" * ${factor},
                "precioEmpresa" = "precioEmpresa" * ${factor},
                "precioRevendido" = "precioRevendido" * ${factor}
            WHERE "empresaId" = '${empresaId}' AND "categoriaId" = '${targetId}' AND activo = true
          `)
        } else if (tipo === 'PRODUCTO' && targetId) {
          await prisma.$executeRawUnsafe(`
            UPDATE productos 
            SET "precioFinal" = "precioFinal" * ${factor},
                "precioRevendedor" = "precioRevendedor" * ${factor},
                "precioEmpresa" = "precioEmpresa" * ${factor},
                "precioRevendido" = "precioRevendido" * ${factor}
            WHERE id = '${targetId}'
          `)
        }

        await prisma.cambioPrecioProgramado.update({
          where: { id },
          data: { ejecutado: true }
        })

        console.log(`✅ Cambio programado ${id} ejecutado con éxito.`)
      } catch (err) {
        console.error(`❌ Error ejecutando cambio programado ${id}:`, err)
      }
    }
  } catch (error) {
    console.error('[CRON PRECIOS ERROR]', error)
  }
}

// Iniciar el intervalo (ej: cada 5 minutos)
export function startCronPrecios() {
  console.log('⏰ Servicio de Precios Programados iniciado.')
  setInterval(checkAndExecuteScheduledPrices, 1000 * 60 * 5) // 5 minutos
}
