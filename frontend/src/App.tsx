import { QueryClientProvider } from '@tanstack/react-query'
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
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import OrdenesCompraPage from './pages/OrdenesCompraPage'
import RecepcionMercaderiaPage from './pages/RecepcionMercaderiaPage'
import PreciosProgramadosPage from './pages/PreciosProgramadosPage'
import CuentaCorrientePage from './pages/CuentaCorrientePage'
import { Toaster, toast } from 'sonner'
import { useAuthStore } from './store/authStore'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { queryClient } from './lib/queryClient'
import { useOfflineStore } from './store/offlineStore'
import { useEffect } from 'react'

import { hasPermission } from './constants/modules'

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
  
  if (hasPermission(usuario, permission)) {
    return <>{children}</>
  }

  toast.error('Acceso denegado: No tienes permiso para esta sección', { id: 'auth-error' })
  return <Navigate to="/" replace />
}

export default function App() {
  const { usuario, token } = useAuthStore()
  const setOnlineStatus = useOfflineStore(s => s.setOnlineStatus)

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])

  // Interceptar el link de recuperación de contraseña de Supabase
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      window.location.href = '/update-password' + window.location.hash
    }
  }, [])

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
        <PWAInstallPrompt />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<DashboardPage />} />

            {/* PRODUCTOS Y STOCK */}
            <Route path="productos" element={<Guard permission="TALLER_STOCK"><ProductosPage /></Guard>} />
            <Route path="productos/alta-industrial" element={<Guard permission="TALLER_STOCK"><AltaProductoPage /></Guard>} />
            <Route path="productos/alta-retail" element={<Guard permission="TALLER_STOCK"><AltaProductoRetailPage /></Guard>} />
            <Route path="productos/:id/editar" element={<Guard permission="TALLER_STOCK"><AltaProductoPage /></Guard>} />
            <Route path="productos/:id/editar-retail" element={<Guard permission="TALLER_STOCK"><AltaProductoRetailPage /></Guard>} />
            <Route path="inventario" element={<Guard permission="TALLER_STOCK"><InventarioPage /></Guard>} />
            <Route path="insumos" element={<Guard permission="COMPRAS_INSUMOS"><InsumosPage /></Guard>} />

            {/* VENTAS */}
            <Route path="precios" element={<Guard permission="VENTAS_PRECIOS"><PreciosPage /></Guard>} />
            <Route path="precios/programados" element={<Guard permission="VENTAS_PRECIOS"><PreciosProgramadosPage /></Guard>} />
            <Route path="presupuestos" element={<Guard permission="VENTAS_PRESUPUESTOS"><PresupuestosPage /></Guard>} />
            <Route path="punto-venta/vendedor" element={<Guard permission="VENTAS_POS_VENDEDOR"><PuntoVentaVendedorPage /></Guard>} />
            <Route path="punto-venta/caja" element={<Guard permission="VENTAS_POS_CAJA"><PuntoVentaCajeroPage /></Guard>} />
            <Route path="finanzas/cuenta-corriente/:tipo/:id" element={<Guard permission="ADMINISTRACION_MOVIMIENTOS"><CuentaCorrientePage /></Guard>} />

            {/* PRODUCCION */}
            <Route path="pedidos" element={<Guard permission="TALLER_ORDENES"><PedidosPage /></Guard>} />
            <Route path="bordados" element={<Guard permission="BORDADOS_ORDENES"><BordadosPage /></Guard>} />
            <Route path="bordados/disenos" element={<ComingSoonPage />} />

            {/* COMPRAS */}
            <Route path="proveedores" element={<Guard permission="COMPRAS_PROVEEDORES"><ProveedoresPage /></Guard>} />
            <Route path="compras/oc" element={<Guard permission="COMPRAS_OC"><OrdenesCompraPage /></Guard>} />
            <Route path="compras/recepcion" element={<Guard permission="COMPRAS_RECEPCION"><RecepcionMercaderiaPage /></Guard>} />
            <Route path="compras/devoluciones" element={<ComingSoonPage />} />

            {/* PRODUCCION AVANZADA / TALLER */}
            <Route path="produccion/ordenes" element={<ComingSoonPage />} />
            <Route path="produccion/etapas" element={<ComingSoonPage />} />
            <Route path="produccion/entrega" element={<ComingSoonPage />} />
            <Route path="terceros/ordenes" element={<ComingSoonPage />} />

            {/* FINANZAS / ADMINISTRACION */}
            <Route path="finanzas/cc" element={<ComingSoonPage />} />
            <Route path="finanzas/bancos" element={<ComingSoonPage />} />
            <Route path="finanzas/movimientos" element={<ComingSoonPage />} />
            <Route path="finanzas/pagos" element={<ComingSoonPage />} />
            <Route path="finanzas/cashflow" element={<ComingSoonPage />} />
            <Route path="finanzas/proyecciones" element={<ComingSoonPage />} />
            <Route path="finanzas/sueldos" element={<ComingSoonPage />} />
            <Route path="finanzas/contabilidad" element={<ComingSoonPage />} />

            {/* RRHH */}
            <Route path="rrhh/fichadas" element={<ComingSoonPage />} />
            <Route path="rrhh/legajos" element={<ComingSoonPage />} />
            <Route path="rrhh/licencias" element={<ComingSoonPage />} />
            <Route path="rrhh/sueldos" element={<ComingSoonPage />} />
            <Route path="rrhh/liquidaciones" element={<ComingSoonPage />} />
            <Route path="rrhh/931" element={<ComingSoonPage />} />

            {/* COMERCIAL */}
            <Route path="comercial/clientes" element={<Guard permission="COMERCIAL_CLIENTES"><ClientesPage /></Guard>} />
            <Route path="comercial/historial" element={<ComingSoonPage />} />
            <Route path="comercial/revendedores" element={<ComingSoonPage />} />

            {/* REPORTES */}
            <Route path="reportes/ventas" element={<ComingSoonPage />} />
            <Route path="reportes/rentabilidad" element={<ComingSoonPage />} />
            <Route path="reportes/ejecutivo" element={<ComingSoonPage />} />

            {/* ADMIN */}
            <Route path="admin" element={<Guard permission="SISTEMAS_GLOBAL"><AdminPage /></Guard>} />
            <Route path="admin/usuarios" element={<Guard permission="SISTEMAS_ROLES"><UsuariosPage /></Guard>} />
            <Route path="admin/templates" element={<Guard permission="TALLER_MOLDERIA"><CategoriasPage /></Guard>} />
            <Route path="admin/costeos" element={<Guard permission="TALLER_COSTEOS"><AjustesCosteoPage /></Guard>} />
            <Route path="admin/importaciones" element={<Guard permission="SISTEMAS_IMPORTACION"><ImportacionesPage /></Guard>} />
            <Route path="admin/roles" element={<ComingSoonPage />} />

            <Route path="super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
} 
