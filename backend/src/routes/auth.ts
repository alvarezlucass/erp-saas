import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })

    const token = jwt.sign(
      { usuarioId: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error en login' })
  }
})

export default router
