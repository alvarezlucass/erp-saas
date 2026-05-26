import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, X, LogOut, LayoutGrid, Building2, 
  ShoppingCart, Factory, Star, Wallet, Users, BarChart3, Settings
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
}

const MENU_GROUPS: { title: string; icon: any; items: MenuItem[] }[] = [
  {
    title: 'Principal',
    icon: LayoutGrid,
    items: [
      { to: '/',             label: 'Inicio / Dashboard', color: 'bg-emerald-500' },
      { to: '/productos',    label: 'Catálogo de productos', color: 'bg-blue-500', permiso: 'STOCK_VIEW' },
      { to: '/precios',      label: 'Listas de precios', color: 'bg-amber-500', permiso: 'VENTAS' },
      { to: '/presupuestos', label: 'Presupuestos',       color: 'bg-orange-500', permiso: 'VENTAS' },
      { to: '/punto-venta/vendedor', label: 'Ventas (mostrador)', color: 'bg-pink-500', permiso: 'VENTAS' },
      { to: '/punto-venta/caja',     label: 'Caja y cobros',      color: 'bg-cyan-600', permiso: 'CAJA' },
      { to: '/pedidos',      label: 'Pedidos y órdenes', color: 'bg-purple-500', permiso: 'PRODUCCION' },
    ]
  },
  {
    title: 'Compras y Abastecimiento',
    icon: ShoppingCart,
    items: [
      { to: '/proveedores',          label: 'Gestión de Proveedores', color: 'bg-indigo-500', permiso: 'STOCK_INVENTORY' },
      { to: '/compras/oc',           label: 'Órdenes de Compra',     color: 'bg-indigo-400', permiso: 'STOCK_INVENTORY' },
      { to: '/compras/recepcion',    label: 'Recepción de Mercadería', color: 'bg-indigo-300', permiso: 'STOCK_INVENTORY' },
      { to: '/compras/devoluciones', label: 'Diferencias y Devoluciones', color: 'bg-rose-400', permiso: 'STOCK_INVENTORY' },
    ]
  },
  {
    title: 'Producción y Taller',
    icon: Factory,
    items: [
      { to: '/admin/templates',      label: 'Templates de Moldería', color: 'bg-rose-500', permiso: 'STOCK_EDIT' },
      { to: '/insumos',              label: 'Insumos y Costos',      color: 'bg-teal-500', permiso: 'STOCK_EDIT' },
      { to: '/inventario',           label: 'Control de Stock',      color: 'bg-cyan-500', permiso: 'STOCK_VIEW' },
      { to: '/admin/costeos',        label: 'Ajustes de Costeo',      color: 'bg-indigo-600', permiso: 'STOCK_EDIT' },
      { to: '/produccion/ordenes',   label: 'Órdenes de Producción',  color: 'bg-orange-600', permiso: 'PRODUCCION_TALLER' },
      { to: '/produccion/etapas',    label: 'Control de Etapas / Taller', color: 'bg-amber-600', permiso: 'PRODUCCION_TALLER' },
      { to: '/produccion/entrega',   label: 'Entrega Producto Terminado', color: 'bg-emerald-600', permiso: 'PRODUCCION_TALLER' },
    ]
  },
  {
    title: 'Especial',
    icon: Star,
    items: [
      { to: '/bordados',             label: 'Alta de Bordados',     color: 'bg-violet-500', permiso: 'PRODUCCION_SPECIAL' },
      { to: '/terceros/ordenes',     label: 'Órdenes a Terceros',   color: 'bg-fuchsia-500', permiso: 'PRODUCCION_SPECIAL' },
    ]
  },
  {
    title: 'Finanzas y Tesorería',
    icon: Wallet,
    items: [
      { to: '/finanzas/cc',          label: 'Cuentas Corrientes',     color: 'bg-emerald-500', permiso: 'FINANZAS_BASIC' },
      { to: '/finanzas/bancos',      label: 'Bancos y Movimientos',   color: 'bg-blue-600', permiso: 'FINANZAS_BASIC' },
      { to: '/finanzas/pagos',       label: 'Pago a Proveedores',     color: 'bg-rose-600', permiso: 'FINANZAS_BASIC' },
      { to: '/finanzas/cashflow',    label: 'Flujo de Caja (Cashflow)', color: 'bg-cyan-600', permiso: 'FINANZAS_ADV' },
      { to: '/finanzas/proyecciones', label: 'Proyecciones Financieras', color: 'bg-teal-600', permiso: 'FINANZAS_ADV' },
      { to: '/finanzas/sueldos',     label: 'Sueldos y Liquidación',  color: 'bg-orange-400', permiso: 'FINANZAS_ADV' },
      { to: '/finanzas/contabilidad', label: 'Contabilidad General',  color: 'bg-gray-500', permiso: 'FINANZAS_ADV' },
    ]
  },
  {
    title: 'Gestión Comercial',
    icon: Users,
    items: [
      { to: '/comercial/clientes',   label: 'Gestión de Clientes',    color: 'bg-blue-500', permiso: 'VENTAS_CLIENTES' },
      { to: '/comercial/historial',  label: 'Historial por Cliente',  color: 'bg-indigo-400', permiso: 'VENTAS_CLIENTES' },
      { to: '/comercial/revendedores', label: 'Revendedores (Pasamanos)', color: 'bg-pink-500', permiso: 'VENTAS_CLIENTES' },
    ]
  },
  {
    title: 'Reportes e Inteligencia',
    icon: BarChart3,
    items: [
      { to: '/reportes/ventas',      label: 'Reportes de Ventas',      color: 'bg-emerald-500', permiso: 'REPORTES_VIEW' },
      { to: '/reportes/rentabilidad', label: 'Rentabilidad por Producto', color: 'bg-amber-500', permiso: 'REPORTES_VIEW' },
      { to: '/reportes/ejecutivo',   label: 'Dashboard Ejecutivo',     color: 'bg-indigo-500', permiso: 'REPORTES_VIEW' },
    ]
  },
  {
    title: 'Sistema y Administración',
    icon: Settings,
    items: [
      { to: '/admin/usuarios',       label: 'Gestión de Equipo',      color: 'bg-indigo-600', permiso: 'ADMIN' },
      { to: '/admin',                label: 'Administración Global',  color: 'bg-gray-400', permiso: 'ADMIN' },
      { to: '/admin/importaciones',  label: 'Carga Masiva de Datos',  color: 'bg-teal-500', permiso: 'ADMIN' },
      { to: '/admin/roles',          label: 'Roles y Permisos Avanzados', color: 'bg-rose-500', permiso: 'ADMIN' },
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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setIsOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
        // Mapeos especiales de permisos granulares
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
          width: isOpen ? 380 : 0,
          x: isMobile && !isOpen ? -380 : 0
        }}
        className={`bg-[#0f0f12] border-r border-gray-800/50 flex flex-col shrink-0 z-50 fixed lg:relative h-full overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.6)]`}
      >
        <div className="px-8 py-8 border-b border-gray-800/50 flex items-center justify-between bg-[#131317]">
          <div className="flex items-center gap-4">
            {empresa?.logoUrl ? (
              <img src={empresa.logoUrl} className="w-12 h-12 rounded-2xl object-contain shadow-xl border border-gray-700 bg-gray-900" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <Building2 size={28} />
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-base font-black text-white tracking-tight leading-tight uppercase italic">
                {empresa?.nombre || 'Unifai SaaS'}
              </div>
              <div className="text-[10px] text-emerald-400 font-extrabold mt-1 uppercase tracking-[0.2em] truncate opacity-80">
                {usuario?.rol === 'SUPER_ADMIN' ? 'Control Master' : 'Industrial ERP'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-12 overflow-y-auto scrollbar-hide bg-[#0f0f12]">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-3 px-4">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                 <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-70">
                    {group.title}
                 </div>
              </div>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => isMobile && setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-5 py-4 rounded-[1.4rem] text-[14px] font-black transition-all border group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.3)] border-indigo-400 scale-[1.03]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent hover:border-white/10'
                      }`
                    }
                  >
                    <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg group-hover:scale-125 transition-transform`} />
                    <span className="tracking-tight italic uppercase whitespace-pre-wrap">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-800/50 bg-[#131317]">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm uppercase shadow-inner">
                {usuario?.nombre?.substring(0,2)}
             </div>
             <div className="flex-1 overflow-hidden">
                <div className="text-sm font-black text-white truncate uppercase italic tracking-tight">{usuario?.nombre}</div>
                <div className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-widest opacity-80">{usuario?.rol}</div>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all uppercase tracking-[0.2em]"
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0a0a0b]">
        {!isOpen && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-8 left-8 z-30 w-14 h-14 bg-[#131317] rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-center text-indigo-400 lg:hidden"
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
