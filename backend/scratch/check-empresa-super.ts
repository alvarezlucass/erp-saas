import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const empresa = await prisma.empresa.findUnique({
    where: { id: 'cmnue4j9b0000q5lu2uwjt5m1' }
  })
  console.log('🏢 Empresa Super Admin:', empresa)
  await prisma.$disconnect()
}

main()
