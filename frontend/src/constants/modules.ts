export interface Submodule {
  id: string
  label: string
  legacyCode: string
}

export interface ModuleGroup {
  id: string
  label: string
  submodules: Submodule[]
}

export const CONFIG_MODULOS: ModuleGroup[] = [
  {
    id: 'VENTAS',
    label: 'Ventas',
    submodules: [
      { id: 'VENTAS_PRECIOS', label: 'Precios', legacyCode: 'VENTAS' },
      { id: 'VENTAS_PRESUPUESTOS', label: 'Presupuestos', legacyCode: 'VENTAS' },
      { id: 'VENTAS_POS_VENDEDOR', label: 'Ventas (POS Vendedor)', legacyCode: 'VENTAS' },
      { id: 'VENTAS_POS_CAJA', label: 'Caja', legacyCode: 'CAJA' },
      { id: 'VENTAS_REVENDEDORES', label: 'Revendedores', legacyCode: 'VENTAS_CLIENTES' },
    ]
  },
  {
    id: 'COMPRAS',
    label: 'Compras',
    submodules: [
      { id: 'COMPRAS_INSUMOS', label: 'Insumos', legacyCode: 'STOCK_EDIT' },
      { id: 'COMPRAS_OC', label: 'Ordenes de Compra', legacyCode: 'STOCK_INVENTORY' },
      { id: 'COMPRAS_RECEPCION', label: 'Recepción', legacyCode: 'STOCK_INVENTORY' },
      { id: 'COMPRAS_DEVOLUCIONES', label: 'Devoluciones', legacyCode: 'STOCK_INVENTORY' },
      { id: 'COMPRAS_PROVEEDORES', label: 'Proveedores', legacyCode: 'STOCK_INVENTORY' },
    ]
  },
  {
    id: 'TALLER',
    label: 'Taller',
    submodules: [
      { id: 'TALLER_MOLDERIA', label: 'Moldería', legacyCode: 'STOCK_EDIT' },
      { id: 'TALLER_STOCK', label: 'Control de Stock', legacyCode: 'STOCK_VIEW' },
      { id: 'TALLER_ORDENES', label: 'Ordenes de Producción', legacyCode: 'PRODUCCION_TALLER' },
      { id: 'TALLER_ETAPAS', label: 'Control de Etapas', legacyCode: 'PRODUCCION_TALLER' },
      { id: 'TALLER_ENTREGA', label: 'Entrega Prod. Terminado', legacyCode: 'PRODUCCION_TALLER' },
      { id: 'TALLER_COSTEOS', label: 'Ajustes de Costeo', legacyCode: 'STOCK_EDIT' },
    ]
  },
  {
    id: 'BORDADOS',
    label: 'Bordados',
    submodules: [
      { id: 'BORDADOS_ORDENES', label: 'Ordenes de Bordados', legacyCode: 'PRODUCCION_SPECIAL' },
      { id: 'BORDADOS_TERCEROS', label: 'Ordenes a Terceros', legacyCode: 'PRODUCCION_SPECIAL' },
      { id: 'BORDADOS_DISENOS', label: 'Diseños', legacyCode: 'PRODUCCION_SPECIAL' },
    ]
  },
  {
    id: 'ADMINISTRACION',
    label: 'Administración',
    submodules: [
      { id: 'ADMINISTRACION_MOVIMIENTOS', label: 'Movimientos', legacyCode: 'FINANZAS_BASIC' },
      { id: 'ADMINISTRACION_PAGOS', label: 'Pagos', legacyCode: 'FINANZAS_BASIC' },
      { id: 'ADMINISTRACION_CASHFLOW', label: 'Flujo de Caja', legacyCode: 'FINANZAS_ADV' },
      { id: 'ADMINISTRACION_PROYECCIONES', label: 'Proyecciones Financieras', legacyCode: 'FINANZAS_ADV' },
    ]
  },
  {
    id: 'REPORTES',
    label: 'Reportes e Inteligencia',
    submodules: [
      { id: 'REPORTES_VENTAS', label: 'Reporte de Ventas', legacyCode: 'REPORTES_VIEW' },
      { id: 'REPORTES_RENTABILIDAD', label: 'Rentabilidad por Producto', legacyCode: 'REPORTES_VIEW' },
      { id: 'REPORTES_EJECUTIVO', label: 'Dash Ejecutivo', legacyCode: 'REPORTES_VIEW' },
    ]
  },
  {
    id: 'RRHH',
    label: 'RRHH',
    submodules: [
      { id: 'RRHH_FICHADAS', label: 'Fichadas y Horarios', legacyCode: 'FINANZAS_ADV' },
      { id: 'RRHH_LEGAJOS', label: 'Legajos', legacyCode: 'FINANZAS_ADV' },
      { id: 'RRHH_LICENCIAS', label: 'Licencias', legacyCode: 'FINANZAS_ADV' },
      { id: 'RRHH_SUELDOS', label: 'Sueldos', legacyCode: 'FINANZAS_ADV' },
      { id: 'RRHH_LIQUIDACIONES', label: 'Liquidaciones', legacyCode: 'FINANZAS_ADV' },
      { id: 'RRHH_931', label: 'F. 931', legacyCode: 'FINANZAS_ADV' },
    ]
  },
  {
    id: 'SISTEMAS',
    label: 'Sistemas y Adm. de Usuario',
    submodules: [
      { id: 'SISTEMAS_ROLES', label: 'Roles y Permisos', legacyCode: 'ADMIN' },
      { id: 'SISTEMAS_GLOBAL', label: 'Administración Global', legacyCode: 'ADMIN' },
      { id: 'SISTEMAS_IMPORTACION', label: 'Carga masiva de datos', legacyCode: 'ADMIN' },
      { id: 'SISTEMAS_AVANZADO', label: 'Roles y Permisos Avanzados', legacyCode: 'ADMIN' },
    ]
  },
  {
    id: 'COMERCIAL',
    label: 'Gestión Comercial',
    submodules: [
      { id: 'COMERCIAL_CLIENTES', label: 'Gestión de Clientes', legacyCode: 'VENTAS_CLIENTES' },
      { id: 'COMERCIAL_HISTORIAL', label: 'Historial de Clientes', legacyCode: 'VENTAS_CLIENTES' },
    ]
  }
]

export function hasPermission(usuario: any, requiredSubmoduleId: string): boolean {
  if (!usuario) return false
  if (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'CLIENT_ADMIN') return true

  const userPerms = usuario.permisos || []
  if (userPerms.includes('ADMIN')) return true
  if (userPerms.includes(requiredSubmoduleId)) return true

  // Resolver compatibilidad legacy
  // 1. Encontrar el sub-módulo en la configuración
  for (const group of CONFIG_MODULOS) {
    const sub = group.submodules.find(s => s.id === requiredSubmoduleId)
    if (sub) {
      // 2. Si el usuario posee el código legacy de este sub-módulo, tiene acceso
      if (userPerms.includes(sub.legacyCode)) {
        return true
      }
    }
  }

  return false
}
