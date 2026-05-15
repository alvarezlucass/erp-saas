const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Insumo unique fields:', Object.keys(prisma.insumo.fields).filter(f => f.includes('unique')));
  // This might not work. Let's try to inspect the type or just try to get one record.
  try {
    await prisma.insumo.findUnique({
      where: {
        tipo_nombre_talle: { tipo: 'test', nombre: 'test', talle: 'test' }
      }
    });
  } catch (e) {
    console.log(e.message);
  }
}

main().finally(() => prisma.$disconnect());
