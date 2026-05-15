import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Listando Usuarios y Membresías...')
  
  const usuarios = await prisma.usuario.findMany({
    include: {
      membresias: true
    }
  })

  console.table(usuarios.map(u => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    activo: u.activo,
    membresias: u.membresias.map(m => `${m.rol} (${m.empresaId})`).join(', ')
  })))

  await prisma.$disconnect()
}

main()
