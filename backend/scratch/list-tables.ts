import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC
  `
  tables.forEach(t => console.log(t.tablename))
  await prisma.$disconnect()
}

main()
