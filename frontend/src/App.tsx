import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { InsumosPage } from './pages/InsumosPage'
import { BordadosPage } from './pages/BordadosPage'
import { PreciosPage } from './pages/PreciosPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { PedidosPage } from './pages/PedidosPage'
import { AdminPage } from './pages/AdminPage'
import { AjustesCosteoPage } from './pages/AjustesCosteoPage'
import { ProveedoresPage } from './pages/ProveedoresPage'
import { ProductosPage } from './pages/ProductosPage'
import { AltaProductoPage } from './pages/AltaProductoPage'
import { AltaProductoRetailPage } from './pages/AltaProductoRetailPage'
import { CategoriasPage } from './pages/CategoriasPage'
import { InventarioPage } from './pages/InventarioPage'
import { SuperAdminPage } from './pages/SuperAdminPage'
import PuntoVentaVendedorPage from './pages/PuntoVentaVendedorPage'
import PuntoVentaCajeroPage from './pages/PuntoVentaCajeroPage'
import UsuariosPage from './pages/UsuariosPage'
import { ClientesPage } from './pages/ClientesPage'
import ImportacionesPage from './pages/ImportacionesPage'
import ForcePasswordPage from './pages/ForcePasswordPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import OrdenesCompraPage from './pages/OrdenesCompraPage'
import RecepcionMercaderiaPage from './pages/RecepcionMercaderiaPage'
import PreciosProgramadosPage from './pages/PreciosProgramadosPage'
import CuentaCorrientePage from './pages/CuentaCorrientePage'
import { Toaster, toast } from 'sonner'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const usuario = useAuthStore(s => s.usuario)
  return usuario?.rol === 'SUPER_ADMIN' ? <>{children}</> : <Navigate to="/" replace />
}

