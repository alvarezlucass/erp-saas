/**
 * seed.ts — Carga inicial de datos reales desde los Excel de Amanecer
 * Ejecutar: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de Unifai...\n')

  // ─── CONFIGURACIÓN ────────────────────────────────────────────────────────
  await prisma.configuracion.createMany({
    skipDuplicates: true,
    data: [
      { clave: 'empresa_nombre',    valor: 'Amanecer Indumentaria' },
      { clave: 'empresa_cuit',      valor: '20-23955065-8' },
      { clave: 'empresa_direccion', valor: 'Chaco 216 - Ezeiza' },
      { clave: 'iva',               valor: '0.21' },
      { clave: 'iibb',              valor: '0.035' },
      { clave: 'costo_tarjeta',     valor: '0.10' },
      { clave: 'ley_25413',         valor: '0.006' },
      { clave: 'mo_pct',            valor: '0.25' },
      { clave: 'logistica_pct',     valor: '0.05' },
      { clave: 'admin_pct',         valor: '0.03' },
      { clave: 'ventas_pct',        valor: '0.03' },
      { clave: 'fijos_pct',         valor: '0.03' },
    ],
  })
  console.log('✓ Configuración cargada')

  // ─── CUENTAS ──────────────────────────────────────────────────────────────
  await prisma.cuenta.createMany({
    skipDuplicates: true,
    data: [
      { nombre: 'Caja ahorro',      tipo: 'CAJA_AHORRO' as const },
      { nombre: 'Cuenta corriente', tipo: 'CUENTA_CORRIENTE' as const },
      { nombre: 'Efectivo',         tipo: 'EFECTIVO' as const },
    ],
  })
  console.log('✓ Cuentas cargadas')

  // ─── INSTITUCIONES ────────────────────────────────────────────────────────
  const instituciones = [
    'San Ignacio', 'Eco Jardín y Primaria', 'Eco Secundaria',
    'Amanecer', 'Palabras', 'Patito', 'Vicenta', 'Silos', 'Jacaranda', 'Carrusel', 'Peña',
  ]
  await prisma.institucion.createMany({
    skipDuplicates: true,
    data: instituciones.map(nombre => ({ nombre, tipo: 'COLEGIO' as const })),
  })
  console.log(`✓ ${instituciones.length} instituciones cargadas`)

  // ─── INSUMOS (de Precios_Insumos.xlsx) ───────────────────────────────────
  type InsumoSeed = { tipo: string; categoria: string; nombre: string; precio: number }

  const insumosData: InsumoSeed[] = [
    // COSTURAS
    { tipo: 'COSTURA', categoria: 'CHOMBA',   nombre: 'Chomba Manga Corta',             precio: 1643.35 },
    { tipo: 'COSTURA', categoria: 'CHOMBA',   nombre: 'Chomba Manga Larga',             precio: 1906.64 },
    { tipo: 'COSTURA', categoria: 'CHOMBA',   nombre: 'Chomba AGS',                     precio: 1643.35 },
    { tipo: 'COSTURA', categoria: 'REMERA',   nombre: 'Remera Manga Corta',             precio: 1271.50 },
    { tipo: 'COSTURA', categoria: 'REMERA',   nombre: 'Remera Manga Larga',             precio: 1106.00 },
    { tipo: 'COSTURA', categoria: 'CAMPERA',  nombre: 'Campera Deportiva',              precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'CAMPERA',  nombre: 'Campera Algodón',               precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'CAMPERA',  nombre: 'Tracker Invierno',              precio: 7634.55 },
    { tipo: 'COSTURA', categoria: 'CAMPERA',  nombre: 'Campera Polar',                 precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'CHALECO',  nombre: 'Chaleco',                       precio: 4124.00 },
    { tipo: 'COSTURA', categoria: 'BUZO',     nombre: 'Buzo Deportivo',                precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'BUZO',     nombre: 'Buzo Polar',                    precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'BUZO',     nombre: 'Buzo Algodón',                 precio: 4124.00 },
    { tipo: 'COSTURA', categoria: 'BUZO',     nombre: 'Buzo con Parches',             precio: 4089.75 },
    { tipo: 'COSTURA', categoria: 'BUZO',     nombre: 'Buzo Recto',                   precio: 4124.40 },
    { tipo: 'COSTURA', categoria: 'PANTALON', nombre: 'Pantalón Deportivo',           precio: 1874.25 },
    { tipo: 'COSTURA', categoria: 'PANTALON', nombre: 'Pantalón con Recorte',         precio: 2175.60 },
    { tipo: 'COSTURA', categoria: 'PANTALON', nombre: 'Pantalón Cargo',               precio: 4259.85 },
    { tipo: 'COSTURA', categoria: 'SHORT',    nombre: 'Short',                        precio: 1306.20 },
    { tipo: 'COSTURA', categoria: 'POLLERA',  nombre: 'Pollera Pantalón',             precio: 1714.65 },
    { tipo: 'COSTURA', categoria: 'DELANTAL', nombre: 'Delantal Técnico',            precio: 5112.45 },
    { tipo: 'COSTURA', categoria: 'PINTOR',   nombre: 'Conjunto Pintor',              precio: 2726.85 },
    // TELAS
    { tipo: 'TELA', categoria: 'Piquet',     nombre: 'Piquet Premium',               precio: 14201.10 },
    { tipo: 'TELA', categoria: 'Piquet',     nombre: 'Piquet Básico',               precio: 14201.10 },
    { tipo: 'TELA', categoria: 'Piquet',     nombre: 'Piquet Francia NORTEXTIL',    precio: 14201.10 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo Invierno Básico',  precio: 14700.00 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo Verano Básico',    precio: 14700.00 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo Invierno Premium', precio: 22887.21 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo Verano Premium',   precio: 22887.21 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo NORTEXTIL',        precio: 12600.00 },
    { tipo: 'TELA', categoria: 'Polar',      nombre: 'Polar Estándar',             precio: 16269.22 },
    { tipo: 'TELA', categoria: 'Polar',      nombre: 'Polar Premium',              precio: 17096.47 },
    { tipo: 'TELA', categoria: 'Polar',      nombre: 'Polar Básico',               precio: 14802.23 },
    { tipo: 'TELA', categoria: 'Arciel',     nombre: 'Arciel Blanco',               precio:  7169.49 },
    { tipo: 'TELA', categoria: 'Arciel',     nombre: 'Arciel Color',                precio:  7192.50 },
    { tipo: 'TELA', categoria: 'Jersey',     nombre: 'Jersey Básico',              precio: 12744.90 },
    { tipo: 'TELA', categoria: 'Jersey',     nombre: 'Jersey Premium',             precio: 12744.90 },
    { tipo: 'TELA', categoria: 'Algodón',   nombre: 'Algodón Gris Melange',       precio: 13511.73 },
    { tipo: 'TELA', categoria: 'Tracker',    nombre: 'Tracker',                     precio:  7560.00 },
    { tipo: 'TELA', categoria: 'Microfibra', nombre: 'Microfibra',                  precio:  3237.79 },
    // BORDADOS
    { tipo: 'BORDADO', categoria: 'FRENTE',   nombre: 'Solo frente',                precio:  1386.03 },
    { tipo: 'BORDADO', categoria: 'FRENTE',   nombre: 'Frente y manga',             precio:  2101.76 },
    { tipo: 'BORDADO', categoria: 'ESPECIAL', nombre: 'Bordado Barquito',           precio:  1568.88 },
    { tipo: 'BORDADO', categoria: 'VICENTA',  nombre: 'Bordado simple Vicenta',     precio:  1081.99 },
    { tipo: 'BORDADO', categoria: 'NOMBRE',   nombre: 'Nombre',                     precio:  1255.11 },
    { tipo: 'BORDADO', categoria: 'NOMBRE',   nombre: 'Nombre con aplique',         precio:  2326.28 },
    { tipo: 'BORDADO', categoria: 'INSIGNIA', nombre: 'Insignias de grado',         precio:  2400.00 },
    { tipo: 'BORDADO', categoria: 'INSIGNIA', nombre: 'Insignias de nombres',       precio:  2400.00 },
    { tipo: 'BORDADO', categoria: 'INSIGNIA', nombre: 'Insignias logo PSA',         precio:  4100.00 },
    { tipo: 'BORDADO', categoria: 'INSIGNIA', nombre: 'Insignias banderas',         precio:  2520.00 },
    { tipo: 'BORDADO', categoria: 'GRUPO',    nombre: 'Grupo sanguíneo',           precio:  1680.00 },
    { tipo: 'BORDADO', categoria: 'EMPRESA',  nombre: 'Aerolíneas',               precio:  3110.72 },
    { tipo: 'BORDADO', categoria: 'EMPRESA',  nombre: 'AGS',                       precio: 10000.00 },
    // ESTAMPADOS
    { tipo: 'ESTAMPADO', categoria: 'FRENTE', nombre: 'Estampado frente',          precio:  8753.56 },
    // CUELLOS
    { tipo: 'CUELLO', categoria: 'PARALELO',  nombre: 'Cuello solo paralelo',      precio:   871.50 },
    { tipo: 'CUELLO', categoria: 'NORTEXTIL', nombre: 'Cuello y puño NORTEXTIL',   precio:  1312.50 },
    { tipo: 'CUELLO', categoria: 'ESPECIAL',  nombre: 'Cuello y puño esp. paralelo', precio: 2073.75 },
    // ACCESORIOS
    { tipo: 'ACCESORIO', categoria: 'ELASTICO', nombre: 'Elástico con cordón',    precio:   367.50 },
    { tipo: 'ACCESORIO', categoria: 'BOTON',    nombre: 'Botón',                  precio:   315.00 },
    { tipo: 'ACCESORIO', categoria: 'REEB',     nombre: 'Reeb campera',            precio:  3885.00 },
    { tipo: 'ACCESORIO', categoria: 'REEB',     nombre: 'Reeb con cuello',         precio:   577.99 },
    // CIERRES
    { tipo: 'CIERRE', categoria: 'CIERRE', nombre: 'Cierre largo',                precio:   787.50 },
    { tipo: 'CIERRE', categoria: 'CIERRE', nombre: 'Cierre corto',                precio:   766.50 },
    // QUEPIS
    { tipo: 'QUEPIS', categoria: 'QUEPIS', nombre: 'Quepis',                      precio: 18688.65 },
  ]

  let cargados = 0
  for (const d of insumosData) {
    const insumo = await prisma.insumo.upsert({
      where: { tipo_nombre: { tipo: d.tipo, nombre: d.nombre } },
      update: {},
      create: { tipo: d.tipo, categoria: d.categoria, nombre: d.nombre },
    })
    const existe = await prisma.precioInsumo.findFirst({ where: { insumoId: insumo.id } })
    if (!existe) {
      await prisma.precioInsumo.create({
        data: {
          insumoId: insumo.id,
          costo:    d.precio,
          motivo:   'Precio inicial — importado de Excel',
          fechaDesde: new Date('2025-04-23'),
        },
      })
      cargados++
    }
  }
  console.log(`✓ ${cargados} insumos con precios cargados`)

  // ─── PRODUCTOS ────────────────────────────────────────────────────────────
  const productos = [
    { nombre: 'Chomba Manga Corta',  categoria: 'Chomba'   },
    { nombre: 'Chomba Manga Larga',  categoria: 'Chomba'   },
    { nombre: 'Remera Manga Corta',  categoria: 'Remera'   },
    { nombre: 'Remera Manga Larga',  categoria: 'Remera'   },
    { nombre: 'Campera Deportiva',   categoria: 'Campera'  },
    { nombre: 'Campera Algodón',    categoria: 'Campera'  },
    { nombre: 'Campera Invierno',    categoria: 'Campera'  },
    { nombre: 'Chaleco',             categoria: 'Chaleco'  },
    { nombre: 'Buzo Deportivo',      categoria: 'Buzo'     },
    { nombre: 'Buzo Polar',          categoria: 'Buzo'     },
    { nombre: 'Buzo Recto',          categoria: 'Buzo'     },
    { nombre: 'Pantalón Deportivo', categoria: 'Pantalón'},
    { nombre: 'Short',               categoria: 'Short'    },
    { nombre: 'Pollera Secundario',  categoria: 'Pollera'  },
    { nombre: 'Quepis',              categoria: 'Accesorio'},
  ]
  await prisma.producto.createMany({ skipDuplicates: true, data: productos })
  console.log(`✓ ${productos.length} productos cargados`)

  // ─── USUARIO ADMIN ────────────────────────────────────────────────────────
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash('unifai2025', 10)
  await prisma.usuario.upsert({
    where:  { email: 'admin@amanecer.com' },
    update: {},
    create: { nombre: 'Administrador', email: 'admin@amanecer.com', passwordHash: hash, rol: 'ADMIN' },
  })
  console.log('✓ Usuario admin creado')
  console.log('\n✅ Seed completado. Credenciales: admin@amanecer.com / unifai2025')
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
