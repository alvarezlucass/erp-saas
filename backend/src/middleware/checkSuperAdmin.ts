import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

/**
 * Middleware de seguridad industrial para restringir acceso
 * solo a administradores globales (Super Admins).
 */
export const checkSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.rol !== 'SUPER_ADMIN') {
    console.warn(`[SECURITY] Intento de acceso denegado a ruta de Super Admin. Usuario: ${req.usuarioId}, Rol: ${req.rol}`)
    return res.status(403).json({ error: 'Acceso restringido. Se requieren permisos de Super Administrador.' })
  }
  next()
}
