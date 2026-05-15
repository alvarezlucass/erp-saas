import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Aplicar middleware de autenticación a todas las rutas de productos
router.use(authMiddleware)

// Zod schemas para validación técnica industrial
const productoSchema = z.object({
  nombre:       z.string().min(1),
  categoriaId:  z.string().min(1),
  tipo:         z.enum(['FABRICADO', 'COMPRADO', 'SEMI_TERMINADO']),
  tipoVenta:    z.enum(['UNIDAD', 'FRACCIONADO']).optional().default('UNIDAD'),
  temporada:    z.string().optional().nullable(),
  costoCompra:  z.number().optional().nullable(),
  codigoBarra:  z.string().optional().nullable(),
  
  // Proveedores (Múltiples)
  proveedores: z.array(z.object({
    proveedorId:      z.string(),
    codigoReferencia: z.string().optional().nullable(),
    costo:            z.number().optional().nullable(),
    tiempoEntrega:    z.string().optional().nullable(),
    esPrincipal:      z.boolean().optional()
  })).optional(),
  
  // Insumos (BOM)
  insumos: z.array(z.object({
    insumoId: z.string(),
    cantidad: z.number().positive(),
    consumoVariable: z.boolean().optional()
  })).optional(),
  
  // Talles iniciales (Curva aplicada)
  talles: z.array(z.object({
    talle:      z.string(),
    pesoKg:     z.number().optional().nullable(),
    metrosTela: z.number().optional().nullable(),
    referenciaMolderia: z.string().optional().nullable(),
    codigoBarra: z.string().optional().nullable(),
  })).optional(),

  // Ficha Técnica de Medidas (CM)
  medidas: z.array(z.object({
    talle:   z.string(),
    puntoId: z.string(),
    valorCm: z.number()
  })).optional(),

  // Galería de Producción
  imagenes: z.array(z.object({
    url:      z.string().url(),
    etiqueta: z.string(), // FRENTE, DORSO, etc.
    posicion: z.number().optional()
  })).optional(),

  // Bordados Aplicados
  bordados: z.array(z.object({
    bordadoId: z.string(),
    posicion:  z.string().optional().nullable()
  })).optional(),

  // Institución (Colegio/Empresa)
  institucionId: z.string().optional().nullable(),
  subCategoriaId: z.string().optional().nullable(),

  // Precios sugeridos por segmento
  precioFinal:      z.number().optional().nullable(),
  precioRevendedor: z.number().optional().nullable(),
  precioEmpresa:    z.number().optional().nullable(),
  precioRevendido:  z.number().optional().nullable(),
  metadata:         z.any().optional(),
})

