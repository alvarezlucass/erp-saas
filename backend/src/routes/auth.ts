import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const loginSchema = z.object({
  email:    z.string().min(1), // Puede ser email o DNI/Cédula
  password: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    console.log('[AUTH] Buscando usuario...')
    const usuario = await prisma.usuario.findFirst({ 
      where: {
        OR: [
          { email },
          { identificadorNacional: email }
        ]
      },
      include: { 
        membresias: {
          where: { activo: true },
          include: { empresa: { select: { id: true, nombre: true, activa: true, modulos: true } } }
        }
      }
    })
    
    console.log('[AUTH] Usuario encontrado:', !!usuario)
    if (!usuario) {
      console.log(`[AUTH] Intento de login fallido: Usuario no encontrado (${email})`)
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    
    if (!usuario.activo) {
      console.log(`[AUTH] Intento de login fallido: Usuario inactivo (${email})`)
      return res.status(401).json({ error: 'Cuenta bloqueada o inactiva' })
    }

    console.log('[AUTH] Verificando membresías...', usuario.membresias.length)
    if (usuario.membresias.length === 0) {
      console.log(`[AUTH] Login fallido: Usuario sin membresías activas (${email})`)
      return res.status(401).json({ error: 'No tienes acceso a ninguna empresa' })
    }

    console.log('[AUTH] Comparando password...')
    const ok = await bcrypt.compare(password, usuario.passwordHash)
    if (!ok) {
      console.log(`[AUTH] Intento de login fallido: Password incorrecto para (${email})`)
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Selección automática si solo tiene una membresía
    const membresiaActiva = usuario.membresias[0]
    
    console.log(`[AUTH] Login exitoso: ${email} (Empresa: ${membresiaActiva.empresa.nombre})`)

    console.log('[AUTH] Generando token...')
    const token = jwt.sign(
      { 
        usuarioId: usuario.id, 
        rol: membresiaActiva.rol, 
        empresaId: membresiaActiva.empresaId,
        permisos: membresiaActiva.permisos
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: membresiaActiva.rol,
        permisos: membresiaActiva.permisos,
        debeCambiarPassword: usuario.debeCambiarPassword,
        empresaId: membresiaActiva.empresaId,
        modulos: membresiaActiva.empresa.modulos,
        preferencias: membresiaActiva.preferencias,
        membresias: usuario.membresias.map(m => ({
          empresaId: m.empresaId,
          empresaNombre: m.empresa.nombre,
          rol: m.rol,
          preferencias: m.preferencias
        }))
      },
    })
  } catch (error) {
    console.error('[AUTH ERROR]', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error en login' })
  }
})

const registerSchema = z.object({
  nombreDueño: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  nombreEmpresa: z.string().min(1),
  cuit: z.string().min(1),
  modulos: z.array(z.string()).min(1),
  terminosAceptados: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos y condiciones'
  })
})

// POST /api/auth/register-empresa
router.post('/register-empresa', async (req: Request, res: Response) => {
  try {
    const { nombreDueño, email, password, nombreEmpresa, cuit, modulos } = registerSchema.parse(req.body)

    // Verificar duplicados
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } })
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya se encuentra registrado' })
    }

    const empresaExistente = await prisma.empresa.findFirst({
      where: {
        OR: [
          { nombre: nombreEmpresa },
          { cuit }
        ]
      }
    })
    if (empresaExistente) {
      if (empresaExistente.cuit === cuit) {
        return res.status(400).json({ error: 'El CUIT de la empresa ya se encuentra registrado' })
      }
      return res.status(400).json({ error: 'El nombre de la empresa ya se encuentra registrado' })
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    // Crear Empresa, Usuario y Membresia en una transacción
    const { empresa, usuario, token } = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa
      const nuevaEmpresa = await tx.empresa.create({
        data: {
          nombre: nombreEmpresa,
          cuit,
          plan: 'BASIC', // Plan inicial por defecto
          modulos, // Array de módulos seleccionados
          activa: true
        }
      })

      // 2. Crear Usuario
      const nuevoUsuario = await tx.usuario.create({
        data: {
          nombre: nombreDueño,
          email,
          passwordHash,
          activo: true,
          debeCambiarPassword: false // Lo eligen ellos, no hace falta forzar cambio
        }
      })

      // 3. Crear Membresia (puente) con rol SUPER_ADMIN y todos los permisos de inicio
      await tx.membresia.create({
        data: {
          usuarioId: nuevoUsuario.id,
          empresaId: nuevaEmpresa.id,
          rol: 'SUPER_ADMIN',
          permisos: ['ADMIN', 'VENTAS', 'CAJA', 'PRODUCCION_TALLER', 'FINANZAS_COMPLETA', 'COMPRAS'],
          activo: true
        }
      })

      // Generar JWT Token
      const jwtToken = jwt.sign(
        { 
          usuarioId: nuevoUsuario.id, 
          rol: 'SUPER_ADMIN', 
          empresaId: nuevaEmpresa.id,
          permisos: ['ADMIN', 'VENTAS', 'CAJA', 'PRODUCCION_TALLER', 'FINANZAS_COMPLETA', 'COMPRAS']
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      )

      return { empresa: nuevaEmpresa, usuario: nuevoUsuario, token: jwtToken }
    })

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: 'SUPER_ADMIN',
        permisos: ['ADMIN', 'VENTAS', 'CAJA', 'PRODUCCION_TALLER', 'FINANZAS_COMPLETA', 'COMPRAS'],
        debeCambiarPassword: false,
        empresaId: empresa.id,
        modulos: empresa.modulos,
        preferencias: {}
      }
    })
  } catch (error) {
    console.error('[REGISTER ERROR]', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al registrar empresa' })
  }
})

// POST /api/auth/reset-pin
const resetPinSchema = z.object({
  identificadorNacional: z.string().min(1),
  pinSeguridad: z.string().min(4),
  newPassword: z.string().min(4)
})

router.post('/reset-pin', async (req: Request, res: Response) => {
  try {
    const { identificadorNacional, pinSeguridad, newPassword } = resetPinSchema.parse(req.body)

    const usuario = await prisma.usuario.findFirst({
      where: { identificadorNacional }
    })

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!usuario.pinSeguridad || usuario.pinSeguridad !== pinSeguridad) {
      return res.status(401).json({ error: 'PIN de seguridad incorrecto' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash, debeCambiarPassword: false }
    })

    res.json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('[RESET PIN ERROR]', error)
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al restablecer la contraseña' })
  }
})

export default router
