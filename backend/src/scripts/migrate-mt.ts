const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migración de datos a Multi-Sucursal...');

  const usuarios = await prisma.usuario.findMany();
  console.log(`Encontrados ${usuarios.length} usuarios para migrar.`);

  for (const u of usuarios) {
    if (u.empresaId) {
      console.log(`Migrando membresía para: ${u.email} en empresa: ${u.empresaId}`);
      await prisma.membresia.upsert({
        where: {
          usuarioId_empresaId: {
            usuarioId: u.id,
            empresaId: u.empresaId
          }
        },
        update: {},
        create: {
          usuarioId: u.id,
          empresaId: u.empresaId,
          rol: u.rol || 'OPERADOR',
          permisos: u.permisos || [],
          tarifaVenta: u.tarifaVenta || 'PRECIO_FINAL'
        }
      });
    }
  }

  console.log('🚀 Migrando referencias en Presupuestos...');
  const presupuestos = await prisma.presupuesto.findMany();
  for (const p of presupuestos) {
    if (p.usuarioId || p.usuarioFinalizaId) {
      const updates: any = {};
      
      if (p.usuarioId) {
        const mem = await prisma.membresia.findFirst({
          where: { usuarioId: p.usuarioId, empresaId: p.empresaId }
        });
        if (mem) updates.membresiaId = mem.id;
      }

      if (p.usuarioFinalizaId) {
        const memFin = await prisma.membresia.findFirst({
          where: { usuarioId: p.usuarioFinalizaId, empresaId: p.empresaId }
        });
        if (memFin) updates.membresiaFinalizaId = memFin.id;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.presupuesto.update({
          where: { id: p.id },
          data: updates
        });
      }
    }
  }

  console.log('✅ Migración de datos completada exitosamente.');
}

main()
  .catch(e => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
