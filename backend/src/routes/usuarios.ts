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
  nombre:                z.string().min(1, 'El nombre es obligatorio'),
  email:                 z.string().email().or(z.literal('')).optional().nullable(),
  identificadorNacional: z.string().min(1, 'El DNI es obligatorio'),
  password:              z.string().min(4).optional(), // PIN o contraseña corta
  pinSeguridad:          z.string().min(4, 'El PIN debe tener al menos 4 dígitos').max(6).optional(),
  rol:                   z.enum(['ADMIN', 'OPERADOR', 'LECTOR']).optional(),
  tarifaVenta:           z.enum(['PRECIO_FINAL', 'PRECIO_REVENDEDOR', 'PRECIO_EMPRESA', 'PRECIO_REVENDIDO', 'TODAS']).optional(),
  permisos:              z.array(z.string()).optional(),
  activo:                z.boolean().optional()
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
            identificadorNacional: true,
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
      identificadorNacional: m.usuario.identificadorNacional,
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

    // Normalizar email vacío a null
    const normalizedEmail = data.email && data.email.trim() !== '' ? data.email.trim() : null

    // Buscar si ya existe el usuario a nivel global por DNI o por Email
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { identificadorNacional: data.identificadorNacional },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
        ]
      }
    })
    
    let temporaryPassword = ''
    let isTempPassword = false

    if (!usuario) {
      let passwordTemp = data.password
      if (!passwordTemp || passwordTemp.trim() === '') {
        const rand = Math.floor(1000 + Math.random() * 9000)
        passwordTemp = `UNIF-${rand}`
        isTempPassword = true
        temporaryPassword = passwordTemp
      }

      const passwordHash = await bcrypt.hash(passwordTemp, 10)
      usuario = await prisma.usuario.create({
        data: {
          nombre:                data.nombre,
          email:                 normalizedEmail,
          identificadorNacional: data.identificadorNacional,
          pinSeguridad:          data.pinSeguridad,
          passwordHash,
          debeCambiarPassword:   true
        }
      })
    } else {
      // Si el usuario ya existe globalmente, validar que no tenga ya una membresía en esta empresa
      const membresiaExistente = await prisma.membresia.findFirst({
        where: { usuarioId: usuario.id, empresaId: req.empresaId }
      })
      if (membresiaExistente) {
        return res.status(400).json({ error: 'El usuario ya pertenece a esta empresa' })
      }
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
      identificadorNacional: usuario.identificadorNacional,
      rol: membresia.rol,
      tarifaVenta: membresia.tarifaVenta,
      permisos: membresia.permisos,
      membresiaId: membresia.id,
      ...(isTempPassword ? { temporaryPassword } : {})
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

    const normalizedEmail = data.email && data.email.trim() !== '' ? data.email.trim() : null

    let updateUsuario: any = {
       nombre: data.nombre,
       email: normalizedEmail,
       identificadorNacional: data.identificadorNacional
    }

    if (data.pinSeguridad) {
       updateUsuario.pinSeguridad = data.pinSeguridad
    }

    if (data.password && data.password.trim() !== '') {
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
      identificadorNacional: actualizado.identificadorNacional,
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

// Blanquear clave de un usuario (generar clave temporal con verificación de administrador)
router.post('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { adminPassword } = z.object({ adminPassword: z.string().min(1) }).parse(req.body)

    // 1. Validar que el llamador sea ADMIN o CLIENT_ADMIN en esta empresa
    const adminMembresia = await prisma.membresia.findFirst({
      where: { usuarioId: req.usuarioId, empresaId: req.empresaId, activo: true }
    })

    if (!adminMembresia || (adminMembresia.rol !== 'ADMIN' && adminMembresia.rol !== 'CLIENT_ADMIN')) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' })
    }

    // 2. Verificar la contraseña del administrador actual
    const adminUsuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId }
    })

    if (!adminUsuario) {
      return res.status(404).json({ error: 'Usuario administrador no encontrado' })
    }

    const verifyAdmin = await bcrypt.compare(adminPassword, adminUsuario.passwordHash)
    if (!verifyAdmin) {
      return res.status(401).json({ error: 'La contraseña del administrador es incorrecta' })
    }

    // 3. Verificar que el usuario destino pertenezca a la misma empresa
    const targetMembresia = await prisma.membresia.findFirst({
      where: { usuarioId: req.params.id, empresaId: req.empresaId }
    })

    if (!targetMembresia) {
      return res.status(404).json({ error: 'El usuario no pertenece a esta empresa' })
    }

    // No permitir restablecer la contraseña del propietario CLIENT_ADMIN a menos que seas el propio CLIENT_ADMIN
    if (targetMembresia.rol === 'CLIENT_ADMIN' && adminMembresia.rol !== 'CLIENT_ADMIN') {
      return res.status(403).json({ error: 'No puedes restablecer la contraseña de un Administrador Principal/Dueño' })
    }

    // 4. Generar PIN/Contraseña temporal (ej: RESET-4819)
    const rand = Math.floor(1000 + Math.random() * 9000)
    const temporaryPassword = `RESET-${rand}`
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)

    // 5. Actualizar el usuario destino
    await prisma.usuario.update({
      where: { id: req.params.id },
      data: {
        passwordHash,
        debeCambiarPassword: true
      }
    })

    res.json({ ok: true, temporaryPassword })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al blanquear la contraseña' })
  }
})

export default router
