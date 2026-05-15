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

    if (!req.permisos?.includes(permission)) {
      return res.status(403).json({ error: `Permiso insuficiente: ${permission}` })
    }

    next()
  }
}
