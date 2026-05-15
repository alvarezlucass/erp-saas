import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const cats = await prisma.categoriaProducto.findMany({
      include: { medidasBase: true }
    })
    console.log('Success! Found', cats.length, 'categories with measures.')
  } catch (err) {
    console.error('FAILED:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
