import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- DIAGNÓSTICO DE PERSISTENCIA PRODUCTOS ---')
  
  const productos = await prisma.producto.findMany({
    orderBy: { actualizadoEn: 'desc' },
    take: 3,
    select: {
      id: true,
      nombre: true,
      actualizadoEn: true,
      metadata: true,
      talles: {
        select: {
          talle: true,
          referenciaMolderia: true
        }
      }
    }
  })

  productos.forEach(p => {
    console.log(`\nProducto: ${p.nombre} (ID: ${p.id})`)
    console.log(`Actualizado: ${p.actualizadoEn}`)
    console.log(`Metadata: ${JSON.stringify(p.metadata, null, 2)}`)
    console.log(`Talles (${p.talles.length}): ${p.talles.map(t => t.talle).join(', ')}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
