const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const inactiveUsers = await prisma.usuario.findMany({ where: { activo: false } });
  const inactiveInsumos = await prisma.insumo.findMany({ where: { activo: false } });
  
  // Also check if there's any record that says something about 'cierre' in a comment or reason
  const recentPrecios = await prisma.precioInsumo.findMany({ 
    where: { motivo: { contains: 'cierre' } } 
  });

  console.log('Inactive Users:', inactiveUsers);
  console.log('Inactive Insumos:', inactiveInsumos);
  console.log('Recent Precios with "cierre":', recentPrecios);
}

check().catch(console.error).finally(() => prisma.$disconnect());
