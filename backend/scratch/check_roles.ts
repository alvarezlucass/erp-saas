import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usuarios = await prisma.usuario.findMany({
    take: 5,
    select: { id: true, email: true, rol: true, permisos: true }
  })
  console.log('--- USUARIOS EN DB ---')
  console.log(JSON.stringify(usuarios, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
