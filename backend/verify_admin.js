const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function check() {
  const email = 'admin@amanecer.com';
  const rawPass = 'unifai2025';
  
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    console.log('Admin user NOT found. Creating...');
    const hash = await bcrypt.hash(rawPass, 10);
    await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email,
        passwordHash: hash,
        rol: 'ADMIN'
      }
    });
    console.log('Admin user created successfully.');
  } else {
    console.log('Admin user found. Resetting password just in case...');
    const hash = await bcrypt.hash(rawPass, 10);
    await prisma.usuario.update({
      where: { email },
      data: { passwordHash: hash, activo: true }
    });
    console.log('Admin password reset successfully.');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
