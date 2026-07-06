const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // We drop them first in case they exist to avoid errors
    try {
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Public can read SAAS_MASTER config" ON configuracion;`);
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Super admin can write SAAS_MASTER config" ON configuracion;`);
    } catch (e) {}

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Public can read SAAS_MASTER config" ON configuracion FOR SELECT USING ("empresaId" = 'SAAS_MASTER');
    `);
    
    // We use Supabase's auth.uid() function.
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Super admin can write SAAS_MASTER config" ON configuracion FOR ALL USING (
        EXISTS (
          SELECT 1 FROM usuarios WHERE usuarios.id::text = auth.uid()::text AND usuarios.rol = 'SUPER_ADMIN'
        )
      );
    `);
    console.log('RLS policies added successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
