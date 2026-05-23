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

export default router
