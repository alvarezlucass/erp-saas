const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  console.log('Seeding SAAS matrix...');
  const matrix = [
    { id: 'ESENCIAL', nombre: 'Esencial', precioMensual: 49, usuariosBase: 8, precioUsuarioExtra: 5, tiempoRespuesta: '24hs hábiles', modulos: ['COMERCIAL'] },
    { id: 'PROFESIONAL', nombre: 'Profesional', precioMensual: 79, usuariosBase: 15, precioUsuarioExtra: 5, tiempoRespuesta: '12hs hábiles', modulos: ['COMERCIAL', 'VENTAS'] },
    { id: 'ESCALA', nombre: 'Escala', precioMensual: 99, usuariosBase: 20, precioUsuarioExtra: 2, tiempoRespuesta: 'Atención Prioritaria', modulos: ['COMERCIAL', 'VENTAS', 'COMPRAS', 'TALLER', 'RRHH'] },
    { id: 'TOTAL', nombre: 'Total', precioMensual: 199, usuariosBase: 50, precioUsuarioExtra: 0, tiempoRespuesta: 'Soporte VIP 24/7', modulos: ['COMERCIAL', 'VENTAS', 'COMPRAS', 'TALLER', 'RRHH', 'BORDADOS', 'ADMINISTRACION', 'REPORTES', 'SISTEMAS'] }
  ];
  await prisma.configuracion.upsert({
    where: { clave_empresaId: { clave: 'SAAS_MATRIX', empresaId: 'SAAS_MASTER' } },
    create: { clave: 'SAAS_MATRIX', valor: JSON.stringify(matrix), empresaId: 'SAAS_MASTER' },
    update: { valor: JSON.stringify(matrix) }
  });
  console.log('Seeded!');
})().catch(console.error).finally(() => prisma.$disconnect());
