import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando semillado de datos de prueba...')

  const passwordHash = await bcrypt.hash('123456', 10)

  // 1. CREAR EMPRESAS Y USUARIOS
  const setups = [
    { email: 'indumentaria@indumentaria.com', empresa: 'Indumentaria Premium S.A.', tipo: 'RETAIL_CLOTHING' },
    { email: 'calzado@calzado.com', empresa: 'Calzado Pro Store', tipo: 'RETAIL_FOOTWEAR' },
    { email: 'amanecer@amanecer.com', empresa: 'Amanecer Industrial', tipo: 'INDUSTRIAL' }
  ]

  for (const setup of setups) {
    console.log(`Creating environment for ${setup.email}...`)
    
    // Crear Usuario
    const usuario = await prisma.usuario.upsert({
      where: { email: setup.email },
      update: {},
      create: {
        email: setup.email,
        nombre: setup.email.split('@')[0].toUpperCase(),
        passwordHash,
        debeCambiarPassword: false
      }
    })

    // Limpiar datos previos si ya existe para asegurar un seed limpio
    const existingEmpresa = await prisma.empresa.findUnique({ where: { nombre: setup.empresa } })
    if (existingEmpresa) {
      console.log(`Cleaning existing data for ${setup.empresa}...`)
      const eid = existingEmpresa.id
      // El orden importa por las FK
      await prisma.movimientoCuentaCorriente.deleteMany({ where: { empresaId: eid } })
      await prisma.comprobante.deleteMany({ where: { empresaId: eid } })
      await prisma.lineaOrdenCompra.deleteMany({ where: { ordenCompra: { empresaId: eid } } })
      await prisma.ordenCompra.deleteMany({ where: { empresaId: eid } })
      await prisma.insumoProducto.deleteMany({ where: { producto: { empresaId: eid } } })
      await prisma.movimientoStock.deleteMany({ 
        where: { 
          OR: [
            { insumo: { empresaId: eid } },
            { productoTalle: { producto: { empresaId: eid } } }
          ]
        } 
      })
      await prisma.productoTalle.deleteMany({ where: { producto: { empresaId: eid } } })
      await prisma.producto.deleteMany({ where: { empresaId: eid } })
      await prisma.insumo.deleteMany({ where: { empresaId: eid } })
      await prisma.proveedor.deleteMany({ where: { empresaId: eid } })
      await prisma.cliente.deleteMany({ where: { empresaId: eid } })
    }

    // Crear Empresa
    const empresa = await prisma.empresa.upsert({
      where: { nombre: setup.empresa },
      update: {},
      create: {
        nombre: setup.empresa,
        cuit: `30-${Math.floor(Math.random() * 90000000) + 10000000}-1`,
        plan: 'ENTERPRISE',
        pais: 'AR',
        moneda: 'ARS'
      }
    })

    // Crear Membresía
    await prisma.membresia.upsert({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresa.id } },
      update: {},
      create: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        rol: 'CLIENT_ADMIN',
        permisos: ['ADMIN', 'VENTAS', 'INVENTARIO', 'PRODUCCION']
      }
    })

    // 2. CONFIGURACIÓN BASE (Matriz de Costeo)
    const configs = [
      { clave: 'mo_pct_final', valor: '0.15' },
      { clave: 'admin_pct_final', valor: '0.10' },
      { clave: 'logistica_pct_final', valor: '0.05' },
      { clave: 'iva_final', valor: '0.21' },
      { clave: 'iibb_final', valor: '0.035' }
    ]
    for (const conf of configs) {
      await prisma.configuracion.upsert({
        where: { clave_empresaId: { clave: conf.clave, empresaId: empresa.id } },
        update: {},
        create: { ...conf, empresaId: empresa.id }
      })
    }

    // 3. PROVEEDORES (10)
    console.log(`Generating suppliers for ${setup.empresa}...`)
    const proveedores = []
    for (let i = 1; i <= 10; i++) {
      const p = await prisma.proveedor.create({
        data: {
          empresaId: empresa.id,
          nombre: `Proveedor ${setup.tipo} ${i}`,
          cuit: `20-${Math.floor(Math.random() * 90000000) + 10000000}-5`,
          rubro: i % 2 === 0 ? 'Telas' : 'Accesorios',
          activo: true
        }
      })
      proveedores.push(p)
    }

    // 4. CLIENTES (20)
    console.log(`Generating clients for ${setup.empresa}...`)
    const clientes = []
    for (let i = 1; i <= 20; i++) {
      const c = await prisma.cliente.create({
        data: {
          empresaId: empresa.id,
          nombre: `Cliente ${i}`,
          apellido: 'Test',
          email: `cliente${i}@test.com`,
          saldo: (Math.random() * 50000) - 10000, // Algunos con saldo a favor, otros con deuda
          condicionIva: i % 5 === 0 ? 'RESPONSABLE_INSCRIPTO' : 'CONSUMIDOR_FINAL'
        }
      })
      clientes.push(c)
    }

    // 5. INSUMOS (50)
    console.log(`Generating insumos for ${setup.empresa}...`)
    const insumos = []
    const tiposInsumo = ['TELA', 'HILO', 'CIERRE', 'ETIQUETA', 'BOTON']
    for (let i = 1; i <= 50; i++) {
      const ins = await prisma.insumo.create({
        data: {
          empresaId: empresa.id,
          nombre: `Insumo ${tiposInsumo[i % 5]} ${i}`,
          tipo: tiposInsumo[i % 5],
          categoria: 'GENERAL',
          unidad: 'unidad',
          stockActual: Math.floor(Math.random() * 500),
          stockMinimo: 50,
          codigoInterno: `INS-${i}`
        }
      })
      insumos.push(ins)
    }

    // 6. PRODUCTOS (20)
    console.log(`Generating products for ${setup.empresa}...`)
    const talles = setup.tipo === 'RETAIL_FOOTWEAR' ? ['38', '39', '40', '41', '42'] : ['S', 'M', 'L', 'XL']
    for (let i = 1; i <= 20; i++) {
      const prod = await prisma.producto.create({
        data: {
          empresaId: empresa.id,
          nombre: `Producto ${setup.tipo === 'RETAIL_FOOTWEAR' ? 'Calzado' : 'Prenda'} ${i}`,
          tipo: 'FABRICADO',
          costoCompra: 5000 + (Math.random() * 5000),
          precioFinal: 15000 + (Math.random() * 10000),
          talles: {
            create: talles.map(t => ({
              talle: t,
              stockActual: Math.floor(Math.random() * 20)
            }))
          },
          // BOM Simple (3 insumos únicos por producto)
          insumos: {
            create: Array.from(new Set([
              Math.floor(Math.random() * 50),
              Math.floor(Math.random() * 50),
              Math.floor(Math.random() * 50)
            ])).slice(0, 3).map(idx => ({
              insumoId: insumos[idx].id,
              cantidad: 1 + Math.random()
            }))
          }
        }
      })
    }

    // 7. ÓRDENES DE COMPRA (50)
    console.log(`Generating purchase orders for ${setup.empresa}...`)
    for (let i = 1; i <= 50; i++) {
      const prov = proveedores[Math.floor(Math.random() * 10)]
      await prisma.ordenCompra.create({
        data: {
          empresaId: empresa.id,
          proveedorId: prov.id,
          numero: 3000 + i,
          estado: i % 3 === 0 ? 'ENVIADA' : 'RECIBIDA_TOTAL',
          totalEstimado: 20000 + (Math.random() * 50000),
          items: {
            create: [
              { 
                insumoId: insumos[Math.floor(Math.random() * 50)].id, 
                cantidadPedida: 10, 
                costoUnitarioEstimado: 500,
                subtotal: 5000
              }
            ]
          }
        }
      })
    }

    // 8. COMPROBANTES Y MOVIMIENTOS CC (50)
    console.log(`Generating financial documents for ${setup.empresa}...`)
    const tiposDoc = ['FACTURA_A', 'FACTURA_B', 'REMITO', 'RECIBO_X']
    for (let i = 1; i <= 50; i++) {
      const cli = clientes[Math.floor(Math.random() * 20)]
      const tipo = tiposDoc[i % 4]
      const total = 5000 + (Math.random() * 15000)
      
      const comp = await prisma.comprobante.create({
        data: {
          empresaId: empresa.id,
          clienteId: cli.id,
          tipo,
          numero: `0001-${(100 + i).toString().padStart(8, '0')}`,
          total,
          esOficial: tipo.startsWith('FACTURA'),
          metodoPago: 'CUENTA_CORRIENTE'
        }
      })

      // Generar movimiento en CC
      const esDebe = ['FACTURA_A', 'FACTURA_B', 'REMITO'].includes(tipo)
      const importe = esDebe ? total : -total
      
      const cliUpdated = await prisma.cliente.update({
        where: { id: cli.id },
        data: { saldo: { increment: importe } }
      })

      await prisma.movimientoCuentaCorriente.create({
        data: {
          empresaId: empresa.id,
          clienteId: cli.id,
          comprobanteId: comp.id,
          tipo: esDebe ? 'DEBE' : 'HABER',
          importe: total,
          saldoResultante: cliUpdated.saldo,
          descripcion: `Carga automática: ${tipo}`
        }
      })
    }
  }

  console.log('✅ Semillado completado con éxito.')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el semillado:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
