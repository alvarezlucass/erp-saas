import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, ShoppingCart, Factory, Star, Wallet, Users, BarChart3, Settings,
  Tag, FileText, DollarSign, Layers, CheckSquare, RefreshCw, Truck, Archive, Play, ArrowLeftRight, Receipt, Activity,
  LineChart, Clock, Folder, Calculator, UserCheck, History, ChevronRight, LayoutGrid, Shield, User, Palette, PiggyBank
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface MenuItem {
  to: string
  label: string
  color: string
  permiso?: string
  rol?: string
  modulo?: string
  icon: any
}

// Grupos idénticos para filtrar accesos rápidos
const MENU_GROUPS: { title: string; icon: any; items: MenuItem[] }[] = [
  {
    title: 'Ventas',
    icon: DollarSign,
    items: [
      { to: '/precios',              label: 'Precios', color: 'bg-amber-500', permiso: 'VENTAS', icon: Tag },
      { to: '/presupuestos',         label: 'Presupuestos', color: 'bg-orange-500', permiso: 'VENTAS', icon: FileText },
      { to: '/punto-venta/vendedor', label: 'Ventas', color: 'bg-pink-500', permiso: 'VENTAS', icon: DollarSign },
      { to: '/punto-venta/caja',     label: 'Caja', color: 'bg-cyan-600', permiso: 'CAJA', icon: Wallet },
      { to: '/comercial/revendedores', label: 'Revendedores', color: 'bg-indigo-400', permiso: 'VENTAS_CLIENTES', icon: Users },
    ]
  },
  {
    title: 'Compras',
    icon: ShoppingCart,
    items: [
      { to: '/insumos',              label: 'Insumos', color: 'bg-teal-500', permiso: 'STOCK_EDIT', icon: Layers },
      { to: '/compras/oc',           label: 'Ordenes de compra', color: 'bg-indigo-400', permiso: 'STOCK_INVENTORY', icon: ShoppingCart },
      { to: '/compras/recepcion',    label: 'Recepción', color: 'bg-indigo-300', permiso: 'STOCK_INVENTORY', icon: CheckSquare },
      { to: '/compras/devoluciones', label: 'Devoluciones', color: 'bg-rose-400', permiso: 'STOCK_INVENTORY', icon: RefreshCw },
      { to: '/proveedores',          label: 'Proveedores', color: 'bg-indigo-500', permiso: 'STOCK_INVENTORY', icon: Truck },
    ]
  },
  {
    title: 'Taller',
    icon: Factory,
    items: [
      { to: '/admin/templates',      label: 'Moldería', color: 'bg-rose-500', permiso: 'STOCK_EDIT', icon: Layers },
      { to: '/inventario',           label: 'Control de Stock', color: 'bg-cyan-500', permiso: 'STOCK_VIEW', icon: Archive },
      { to: '/produccion/ordenes',   label: 'Ordenes de producción', color: 'bg-orange-600', permiso: 'PRODUCCION_TALLER', icon: Play },
      { to: '/produccion/etapas',    label: 'Control de etapas', color: 'bg-amber-600', permiso: 'PRODUCCION_TALLER', icon: LayoutGrid },
      { to: '/produccion/entrega',   label: 'Entrega prod. terminado', color: 'bg-emerald-600', permiso: 'PRODUCCION_TALLER', icon: CheckSquare },
      { to: '/admin/costeos',        label: 'Ajustes de costeo', color: 'bg-indigo-600', permiso: 'STOCK_EDIT', icon: PiggyBank },
    ]
  },
  {
    title: 'Bordados',
    icon: Star,
    items: [
      { to: '/bordados',             label: 'Ordenes de bordados', color: 'bg-violet-500', permiso: 'PRODUCCION_SPECIAL', icon: Star },
      { to: '/terceros/ordenes',     label: 'Ordenes a terceros', color: 'bg-fuchsia-500', permiso: 'PRODUCCION_SPECIAL', icon: Star },
      { to: '/bordados/disenos',     label: 'Diseños', color: 'bg-purple-600', permiso: 'PRODUCCION_SPECIAL', icon: Palette },
    ]
  },
  {
    title: 'Administración',
    icon: Wallet,
    items: [
      { to: '/finanzas/movimientos', label: 'Movimientos', color: 'bg-emerald-500', permiso: 'FINANZAS_BASIC', icon: ArrowLeftRight },
      { to: '/finanzas/pagos',       label: 'Pagos', color: 'bg-rose-600', permiso: 'FINANZAS_BASIC', icon: Receipt },
      { to: '/finanzas/cashflow',    label: 'Flujo de caja', color: 'bg-cyan-600', permiso: 'FINANZAS_ADV', icon: Activity },
      { to: '/finanzas/proyecciones', label: 'Proyecciones financieras', color: 'bg-teal-600', permiso: 'FINANZAS_ADV', icon: LineChart },
    ]
  },
  {
    title: 'Reportes e Inteligencia',
    icon: BarChart3,
    items: [
      { to: '/reportes/ventas',      label: 'Reporte de Ventas', color: 'bg-emerald-500', permiso: 'REPORTES_VIEW', icon: BarChart3 },
      { to: '/reportes/rentabilidad', label: 'Rentabilidad por producto', color: 'bg-amber-500', permiso: 'REPORTES_VIEW', icon: DollarSign },
      { to: '/reportes/ejecutivo',   label: 'Dash Ejecutivo', color: 'bg-indigo-500', permiso: 'REPORTES_VIEW', icon: LayoutGrid },
    ]
  },
  {
    title: 'RRHH',
    icon: Users,
    items: [
      { to: '/rrhh/fichadas',        label: 'Fichadas y Horarios', color: 'bg-amber-600', permiso: 'FINANZAS_ADV', icon: Clock },
      { to: '/rrhh/legajos',         label: 'Legajos', color: 'bg-indigo-500', permiso: 'FINANZAS_ADV', icon: Folder },
      { to: '/rrhh/licencias',       label: 'Licencias', color: 'bg-red-400', permiso: 'FINANZAS_ADV', icon: FileText },
      { to: '/rrhh/sueldos',         label: 'Sueldos', color: 'bg-orange-400', permiso: 'FINANZAS_ADV', icon: Wallet },
      { to: '/rrhh/liquidaciones',   label: 'Liquidaciones', color: 'bg-emerald-600', permiso: 'FINANZAS_ADV', icon: Calculator },
      { to: '/rrhh/931',             label: 'F. 931', color: 'bg-gray-500', permiso: 'FINANZAS_ADV', icon: FileText },
    ]
  },
  {
    title: 'Sistemas y Adm. de Usuario',
    icon: Settings,
    items: [
      { to: '/admin/usuarios',       label: 'Roles y permisos', color: 'bg-indigo-600', permiso: 'ADMIN', icon: UserCheck },
      { to: '/admin',                label: 'Administración Global', color: 'bg-gray-400', permiso: 'ADMIN', icon: Settings },
      { to: '/admin/importaciones',  label: 'Carga masiva de datos', color: 'bg-teal-500', permiso: 'ADMIN', icon: Settings },
      { to: '/admin/roles',          label: 'Roles y Permisos Avanzados', color: 'bg-rose-500', permiso: 'ADMIN', icon: Settings },
    ]
  },
  {
    title: 'Gestión Comercial',
    icon: Users,
    items: [
      { to: '/comercial/clientes',   label: 'Gestión de Clientes', color: 'bg-blue-500', permiso: 'VENTAS_CLIENTES', icon: Users },
      { to: '/comercial/historial',  label: 'Historial de Clientes', color: 'bg-indigo-400', permiso: 'VENTAS_CLIENTES', icon: History },
    ]
  }
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()

  // Filtrado de grupos idéntico al de la barra de navegación
  const filteredGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'CLIENT_ADMIN') return true
      
      const userPerms = usuario?.permisos || []
      
      // ADMIN tiene acceso a todo
      if (userPerms.includes('ADMIN')) return true
      
      if (item.rol && usuario?.rol !== item.rol) return false
      if (item.modulo && !usuario?.modulos?.includes(item.modulo)) return false
      
      if (item.permiso) {
        if (item.permiso === 'STOCK_VIEW' || item.permiso === 'STOCK_EDIT' || item.permiso === 'STOCK_INVENTORY') {
          return userPerms.some(p => p.startsWith('STOCK'))
        }
        if (item.permiso === 'PRODUCCION_TALLER' || item.permiso === 'PRODUCCION_SPECIAL') {
          return userPerms.some(p => p.startsWith('PRODUCCION'))
        }
        if (item.permiso === 'FINANZAS_BASIC' || item.permiso === 'FINANZAS_ADV') {
          return userPerms.some(p => p.startsWith('FINANZAS')) || userPerms.includes('CAJA')
        }
        if (item.permiso === 'VENTAS_CLIENTES') {
          return userPerms.includes('VENTAS') || userPerms.includes('VENTAS_CLIENTES')
        }
        if (item.permiso === 'REPORTES_VIEW') {
          return userPerms.includes('REPORTES_VIEW')
        }
        
        return userPerms.includes(item.permiso)
      }
      
      return true
    })
  })).filter(group => group.items.length > 0)

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0a0a0b]">
      {/* Background radial effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="p-8 md:p-12 lg:p-16 max-w-[1400px] mx-auto w-full space-y-12 relative z-10">
        
        {/* Tarjeta de Bienvenida Principal */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full">
              <Shield size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">{usuario?.rol}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-[900] text-white tracking-tighter uppercase italic leading-none">
              Hola, {usuario?.nombre}
            </h1>
            <p className="text-sm text-gray-400 font-bold">
              Bienvenido a tu panel de control industrial. Tienes acceso autorizado a los siguientes espacios de trabajo:
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Sesión Activa</p>
              <p className="text-xs font-black text-white uppercase tracking-tight mt-1">{usuario?.nombre?.substring(0,18)}</p>
            </div>
          </div>
        </motion.div>

        {/* Lanzador de Módulos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <LayoutGrid size={16} className="text-indigo-400" /> Espacios de Trabajo Autorizados
            </h2>
            <div className="h-px flex-1 bg-white/5 ml-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, idx) => {
              const GroupIcon = group.icon || LayoutGrid
              return (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between hover:bg-white/[0.08] hover:border-indigo-500/30 hover:-translate-y-1.5 transition-all shadow-xl group"
                >
                  <div>
                    {/* Encabezado de la Categoría */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <GroupIcon size={18} />
                        </div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight italic">{group.title}</h3>
                      </div>
                      <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {group.items.length} {group.items.length === 1 ? 'Acceso' : 'Accesos'}
                      </div>
                    </div>

                    {/* Accesos Directos */}
                    <div className="space-y-2">
                      {group.items.map(item => {
                        const ItemIcon = item.icon || Tag
                        return (
                          <button
                            key={item.to}
                            onClick={() => navigate(item.to)}
                            className="w-full flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-indigo-600/10 rounded-2xl transition-all text-left text-xs font-bold text-gray-300 hover:text-white group/btn"
                          >
                            <div className="flex items-center gap-3">
                              <ItemIcon size={14} className="text-gray-500 group-hover/btn:text-indigo-400 transition-colors" />
                              <span className="uppercase tracking-tight italic">{item.label}</span>
                            </div>
                            <ChevronRight size={14} className="text-gray-600 group-hover/btn:text-indigo-400 group-hover/btn:translate-x-1 transition-all" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="h-4" /> {/* Espaciador */}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Widget de soporte/información adicional en el pie de página */}
        <div className="text-center pt-8 border-t border-white/5 text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">
          Unifai v3.0 Industrial · Sistema Integrado de Gestión
        </div>

      </div>
    </div>
  )
}
