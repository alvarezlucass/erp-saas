import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, X, LogOut, LayoutGrid, Building2, ShoppingCart, Factory, Star, Wallet, Users, BarChart3, Settings,
  Tag, FileText, DollarSign, Layers, CheckSquare, RefreshCw, Truck, Archive, Play, ArrowLeftRight, Receipt, Activity,
  LineChart, Clock, Folder, Calculator, UserCheck, History, ChevronLeft, ChevronRight, Palette, PiggyBank
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { empresaApi } from '../lib/api'

interface MenuItem {
  to: string
  label: string
  color: string
  permiso?: string
  rol?: string
  modulo?: string
  icon: any
}

// Menús reestructurados alineados al flujo PyME
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

export function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: empresa } = useQuery({
    queryKey: ['mi-empresa'],
    queryFn: () => empresaApi.getMe(),
    enabled: !!usuario
  })

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024)
  
  // Estado para el colapso del sidebar en escritorio
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('unifai-sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setIsOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleCollapse = () => {
    const nextVal = !isCollapsed
    setIsCollapsed(nextVal)
    localStorage.setItem('unifai-sidebar-collapsed', String(nextVal))
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

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
        // Mapeos de permisos granulares
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
    <div className="flex h-screen bg-[#0a0a0b] font-sans overflow-hidden dark">
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile 
            ? (isOpen ? 280 : 0) 
            : (isCollapsed ? 84 : 280),
          x: isMobile && !isOpen ? -280 : 0
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="bg-[#0f0f12] border-r border-gray-800/50 flex flex-col shrink-0 z-50 fixed lg:relative h-full overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.6)]"
      >
        {/* Header con información de la empresa */}
        <div className={`px-6 py-6 border-b border-gray-800/50 flex ${isCollapsed ? 'flex-col items-center gap-4 justify-center' : 'items-center justify-between'} bg-[#131317]`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-4 overflow-hidden">
              {empresa?.logoUrl ? (
                <img src={empresa.logoUrl} className="w-10 h-10 rounded-2xl object-contain shadow-xl border border-gray-700 bg-gray-900" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                  <Building2 size={24} />
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-sm font-black text-white tracking-tight leading-tight uppercase italic truncate">
                  {empresa?.nombre || 'Unifai SaaS'}
                </div>
                <div className="text-[9px] text-emerald-400 font-extrabold mt-1 uppercase tracking-[0.2em] truncate opacity-80">
                  {usuario?.rol === 'SUPER_ADMIN' ? 'Control Master' : 'Industrial ERP'}
                </div>
              </div>
            </div>
          ) : (
            empresa?.logoUrl ? (
              <img src={empresa.logoUrl} className="w-10 h-10 rounded-2xl object-contain shadow-xl border border-gray-700 bg-gray-900" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                <Building2 size={20} />
              </div>
            )
          )}
          
          {/* Botón de Colapso para Escritorio */}
          {!isMobile && (
            <button 
              onClick={toggleCollapse} 
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl border border-gray-800 transition-all"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Listado de Menús */}
        <nav className="flex-1 p-4 space-y-8 overflow-y-auto scrollbar-hide bg-[#0f0f12]">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              {!isCollapsed ? (
                <div className="flex items-center gap-3 px-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                   <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-70">
                      {group.title}
                   </div>
                </div>
              ) : (
                <div className="w-full h-px bg-gray-800/40 my-3" />
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon || Layers
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => isMobile && setIsOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} px-4 py-3.5 rounded-[1.2rem] text-[13px] font-black transition-all border group ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.3)] border-indigo-400 scale-[1.02]'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent hover:border-white/10'
                        }`
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="tracking-tight italic uppercase whitespace-pre-wrap">{item.label}</span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer del Perfil y Logout */}
        <div className={`p-6 border-t border-gray-800/50 bg-[#131317] ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xs uppercase shadow-inner shrink-0">
                  {usuario?.nombre?.substring(0,2)}
               </div>
               <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-black text-white truncate uppercase italic tracking-tight">{usuario?.nombre}</div>
                  <div className="text-[9px] font-bold text-gray-500 truncate uppercase tracking-widest opacity-80">{usuario?.rol}</div>
               </div>
            </div>
          ) : (
             <div 
               className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xs uppercase shadow-inner"
               title={`${usuario?.nombre} (${usuario?.rol})`}
             >
                {usuario?.nombre?.substring(0,2)}
             </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all uppercase tracking-[0.2em] ${isCollapsed ? 'w-10 h-10 p-0 rounded-2xl' : 'w-full'}`}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0a0a0b]">
        {isMobile && !isOpen && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-8 left-8 z-30 w-14 h-14 bg-[#131317] rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-center text-indigo-400"
          >
            <Menu size={28} />
          </motion.button>
        )}

        <main className="flex-1 overflow-auto bg-[#0a0a0b]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