// GET /api/productos — listar con toda la ficha técnica
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const { buscar, categoriaId, temporada } = req.query

    const productos = await prisma.producto.findMany({
      where: {
        empresaId,
        activo: true,
        ...(categoriaId ? { categoriaId: String(categoriaId) } : {}),
        ...(temporada ? { temporada: String(temporada) } : {}),
        ...(req.query.subCategoriaId ? { subCategoriaId: String(req.query.subCategoriaId) } : {}),
        ...(buscar ? { nombre: { contains: String(buscar) } } : {}),
      },
      include: {
        categoria: true,
        insumos: { 
          include: { 
            insumo: {
              include: {
                proveedores: { where: { esPrincipal: true }, take: 1, include: { proveedor: true } },
                precios: { orderBy: { fechaDesde: 'desc' as const }, take: 1 }
              }
            } 
          } 
        },
        proveedores: { include: { proveedor: true } },
        talles: true,
        medidas: { include: { punto: true } },
        imagenes: { orderBy: { posicion: 'asc' } },
        bordados: { include: { bordado: true } },
        institucion: true,
        subCategoria: true
      },
      orderBy: { creadoEn: 'desc' as const }
    })

    const resultado = productos.map(p => ({
      ...p,
      insumos: (p as any).insumos.map((i: any) => ({
        ...i,
        insumo: {
          ...i.insumo,
          costoActual: i.insumo.precios?.[0]?.costo || 0
        }
      }))
    }))

    res.json(resultado)
  } catch (error) {
    console.error('Error al listar productos industriales:', error)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// PATCH /api/productos/:id — editar ficha técnica completa
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { insumos, medidas, imagenes, bordados, proveedores } = req.body

    // Verificar pertenencia
    const existe = await prisma.producto.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!existe) return res.status(404).json({ error: 'Producto no encontrado' })

    const actualizado = await prisma.$transaction(async (tx) => {
      const data = productoSchema.parse(req.body)
      
      const directMetadata = req.body.metadata 
        ? JSON.stringify(req.body.metadata) 
        : null
      
      const directTalles = Array.isArray(req.body.talles) ? req.body.talles : []

      await tx.$executeRawUnsafe(
        `UPDATE productos 
         SET nombre = $1, 
             "categoriaId" = $2, 
             tipo = $3, 
             "codigoBarra" = $4, 
             temporada = $5, 
              "institucionId" = $6,
              "precioFinal" = $7,
              "precioRevendedor" = $8,
              "precioEmpresa" = $9,
              "precioRevendido" = $10,
              metadata = $11::jsonb,
              "tipoVenta" = $12,
              "costoCompra" = $13,
              "subCategoriaId" = $14,
              "actualizadoEn" = CURRENT_TIMESTAMP
          WHERE id = $15 AND "empresaId" = $16`,
        data.nombre,
        data.categoriaId,
        data.tipo,
        data.codigoBarra,
        data.temporada,
        data.institucionId,
        data.precioFinal,
        data.precioRevendedor,
        data.precioEmpresa,
        data.precioRevendido,
        directMetadata,
        data.tipoVenta,
        data.costoCompra,
        data.subCategoriaId,
        req.params.id,
        req.empresaId
      )

      // Recuperamos el objeto actualizado para las relaciones
      const prod = await tx.producto.findUniqueOrThrow({ where: { id: req.params.id } })

      // 1.5. Actualizar Proveedores
      if (proveedores) {
        await tx.productoProveedor.deleteMany({ where: { productoId: prod.id } })
        await tx.productoProveedor.createMany({
          data: proveedores.map((pv: any) => ({
            productoId:       prod.id,
            proveedorId:      pv.proveedorId,
            codigoReferencia: pv.codigoReferencia,
            costo:            pv.costo,
            tiempoEntrega:    pv.tiempoEntrega,
            esPrincipal:      pv.esPrincipal ?? false
          }))
        })
      }

      // 2. Actualizar BOM (insumos)
      if (insumos) {
        await tx.insumoProducto.deleteMany({ where: { productoId: prod.id } })
        await tx.insumoProducto.createMany({
          data: insumos.map((i: any) => ({
            productoId:      prod.id,
            insumoId:        i.insumoId,
            cantidad:        i.cantidad,
            consumoVariable: i.consumoVariable ?? false
          }))
        })
      }

      // 3. Actualizar Medidas (CM)
      if (medidas) {
        await tx.medidaTalle.deleteMany({ where: { productoId: prod.id } })
        await tx.medidaTalle.createMany({
          data: medidas.map((m: any) => ({
            productoId: prod.id,
            talle:      m.talle,
            puntoId:    m.puntoId,
            valorCm:    m.valorCm
          }))
        })
      }

      // 4. Actualizar Galería
      if (imagenes) {
        await tx.imagenProducto.deleteMany({ where: { productoId: prod.id } })
        await tx.imagenProducto.createMany({
          data: imagenes.map((img: any, idx: number) => ({
            productoId: prod.id,
            url:        img.url,
            etiqueta:   img.etiqueta,
            posicion:   img.posicion ?? idx
          }))
        })
      }

      // 5. Actualizar Bordados
      if (bordados) {
        await tx.productoBordado.deleteMany({ where: { productoId: prod.id } })
        await tx.productoBordado.createMany({
          data: bordados.map((b: any) => ({
            productoId: prod.id,
            bordadoId:  b.bordadoId,
            posicion:   b.posicion
          }))
        })
      }

      // 6. Actualizar Talles (Bypass Directo con casting numérico)
      if (directTalles.length > 0) {
        await tx.productoTalle.deleteMany({ where: { productoId: prod.id } })
        await tx.productoTalle.createMany({
          data: directTalles.map((t: any) => ({
            productoId: prod.id,
            talle:      t.talle,
            referenciaMolderia: t.referenciaMolderia || '',
            pesoKg:     Number(t.pesoKg) || 0,
            metrosTela: Number(t.metrosTela) || 0,
            codigoBarra: t.codigoBarra || null,
            precioVenta: t.precioVenta ? Number(t.precioVenta) : null
          }))
        })
      }

      return prod
    })

    res.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar ficha técnica:', error)
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

