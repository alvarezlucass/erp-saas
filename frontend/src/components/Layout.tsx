import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const nav = [
  { to: '/',             label: 'Inicio',            color: 'bg-blue-500' },
  { to: '/insumos',      label: 'Insumos y costos',  color: 'bg-teal-500' },
  { to: '/precios',      label: 'Listas de precios', color: 'bg-amber-500' },
  { to: '/presupuestos', label: 'Presupuestos',       color: 'bg-orange-500' },
  { to: '/pedidos',      label: 'Pedidos y órdenes', color: 'bg-purple-500' },
  { to: '/admin',        label: 'Administración',     color: 'bg-gray-400' },
]

export function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900 tracking-tight">Unifai</div>
          <div className="text-xs text-gray-400 mt-0.5">Sistema de gestión</div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 pt-3 pb-1">
            Principal
          </div>
          {nav.slice(0, 4).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              {item.label}
            </NavLink>
          ))}

          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 pt-4 pb-1">
            Producción
          </div>
          {nav.slice(4).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 truncate">{usuario?.nombre}</div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
