import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import bcrypt from 'bcryptjs'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

const auditoriaCancelacionSchema = z.object({
  clienteNombre: z.string().optional().nullable(),
  monto: z.number().min(0),
  unidades: z.number().int().min(0),
  motivo: z.string().min(1),
  itemsJson: z.any().optional(),
  fechaInicio: z.string().transform(val => new Date(val)),
  password: z.string().min(1), // Para validación del vendedor
})

// POST /api/auditoria/cancelacion
router.post('/cancelacion', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const usuarioId = req.usuarioId
    if (!empresaId || !usuarioId) return res.status(401).json({ error: 'No autorizado' })

    const data = auditoriaCancelacionSchema.parse(req.body)

    // 1. Verificar contraseña del usuario actual
    const user = await prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const isMatch = await bcrypt.compare(data.password, user.passwordHash)
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta. Acción cancelada.' })

    // 2. Registrar auditoría
    const audit = await prisma.auditoriaCancelacion.create({
      data: {
        empresaId,
        usuarioId,
        clienteNombre: data.clienteNombre,
        monto: data.monto,
        unidades: data.unidades,
        motivo: data.motivo,
        itemsJson: data.itemsJson,
        fechaInicio: data.fechaInicio,
      }
    })

    // 3. Verificar umbral de seguridad (Alerta Crítica)
    const thresholdSetting = await prisma.configuracion.findUnique({
      where: { clave_empresaId: { clave: 'pos_monto_alerta_cancelacion', empresaId } }
    })
    
    const threshold = parseFloat(thresholdSetting?.valor || '0')
    const isCritical = threshold > 0 && data.monto >= threshold

    res.status(201).json({ 
        success: true, 
        auditId: audit.id,
        isCritical,
        message: isCritical ? 'ALERTA DE SEGURIDAD REGISTRADA' : 'Cancelación auditada con éxito'
    })

  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    console.error('❌ Error en auditoría cancelacion:', error)
    res.status(500).json({ error: 'Error al procesar auditoría' })
  }
})

export default router
