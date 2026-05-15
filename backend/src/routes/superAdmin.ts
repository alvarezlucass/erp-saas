import { Router, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { checkSuperAdmin } from '../middleware/checkSuperAdmin'

const router = Router()
const prisma = new PrismaClient()

// Aplicar capas de seguridad industrial
router.use(authMiddleware)
router.use(checkSuperAdmin)

// Esquema de validación para el Onboarding Maestro
const onboardSchema = z.object({
  empresa: z.object({
    nombre:  z.string().min(1),
    cuit:    z.string().min(1),
    plan:    z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).default('BASIC'),
    modulos: z.array(z.string()).default(['COMERCIAL']),
    pais:    z.string().default('AR'),
    moneda:  z.string().default('ARS'),
  }),
  admin: z.object({
    nombre:   z.string().min(1),
    email:    z.string().email(),
    password: z.string().min(6),
  })
})

/**
 * [POST] /api/super/onboard
 * Crea una Empresa y su primer administrador en una transacción atómica.
 */
router.post('/onboard', async (req: AuthRequest, res: Response) => {
  try {
    const { empresa, admin } = onboardSchema.parse(req.body)

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa con localización
      const nuevaEmpresa = await tx.empresa.create({
        data: {
          nombre:  empresa.nombre,
          cuit:    empresa.cuit,
          plan:    empresa.plan,
          modulos: empresa.modulos,
          pais:    empresa.pais,
          moneda:  empresa.moneda,
        }
      })

      // 2. Buscar o crear Usuario (Identidad Global)
      let usuario = await tx.usuario.findUnique({ where: { email: admin.email } })
      
      if (!usuario) {
        const hash = await bcrypt.hash(admin.password, 10)
        usuario = await tx.usuario.create({
          data: {
            nombre:       admin.nombre,
            email:        admin.email,
            passwordHash: hash,
            debeCambiarPassword: false,
          }
        })
      }

      // 3. Crear Membresía (Acceso a la Sucursal)
      const membresia = await tx.membresia.create({
        data: {
          usuarioId: usuario.id,
          empresaId: nuevaEmpresa.id,
          rol:       'CLIENT_ADMIN',
          permisos:  ['VENTAS', 'CAJA', 'STOCK', 'PRODUCCION', 'ADMIN'],
        }
      })

      return { empresa: nuevaEmpresa, admin: usuario, membresia }
    })

    res.status(201).json(resultado)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al procesar el alta de la empresa.' })
  }
})

/**
 * [GET] /api/super/empresas
 * Lista todas las empresas registradas en el ecosistema.
 */
router.get('/empresas', async (req: AuthRequest, res: Response) => {
  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        cuit: true,
        plan: true,
        usuariosExtra: true,
        modulos: true,
        activa: true,
        creadoEn: true,
        _count: { select: { membresias: true, productos: true, presupuestos: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.json(empresas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la lista de empresas.' })
  }
})

/**
 * [PATCH] /api/super/empresas/:id
 * Actualiza módulos, planes o estado de una empresa.
 */
router.patch('/empresas/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body

    const cleanData: any = {}
    if (data.nombre) cleanData.nombre = data.nombre
    if (data.plan) cleanData.plan = data.plan
    if (data.modulos) cleanData.modulos = data.modulos
    if (data.activa !== undefined) cleanData.activa = !!data.activa
    
    // Forzar conversión a número entero
    if (data.usuariosExtra !== undefined) {
      cleanData.usuariosExtra = parseInt(String(data.usuariosExtra), 10)
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: cleanData,
      select: {
        id: true,
        nombre: true,
        cuit: true,
        plan: true,
        usuariosExtra: true,
        modulos: true,
        activa: true,
        creadoEn: true,
        _count: { select: { membresias: true, productos: true, presupuestos: true } }
      }
    })

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.json(empresa)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la empresa.' })
  }
})

export default router