// GET /api/productos/:id — obtener ficha técnica individual
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const producto = await prisma.producto.findFirst({
      where: { id: req.params.id, empresaId },
      include: {
        categoria: true,
        insumos: { 
          include: { 
            insumo: {
              include: {
                proveedores: { where: { esPrincipal: true }, take: 1, include: { proveedor: true } },
                precios: { orderBy: { fechaDesde: 'desc' as const }, take: 1 }
              }
            } 
          } 
        },
        proveedores: { include: { proveedor: true } },
        talles: true,
        medidas: { include: { punto: true } },
        imagenes: { orderBy: { posicion: 'asc' } },
        bordados: { include: { bordado: true } },
        institucion: true,
        subCategoria: true
      }
    })
    
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    const resultado = {
      ...producto,
      insumos: (producto as any).insumos.map((i: any) => ({
        ...i,
        insumo: {
          ...i.insumo,
          costoActual: i.insumo.precios?.[0]?.costo || 0
        }
      }))
    }

    res.json(resultado)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ficha técnica' })
  }
})

// DELETE /api/productos/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    // Verificar pertenencia
    const producto = await prisma.producto.findFirst({
      where: { id: req.params.id, empresaId }
    })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })

    const { hard } = req.query
    if (hard === 'true') {
      await prisma.$transaction([
        prisma.insumoProducto.deleteMany({ where: { productoId: req.params.id } }),
        prisma.productoTalle.deleteMany({ where: { productoId: req.params.id } }),
        prisma.medidaTalle.deleteMany({ where: { productoId: req.params.id } }),
        prisma.imagenProducto.deleteMany({ where: { productoId: req.params.id } }),
        prisma.productoBordado.deleteMany({ where: { productoId: req.params.id } }),
        prisma.productoProveedor.deleteMany({ where: { productoId: req.params.id } }),
        prisma.producto.delete({ where: { id: req.params.id } })
      ])
      return res.json({ ok: true, mensaje: 'Eliminado definitivamente con toda su ficha' })
    }
    await prisma.producto.update({ where: { id: req.params.id }, data: { activo: false } })
    res.json({ ok: true, mensaje: 'Archivado correctamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar baja' })
  }
})

// POST /api/productos — alta de ficha técnica industrial
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    if (!empresaId) return res.status(401).json({ error: 'Empresa no identificada' })

    const data = productoSchema.parse(req.body)
    
    const producto = await prisma.$transaction(async (tx) => {
      // 1. Crear producto base
      const p = await tx.producto.create({
        data: {
          empresaId,
          nombre:           data.nombre,
          categoriaId:      data.categoriaId,
          tipo:             data.tipo,
          codigoBarra:      data.codigoBarra,
          temporada:        data.temporada,
          institucionId:    data.institucionId,
          precioFinal:      data.precioFinal,
          precioRevendedor: data.precioRevendedor,
          precioEmpresa:    data.precioEmpresa,
          precioRevendido:  data.precioRevendido,
          tipoVenta:        data.tipoVenta,
          costoCompra:      data.costoCompra,
          metadata:         data.metadata,
          subCategoriaId:   data.subCategoriaId,
        }
      })

      // 1.5 Crear Proveedores
      if (data.proveedores && data.proveedores.length > 0) {
        await tx.productoProveedor.createMany({
          data: data.proveedores.map(pv => ({
            productoId:       p.id,
            proveedorId:      pv.proveedorId,
            codigoReferencia: pv.codigoReferencia,
            costo:            pv.costo,
            tiempoEntrega:    pv.tiempoEntrega,
            esPrincipal:      pv.esPrincipal ?? false
          }))
        })
      }

      // 2. Crear BOM (insumos)
      if (data.insumos && data.insumos.length > 0) {
        await tx.insumoProducto.createMany({
          data: data.insumos.map((i: any) => ({
            productoId: p.id,
            insumoId:   i.insumoId,
            cantidad:   i.cantidad,
          }))
        })
      }

      // 3. Crear talles (curva)
      if (data.talles && data.talles.length > 0) {
        await tx.productoTalle.createMany({
          data: data.talles.map(t => ({
            productoId:         p.id,
            talle:              t.talle,
            pesoKg:             t.pesoKg,
            metrosTela:         t.metrosTela,
            referenciaMolderia: t.referenciaMolderia,
            codigoBarra:        t.codigoBarra || null,
            precioVenta:        t.precioVenta
          }))
        })
      }

      // 4. Crear medidas iniciales
      if (data.medidas && data.medidas.length > 0) {
        await tx.medidaTalle.createMany({
          data: data.medidas.map(m => ({
            productoId: p.id,
            talle:      m.talle,
            puntoId:    m.puntoId,
            valorCm:    m.valorCm
          }))
        })
      }

      // 5. Vincular imágenes iniciales
      if (data.imagenes && data.imagenes.length > 0) {
        await tx.imagenProducto.createMany({
          data: data.imagenes.map((img, idx) => ({
            productoId: p.id,
            url:        img.url,
            etiqueta:   img.etiqueta,
            posicion:   img.posicion ?? idx
          }))
        })
      }

      // 6. Vincular bordados iniciales
      if (data.bordados && data.bordados.length > 0) {
        await tx.productoBordado.createMany({
          data: data.bordados.map(b => ({
            productoId: p.id,
            bordadoId:  b.bordadoId,
            posicion:   b.posicion
          }))
        })
      }

      return p
    })

    res.status(201).json(producto)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    console.error('❌ Error alta industrial:', error)
    res.status(500).json({ error: 'Error al crear ficha técnica' })
  }
})