function Guard({ permission, children }: { permission: string, children: React.ReactNode }) {
  const usuario = useAuthStore(s => s.usuario)
  if (usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'CLIENT_ADMIN') return <>{children}</>
  
  const userPerms = usuario?.permisos || []
  
  // ADMIN tiene acceso total
  if (userPerms.includes('ADMIN')) return <>{children}</>
  
  let hasAccess = false
  
  switch (permission) {
    case 'STOCK':
      // STOCK es el permiso general de catálogo/compras/inventario.
      // Permitimos acceso si tiene cualquier permiso relacionado con stock.
      hasAccess = userPerms.some(p => ['STOCK', 'STOCK_VIEW', 'STOCK_EDIT', 'STOCK_PRICING', 'STOCK_INVENTORY'].includes(p))
      break
    case 'VENTAS':
      // VENTAS es el permiso de presupuestos, ventas mostrador, clientes, etc.
      hasAccess = userPerms.some(p => ['VENTAS', 'VENTAS_CLIENTES'].includes(p))
      break
    case 'CAJA':
      // CAJA es para cobros y administración.
      hasAccess = userPerms.some(p => ['CAJA', 'FINANZAS_BASIC'].includes(p))
      break
    case 'PRODUCCION':
      // PRODUCCION es para pedidos, kanban, etapas y bordados.
      hasAccess = userPerms.some(p => ['PRODUCCION', 'PRODUCCION_TALLER', 'PRODUCCION_SPECIAL'].includes(p))
      break
    case 'ADMIN':
      // ADMIN es para administración de equipo, costeos, importaciones y templates.
      hasAccess = userPerms.some(p => ['ADMIN', 'STOCK_EDIT'].includes(p))
      break
    default:
      hasAccess = userPerms.includes(permission)
  }

  if (!hasAccess) {
    toast.error('Acceso denegado: No tienes permiso para esta sección', { id: 'auth-error' })
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { usuario, token } = useAuthStore()

  if (token && usuario?.debeCambiarPassword && usuario.rol !== 'SUPER_ADMIN') {
    return (
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" richColors closeButton />
        <ForcePasswordPage />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<DashboardPage />} />

            {/* PRODUCTOS Y STOCK */}
            <Route path="productos" element={<Guard permission="STOCK"><ProductosPage /></Guard>} />
            <Route path="productos/alta-industrial" element={<Guard permission="STOCK"><AltaProductoPage /></Guard>} />
            <Route path="productos/alta-retail" element={<Guard permission="STOCK"><AltaProductoRetailPage /></Guard>} />
            <Route path="productos/:id/editar" element={<Guard permission="STOCK"><AltaProductoPage /></Guard>} />
            <Route path="productos/:id/editar-retail" element={<Guard permission="STOCK"><AltaProductoRetailPage /></Guard>} />
            <Route path="inventario" element={<Guard permission="STOCK"><InventarioPage /></Guard>} />
            <Route path="insumos" element={<Guard permission="STOCK"><InsumosPage /></Guard>} />

            {/* VENTAS */}
            <Route path="precios" element={<Guard permission="VENTAS"><PreciosPage /></Guard>} />
            <Route path="precios/programados" element={<Guard permission="VENTAS"><PreciosProgramadosPage /></Guard>} />
            <Route path="presupuestos" element={<Guard permission="VENTAS"><PresupuestosPage /></Guard>} />
            <Route path="punto-venta/vendedor" element={<Guard permission="VENTAS"><PuntoVentaVendedorPage /></Guard>} />
            <Route path="punto-venta/caja" element={<Guard permission="CAJA"><PuntoVentaCajeroPage /></Guard>} />
            <Route path="finanzas/cuenta-corriente/:tipo/:id" element={<Guard permission="VENTAS"><CuentaCorrientePage /></Guard>} />

            {/* PRODUCCION */}
            <Route path="pedidos" element={<Guard permission="PRODUCCION"><PedidosPage /></Guard>} />
            <Route path="bordados" element={<Guard permission="PRODUCCION"><BordadosPage /></Guard>} />

            {/* COMPRAS */}
            <Route path="proveedores" element={<Guard permission="STOCK"><ProveedoresPage /></Guard>} />
            <Route path="compras/oc" element={<Guard permission="STOCK"><OrdenesCompraPage /></Guard>} />
            <Route path="compras/recepcion" element={<Guard permission="STOCK"><RecepcionMercaderiaPage /></Guard>} />
            <Route path="compras/devoluciones" element={<ComingSoonPage />} />

            {/* PRODUCCION AVANZADA */}
            <Route path="produccion/ordenes" element={<ComingSoonPage />} />
            <Route path="produccion/etapas" element={<ComingSoonPage />} />
            <Route path="produccion/entrega" element={<ComingSoonPage />} />
            <Route path="terceros/ordenes" element={<ComingSoonPage />} />

            {/* FINANZAS */}
            <Route path="finanzas/cc" element={<ComingSoonPage />} />
            <Route path="finanzas/bancos" element={<ComingSoonPage />} />
            <Route path="finanzas/pagos" element={<ComingSoonPage />} />
            <Route path="finanzas/cashflow" element={<ComingSoonPage />} />
            <Route path="finanzas/proyecciones" element={<ComingSoonPage />} />
            <Route path="finanzas/sueldos" element={<ComingSoonPage />} />
            <Route path="finanzas/contabilidad" element={<ComingSoonPage />} />

            {/* COMERCIAL */}
            <Route path="comercial/clientes" element={<Guard permission="VENTAS"><ClientesPage /></Guard>} />
            <Route path="comercial/historial" element={<ComingSoonPage />} />
            <Route path="comercial/revendedores" element={<ComingSoonPage />} />

            {/* REPORTES */}
            <Route path="reportes/ventas" element={<ComingSoonPage />} />
            <Route path="reportes/rentabilidad" element={<ComingSoonPage />} />
            <Route path="reportes/ejecutivo" element={<ComingSoonPage />} />

            {/* ADMIN */}
            <Route path="admin" element={<Guard permission="CAJA"><AdminPage /></Guard>} />
            <Route path="admin/usuarios" element={<Guard permission="ADMIN"><UsuariosPage /></Guard>} />
            <Route path="admin/templates" element={<Guard permission="ADMIN"><CategoriasPage /></Guard>} />
            <Route path="admin/costeos" element={<Guard permission="ADMIN"><AjustesCosteoPage /></Guard>} />
            <Route path="admin/importaciones" element={<Guard permission="ADMIN"><ImportacionesPage /></Guard>} />
            <Route path="admin/roles" element={<ComingSoonPage />} />

            <Route path="super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
} 
