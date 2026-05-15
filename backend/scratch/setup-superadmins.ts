import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const newPassword = 'Unifai2026!'
  const passwordHash = await bcrypt.hash(newPassword, 10)
  
  const superAdminEmpresaId = 'cmnue4j9b0000q5lu2uwjt5m1'

  const emails = [
    'admin@t4-e.com',
    'alvarezlucass@gmail.com',
    'alvarezlucass@hotmail.com'
  ]

  console.log(`🔐 Configurando Super Admins con password: ${newPassword}`)

  for (const email of emails) {
    // Upsert Usuario
    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {
        passwordHash,
        activo: true,
        debeCambiarPassword: false // Permitir entrada directa para pruebas
      },
      create: {
        nombre: email.split('@')[0],
        email,
        passwordHash,
        activo: true,
        debeCambiarPassword: false
      }
    })

    // Asegurar Membresía SUPER_ADMIN
    await prisma.membresia.upsert({
      where: {
        usuarioId_empresaId: {
          usuarioId: usuario.id,
          empresaId: superAdminEmpresaId
        }
      },
      update: {
        rol: 'SUPER_ADMIN',
        activo: true
      },
      create: {
        usuarioId: usuario.id,
        empresaId: superAdminEmpresaId,
        rol: 'SUPER_ADMIN',
        activo: true
      }
    })

    console.log(`✅ Usuario configurado: ${email}`)
  }

  await prisma.$disconnect()
}

main()