// POST /api/productos/actualizar-masivo
router.post('/actualizar-masivo', requirePermission('STOCK_PRICING'), async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const { porcentaje, categoriaId, institucionId, temporada } = req.body

    if (!porcentaje || isNaN(porcentaje)) {
      return res.status(400).json({ error: 'El porcentaje es requerido' })
    }

    const factor = 1 + (porcentaje / 100)

    const where: any = {
      empresaId,
      ...(categoriaId ? { categoriaId } : {}),
      ...(institucionId ? { institucionId } : {}),
      ...(req.body.subCategoriaId ? { subCategoriaId: req.body.subCategoriaId } : {}),
      ...(temporada ? { temporada } : {}),
    }

    const result = await prisma.producto.updateMany({
      where,
      data: {
        precioFinal: { multiply: factor },
        precioRevendedor: { multiply: factor },
        precioEmpresa: { multiply: factor },
        precioRevendido: { multiply: factor },
      }
    })

    // ─── AUDITORÍA: CREAR NOTIFICACIÓN PARA NOVEDADES ───
    if (result.count > 0) {
      // Obtener nombre de categoría para el mensaje
      let catNombre = 'Global'
      if (categoriaId) {
        const cat = await prisma.categoriaProducto.findUnique({ where: { id: categoriaId } })
        if (cat) catNombre = cat.nombre
      }

      await prisma.notificacion.create({
        data: {
          empresaId: req.empresaId!,
          usuarioId: req.usuarioId,
          titulo: 'Ajuste Masivo de Precios',
          mensaje: `Se aplicó un ajuste del ${porcentaje > 0 ? '+' : ''}${porcentaje}% en la categoría [${catNombre}]. Se afectaron ${result.count} productos.`,
          tipo: porcentaje < 0 ? 'WARNING' : 'SUCCESS',
          metadata: { porcentaje, categoriaId, institucionId, temporada }
        }
      })
    }

    res.json({ message: 'Actualización completada', count: result.count })
  } catch (error) {
    console.error('Error en actualización masiva:', error)
    res.status(500).json({ error: 'Error al procesar actualización masiva' })
  }
})

// POST /api/productos/stock-ajuste
router.post('/stock-ajuste', async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = req.empresaId
    const data = z.object({
      productoTalleId: z.string(),
      tipo:     z.enum(['INGRESO', 'EGRESO', 'AJUSTE']),
      cantidad: z.number().positive(),
      motivo:   z.string().min(3),
      costoUnitario: z.number().optional().nullable(),
      proveedorId:   z.string().optional().nullable()
    }).parse(req.body)

    const pt = await prisma.productoTalle.findFirst({
      where: { id: data.productoTalleId, producto: { empresaId } },
      include: { producto: true }
    })
    if (!pt) return res.status(404).json({ error: 'Producto/Talle no encontrado' })

    const factor = data.tipo === 'EGRESO' ? -1 : 1

    const resultado = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoStock.create({
        data: {
          productoTalleId: data.productoTalleId,
          tipo:     data.tipo,
          cantidad: data.cantidad * factor,
          motivo:   data.motivo,
          usuarioId: req.usuarioId,
          proveedorId: data.proveedorId,
          costoUnitario: data.costoUnitario
        }
      })

      const npt = await tx.productoTalle.update({
        where: { id: data.productoTalleId },
        data: {
          stockActual: data.tipo === 'AJUSTE' 
            ? data.cantidad 
            : { increment: data.cantidad * factor }
        }
      })

      // Si es ingreso con costo, actualizamos el costo base del producto
      if (data.tipo === 'INGRESO' && data.costoUnitario) {
        await tx.producto.update({
          where: { id: pt.productoId },
          data: { costoCompra: data.costoUnitario }
        })
      }

      return { mov, stockActualizado: npt.stockActual }
    })

    res.status(201).json(resultado)
  } catch (error) {
    console.error('❌ Error en ajuste stock producto:', error)
    res.status(400).json({ error: 'Error processing stock adjustment' })
  }
})

export default router
