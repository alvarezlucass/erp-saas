import { Router, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { LIMITES_PLANES } from '../constants/planes'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

const usuarioSchema = z.object({
  nombre:   z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6).optional(),
  rol:         z.enum(['ADMIN', 'OPERADOR', 'LECTOR']).optional(),
  tarifaVenta: z.enum(['PRECIO_FINAL', 'PRECIO_REVENDEDOR', 'PRECIO_EMPRESA', 'PRECIO_REVENDIDO', 'TODAS']).optional(),
  permisos:    z.array(z.string()).optional(),
  activo:      z.boolean().optional()
})

// Listar usuarios de la empresa
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const usuarios = await prisma.membresia.findMany({
      where: { empresaId: req.empresaId, activo: true },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            creadoEn: true
          }
        }
      }
    })

    // Mapear para mantener compatibilidad con el frontend
    const result = usuarios.map(m => ({
      id: m.usuario.id,
      nombre: m.usuario.nombre,
      email: m.usuario.email,
      rol: m.rol,
      tarifaVenta: m.tarifaVenta,
      permisos: m.permisos,
      creadoEn: m.usuario.creadoEn,
      membresiaId: m.id
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' })
  }
})

// Crear usuario con validación de límites de plan
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = usuarioSchema.parse(req.body)
    if (!data.password) return res.status(400).json({ error: 'Password requerido para alta' })

    // 1. Validar Límites de Plan
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.empresaId! },
      select: { plan: true, usuariosExtra: true }
    })

    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' })

    const countActivos = await prisma.membresia.count({
      where: { empresaId: req.empresaId, activo: true }
    })

    const limiteMax = (LIMITES_PLANES[empresa.plan as keyof typeof LIMITES_PLANES] || 5) + (empresa.usuariosExtra || 0)

    if (countActivos >= limiteMax) {
      return res.status(403).json({ 
        error: `Límite de usuarios alcanzado (${limiteMax}). Por favor, mejora tu plan o solicita slots adicionales.` 
      })
    }

    let usuario = await prisma.usuario.findUnique({ where: { email: data.email } })
    
    if (!usuario) {
      const passwordHash = await bcrypt.hash(data.password, 10)
      usuario = await prisma.usuario.create({
        data: {
          nombre:   data.nombre,
          email:    data.email,
          passwordHash,
        }
      })
    }

    // Crear la membresía para este local
    const membresia = await prisma.membresia.create({
      data: {
        usuarioId:   usuario.id,
        empresaId:   req.empresaId!,
        rol:         data.rol || 'OPERADOR',
        tarifaVenta: data.tarifaVenta || 'PRECIO_FINAL',
        permisos:    data.permisos || ['VENTAS']
      },
      include: { usuario: true }
    })

    res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: membresia.rol,
      tarifaVenta: membresia.tarifaVenta,
      permisos: membresia.permisos,
      membresiaId: membresia.id
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al crear usuario' })
  }
})

// Actualizar usuario
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = usuarioSchema.parse(req.body)
    
    // Verificar pertenencia (ahora vía membresía)
    const membresia = await prisma.membresia.findFirst({
      where: { usuarioId: req.params.id, empresaId: req.empresaId }
    })

    if (!membresia) return res.status(404).json({ error: 'Membresía no encontrada para este local' })

    let updateMembresia: any = {
       rol: data.rol,
       tarifaVenta: data.tarifaVenta,
       permisos: data.permisos,
       activo: data.activo
    }

    let updateUsuario: any = {
       nombre: data.nombre,
       email: data.email
    }

    if (data.password) {
       updateUsuario.passwordHash = await bcrypt.hash(data.password, 10)
    }

    const [actualizado, membresiaAct] = await prisma.$transaction([
      prisma.usuario.update({
        where: { id: req.params.id },
        data: updateUsuario
      }),
      prisma.membresia.update({
        where: { id: membresia.id },
        data: updateMembresia
      })
    ])

    res.json({
      id: actualizado.id,
      nombre: actualizado.nombre,
      email: actualizado.email,
      rol: membresiaAct.rol,
      tarifaVenta: membresiaAct.tarifaVenta,
      permisos: membresiaAct.permisos,
      activo: membresiaAct.activo
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

// Baja lógica
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const membresia = await prisma.membresia.findFirst({
      where: { usuarioId: req.params.id, empresaId: req.empresaId }
    })
    if (!membresia) return res.status(404).json({ error: 'Membresía no encontrada' })

    await prisma.membresia.update({
      where: { id: membresia.id },
      data: { activo: false }
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

// Cambiar password y apagar flag de "debe cambiar"
router.post('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body)
    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.usuario.update({
      where: { id: req.usuarioId },
      data: { 
        passwordHash,
        debeCambiarPassword: false
      }
    })

    res.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
})

// Actualizar preferencias de la membresía actual
router.patch('/me/preferencias', async (req: AuthRequest, res: Response) => {
  try {
    const { preferencias } = z.object({ preferencias: z.record(z.any()) }).parse(req.body)
    
    const membresia = await prisma.membresia.findFirst({
      where: { usuarioId: req.usuarioId, empresaId: req.empresaId, activo: true }
    })

    if (!membresia) return res.status(404).json({ error: 'Membresía no encontrada' })

    const actualizado = await prisma.membresia.update({
      where: { id: membresia.id },
      data: { preferencias }
    })

    res.json({ preferencias: actualizado.preferencias })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al actualizar preferencias' })
  }
})

export default router
