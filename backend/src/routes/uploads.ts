import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Aplicar middleware de autenticación
router.use(authMiddleware)

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'public', 'uploads'))
  },
  filename: (req, file, cb) => {
    // Nombre único: uuid + extensión original
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

// Filtro de tipos de archivo (Seguridad Industrial)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Formato no soportado. Use JPG, PNG o WEBP.'), false)
  }
}

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
})

// POST /api/upload — subir archivo
router.post('/', upload.single('image'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' })
    }

    // Devolvemos la URL accesible
    const url = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`
    res.json({ url })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
