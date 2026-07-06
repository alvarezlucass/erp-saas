import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { checkSuperAdmin } from '../middleware/checkSuperAdmin'

const router = Router()
const prisma = new PrismaClient()

// PUBLIC: Fetch SaaS matrix for the Register page
router.get('/planes', async (req, res: Response) => {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { clave_empresaId: { clave: 'SAAS_MATRIX', empresaId: 'SAAS_MASTER' } }
    })
    
    if (config && config.valor) {
      return res.json(JSON.parse(config.valor))
    }
    
    // Default matrix if not set
    const defaultMatrix = [
      { id: 'ESENCIAL', nombre: 'Esencial', precioMensual: 49, usuariosBase: 8, precioUsuarioExtra: 5, tiempoRespuesta: '24hs hábiles', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR'] },
      { id: 'PROFESIONAL', nombre: 'Profesional', precioMensual: 79, usuariosBase: 15, precioUsuarioExtra: 5, tiempoRespuesta: '12hs hábiles', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA'] },
      { id: 'ESCALA', nombre: 'Escala', precioMensual: 99, usuariosBase: 20, precioUsuarioExtra: 2, tiempoRespuesta: 'Atención Prioritaria', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA', 'COMPRAS_INSUMOS', 'TALLER_MOLDERIA'] },
      { id: 'TOTAL', nombre: 'Total', precioMensual: 199, usuariosBase: 50, precioUsuarioExtra: 0, tiempoRespuesta: 'Soporte VIP 24/7', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA', 'COMPRAS_INSUMOS', 'TALLER_MOLDERIA', 'RRHH_FICHADAS', 'ADMINISTRACION_MOVIMIENTOS'] }
    ]
    res.json(defaultMatrix)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la configuración de planes SaaS' })
  }
})

// PROTECTED (SUPER ADMIN): Update SaaS matrix
router.post('/planes', authMiddleware, checkSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const matrix = req.body
    
    await prisma.configuracion.upsert({
      where: { clave_empresaId: { clave: 'SAAS_MATRIX', empresaId: 'SAAS_MASTER' } },
      create: { clave: 'SAAS_MATRIX', valor: JSON.stringify(matrix), empresaId: 'SAAS_MASTER' },
      update: { valor: JSON.stringify(matrix) }
    })
    
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar la configuración de planes SaaS' })
  }
})

export default router
