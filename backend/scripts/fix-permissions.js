const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Aplicando permisos de Postgres para que el frontend pueda leer las tablas...');
  
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO anon, authenticated;`);
  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;`);
  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;`);
  await prisma.$executeRawUnsafe(`NOTIFY pgrst, 'reload schema';`);
  
  console.log('¡Permisos aplicados con éxito!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
