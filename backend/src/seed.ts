/**
 * seed.ts — Carga inicial de datos para Multi-tenant SaaS
 * Ejecutar: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de Unifai (SaaS Mode)...\n')

  // 1. CREAR EMPRESA BASE
  const empresa = await prisma.empresa.upsert({
    where: { cuit: '20-23955065-8' },
    update: {},
    create: {
      nombre: 'Amanecer Indumentaria',
      cuit: '20-23955065-8',
      plan: 'ENTERPRISE',
      modulos: ['ADMIN', 'INVENTARIO', 'INDUSTRIAL', 'COMERCIAL', 'PRODUCCION', 'ADMINISTRACION']
    }
  })
  const empresaId = empresa.id
  console.log(`✓ Empresa creada: ${empresa.nombre} (${empresaId})`)

  // ─── CONFIGURACIÓN (MATRIZ DE COSTEO POR SEGMENTO) ────────────────────────
  const SEGMENTOS = ['final', 'revendedor', 'empresa', 'revendido']
  const configData: { clave: string; valor: string; empresaId: string }[] = [
    { clave: 'empresa_nombre',    valor: 'Amanecer Indumentaria', empresaId },
    { clave: 'empresa_cuit',      valor: '20-23955065-8', empresaId },
    { clave: 'empresa_direccion', valor: 'Chaco 216 - Ezeiza', empresaId },
  ]

  // Definición de Claves de Costeo
  const costKeys = [
    { key: 'mo_pct',         label: 'Mano de Obra',     def: '0.25' },
    { key: 'logistica_pct',  label: 'Logística',        def: '0.05' },
    { key: 'admin_pct',      label: 'Administración',   def: '0.10' },
    { key: 'ventas_pct',     label: 'Ventas',           def: '0.20' },
    { key: 'ley_25413',      label: 'Ley 25413 Compra', def: '0.006' },
    { key: 'fijos_pct',      label: 'Costos Fijos',     def: '0.07' },
    { key: 'iva',            label: 'IVA Venta',        def: '0.21' },
    { key: 'iibb',           label: 'IIBB Venta',       def: '0.04' },
    { key: 'costo_tarjeta',  label: 'Tarjeta / Posnet', def: '0.10' },
    { key: 'comision_pct',   label: 'Comisión',         def: '0.006' },
    { key: 'ley_cheque_vta', label: 'Ley 25413 Venta',  def: '0.006' },
    { key: 'target_margin_pct_final',      label: 'Margen Objetivo Final', def: '0.35' },
    { key: 'target_margin_pct_revendedor', label: 'Margen Objetivo Revendedor', def: '0.15' },
    { key: 'target_margin_pct_empresa',    label: 'Margen Objetivo Empresa', def: '0.25' },
    { key: 'target_margin_pct_revendido',  label: 'Margen Objetivo Revendido', def: '0.10' },
  ]

  // Generar Matriz en Configuración
  for (const item of costKeys) {
    if (item.key.startsWith('target_margin')) {
      configData.push({ clave: item.key, valor: item.def, empresaId })
      continue
    }
    for (const seg of SEGMENTOS) {
      let val = item.def
      if (item.key === 'mo_pct' && seg === 'revendido') val = '0'
      if (item.key === 'costo_tarjeta' && seg !== 'final') val = '0'
      if (item.key === 'comision_pct' && seg !== 'revendedor') val = '0'
      if (item.key === 'fijos_pct' && seg === 'empresa') val = '0.02' 
      if (item.key === 'fijos_pct' && seg === 'revendido') val = '0'
      configData.push({ clave: `${item.key}_${seg}`, valor: val, empresaId })
    }
  }

  for (const c of configData) {
    await prisma.configuracion.upsert({
      where: { clave_empresaId: { clave: c.clave, empresaId: c.empresaId } },
      update: { valor: c.valor },
      create: c,
    })
  }
  console.log('✓ Configuración cargada')

  // ─── CUENTAS ──────────────────────────────────────────────────────────────
  const cuentasData = [
    { nombre: 'Caja ahorro',      tipo: 'CAJA_AHORRO' as any, empresaId },
    { nombre: 'Cuenta corriente', tipo: 'CUENTA_CORRIENTE' as any, empresaId },
    { nombre: 'Efectivo',         tipo: 'EFECTIVO' as any, empresaId },
  ]
  for (const c of cuentasData) {
    await prisma.cuenta.upsert({
      where: { nombre_empresaId: { nombre: c.nombre, empresaId } },
      update: {},
      create: c,
    })
  }
  console.log('✓ Cuentas cargadas')

  // ─── INSTITUCIONES ────────────────────────────────────────────────────────
  const instituciones = [
    { nombre: 'San Ignacio', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SI&backgroundColor=0038a8' },
    { nombre: 'Eco Jardín y Primaria', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=EJ&backgroundColor=2e7d32' },
    { nombre: 'Eco Secundaria', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=ES&backgroundColor=1b5e20' },
    { nombre: 'Amanecer', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AM&backgroundColor=f57c00' },
    { nombre: 'Palabras', logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PA&backgroundColor=7b1fa2' },
    'Patito', 'Vicenta', 'Silos', 'Jacaranda', 'Carrusel', 'Peña',
  ]
  for (const item of instituciones) {
    const nombre = typeof item === 'string' ? item : item.nombre
    const logoUrl = typeof item === 'string' ? null : item.logoUrl
    await prisma.institucion.upsert({
      where: { nombre_empresaId: { nombre, empresaId } },
      update: { logoUrl },
      create: { nombre, tipo: 'COLEGIO', empresaId, logoUrl },
    })
  }
  console.log('✓ Instituciones cargadas')

  // ─── INSUMOS ─────────────────────────────────────────────────────────────
  const insumosData = [
    { tipo: 'COSTURA', categoria: 'CHOMBA',   nombre: 'Chomba Manga Corta',             precio: 1643.35 },
    { tipo: 'COSTURA', categoria: 'CHOMBA',   nombre: 'Chomba Manga Larga',             precio: 1906.64 },
    { tipo: 'COSTURA', categoria: 'REMERA',   nombre: 'Remera Manga Corta',             precio: 1271.50 },
    { tipo: 'TELA', categoria: 'Piquet',     nombre: 'Piquet Premium',               precio: 14201.10 },
    { tipo: 'TELA', categoria: 'Deportivo',  nombre: 'Deportivo Invierno Premium', precio: 22887.21 },
    { tipo: 'BORDADO', categoria: 'FRENTE',   nombre: 'Solo frente',                precio:  1386.03 },
    { tipo: 'BORDADO', categoria: 'EMPRESA',  nombre: 'AGS',                       precio: 10000.00 },
  ]

  for (const d of insumosData) {
    let insumo = await prisma.insumo.findFirst({
      where: { tipo: d.tipo, nombre: d.nombre, empresaId }
    })
    if (!insumo) {
      insumo = await prisma.insumo.create({
        data: { tipo: d.tipo, categoria: d.categoria, nombre: d.nombre, empresaId }
      })
    }
    await prisma.precioInsumo.create({
      data: { insumoId: insumo.id, costo: d.precio, motivo: 'Seed Inicial' }
    })
  }
  console.log('✓ Insumos cargados')

  // ─── CATEGORÍAS ──────────────────────────────────────────────────────────
  const categorias = ['Chomba', 'Remera', 'Campera', 'Buzo', 'Pantalón']
  const catMap: Record<string, string> = {}
  for (const nombre of categorias) {
    const c = await prisma.categoriaProducto.upsert({
      where: { nombre_empresaId: { nombre, empresaId } },
      update: {},
      create: { nombre, empresaId },
    })
    catMap[nombre] = c.id
  }
  console.log('✓ Categorías cargadas')

  // ─── CURVAS ──────────────────────────────────────────────────────────────
  await prisma.curvaTalle.upsert({
    where: { nombre_empresaId: { nombre: 'Adultos S-XL', empresaId } },
    update: {},
    create: {
      nombre: 'Adultos S-XL',
      empresaId,
      items: {
        create: [
          { nombre: 'S',  orden: 1 },
          { nombre: 'M',  orden: 2 },
          { nombre: 'L',  orden: 3 },
          { nombre: 'XL', orden: 4 },
        ]
      }
    }
  })
  console.log('✓ Curvas de talles cargadas')

  // ─── PRODUCTOS ───────────────────────────────────────────────────────────
  const prodData = [
    { nombre: 'Chomba Amanecer AGS', cat: 'Chomba' },
    { nombre: 'Remera Manga Corta', cat: 'Remera' },
  ]
  for (const p of prodData) {
    await prisma.producto.upsert({
      where: { nombre_empresaId: { nombre: p.nombre, empresaId } },
      update: {},
      create: { nombre: p.nombre, categoriaId: catMap[p.cat], empresaId }
    })
  }
  console.log('✓ Productos cargados')

  // ─── USUARIOS ─────────────────────────────────────────────────────────────
  const hashAdmin = await bcrypt.hash('unifai2025', 10)
  const hashSuper = await bcrypt.hash('@Marte2026', 10)
  
  // Cliente Admin (Amanecer Indumentaria)
  const userAdmin = await prisma.usuario.upsert({
    where:  { email: 'admin@amanecer.com' },
    update: { passwordHash: hashAdmin },
    create: { nombre: 'Admin Amanecer', email: 'admin@amanecer.com', passwordHash: hashAdmin, debeCambiarPassword: false },
  })

  await prisma.membresia.upsert({
    where: { usuarioId_empresaId: { usuarioId: userAdmin.id, empresaId } },
    update: { rol: 'CLIENT_ADMIN', permisos: ['ADMIN'] },
    create: { usuarioId: userAdmin.id, empresaId, rol: 'CLIENT_ADMIN', permisos: ['ADMIN'] }
  })
  
  // Super Admin (Productor / Proveedor del Sistema)
  const userSuper = await prisma.usuario.upsert({
    where: { email: 'admin@t4-e.com' },
    update: { passwordHash: hashSuper },
    create: { 
      nombre: 'Super Admin Unifai', 
      email: 'admin@t4-e.com', 
      passwordHash: hashSuper,
      debeCambiarPassword: false
    }
  })

  await prisma.membresia.upsert({
    where: { usuarioId_empresaId: { usuarioId: userSuper.id, empresaId } },
    update: { rol: 'SUPER_ADMIN', permisos: ['ADMIN'] },
    create: { usuarioId: userSuper.id, empresaId, rol: 'SUPER_ADMIN', permisos: ['ADMIN'] }
  })

  console.log('\n✅ Seed completado.')
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
