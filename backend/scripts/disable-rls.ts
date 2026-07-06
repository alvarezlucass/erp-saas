import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔓 Desactivando protección de base de datos (RLS)...')
  
  try {
    const tables: any[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    console.log(`📊 Encontradas ${tables.length} tablas.`)

    for (const table of tables) {
      const tableName = table.tablename
      
      if (tableName === '_prisma_migrations') continue

      await prisma.$executeRawUnsafe(
        `ALTER TABLE public."${tableName}" DISABLE ROW LEVEL SECURITY;`
      )
      console.log(`✅ RLS desactivado en: ${tableName}`)
    }

    console.log('🚀 Todas las tablas están ahora desprotegidas por Row-Level Security.')
  } catch (error) {
    console.error('❌ Error al desactivar RLS:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
