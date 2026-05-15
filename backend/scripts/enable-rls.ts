import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔒 Iniciando protección de base de datos (RLS)...')
  
  try {
    // 1. Obtener todas las tablas del esquema public
    const tables: any[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    console.log(`📊 Encontradas ${tables.length} tablas.`)

    // 2. Activar RLS en cada una
    for (const table of tables) {
      const tableName = table.tablename
      
      // No queremos activar RLS en las tablas de migraciones de Prisma si existen
      if (tableName === '_prisma_migrations') continue

      await prisma.$executeRawUnsafe(
        `ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`
      )
      console.log(`✅ RLS activado en: ${tableName}`)
    }

    console.log('🚀 Todas las tablas están ahora protegidas por Row-Level Security.')
  } catch (error) {
    console.error('❌ Error al activar RLS:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
