// middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  usuarioId?: string
  rol?: string
  empresaId?: string
  permisos?: string[]
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      usuarioId: string
      rol: string
      empresaId: string
      permisos: string[]
    }
    req.usuarioId = payload.usuarioId
    req.rol = payload.rol
    req.empresaId = payload.empresaId
    req.permisos = payload.permisos || []

    // Bloquear escrituras si el rol es LECTOR (Solo Lectura), excepto si es para su propio usuario
    if (payload.rol === 'LECTOR' && req.method !== 'GET') {
      const isSelfUpdate = req.originalUrl.startsWith('/api/usuarios/change-password') || 
                           req.originalUrl.startsWith('/api/usuarios/me/preferencias')
      if (!isSelfUpdate) {
        return res.status(403).json({ error: 'Operación no permitida para usuarios de Solo Lectura' })
      }
    }

    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.rol === 'SUPER_ADMIN' || req.rol === 'CLIENT_ADMIN') {
      return next()
    }

    const userPerms = req.permisos || []
    
    // ADMIN has all permissions
    if (userPerms.includes('ADMIN')) {
      return next()
    }

    if (userPerms.includes(permission)) {
      return next()
    }

    // Mapeo legacy
    const LEGACY_MAP: Record<string, string[]> = {
      VENTAS: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR'],
      CAJA: ['VENTAS_POS_CAJA'],
      VENTAS_CLIENTES: ['VENTAS_REVENDEDORES', 'COMERCIAL_CLIENTES', 'COMERCIAL_HISTORIAL'],
      STOCK_EDIT: ['COMPRAS_INSUMOS', 'TALLER_MOLDERIA', 'TALLER_COSTEOS'],
      STOCK_INVENTORY: ['COMPRAS_OC', 'COMPRAS_RECEPCION', 'COMPRAS_DEVOLUCIONES', 'COMPRAS_PROVEEDORES'],
      STOCK_VIEW: ['TALLER_STOCK'],
      PRODUCCION_TALLER: ['TALLER_ORDENES', 'TALLER_ETAPAS', 'TALLER_ENTREGA'],
      PRODUCCION_SPECIAL: ['BORDADOS_ORDENES', 'BORDADOS_TERCEROS', 'BORDADOS_DISENOS'],
      FINANZAS_BASIC: ['ADMINISTRACION_MOVIMIENTOS', 'ADMINISTRACION_PAGOS'],
      FINANZAS_ADV: [
        'ADMINISTRACION_CASHFLOW', 'ADMINISTRACION_PROYECCIONES',
        'RRHH_FICHADAS', 'RRHH_LEGAJOS', 'RRHH_LICENCIAS', 'RRHH_SUELDOS', 'RRHH_LIQUIDACIONES', 'RRHH_931'
      ],
      REPORTES_VIEW: ['REPORTES_VENTAS', 'REPORTES_RENTABILIDAD', 'REPORTES_EJECUTIVO'],
      ADMIN: ['SISTEMAS_ROLES', 'SISTEMAS_GLOBAL', 'SISTEMAS_IMPORTACION', 'SISTEMAS_AVANZADO']
    }

    // Check if user has any legacy permission that maps to the requested permission
    const hasLegacy = Object.entries(LEGACY_MAP).some(([legacyPerm, mappedSubmodules]) => 
      userPerms.includes(legacyPerm) && mappedSubmodules.includes(permission)
    )

    if (hasLegacy) {
      return next()
    }

    return res.status(403).json({ error: `Permiso insuficiente: ${permission}` })
  }
}
