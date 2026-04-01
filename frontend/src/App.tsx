import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { InsumosPage } from './pages/InsumosPage'
import { PreciosPage } from './pages/PreciosPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { PedidosPage } from './pages/PedidosPage'
import { AdminPage } from './pages/AdminPage'
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="insumos"      element={<InsumosPage />} />
            <Route path="precios"      element={<PreciosPage />} />
            <Route path="presupuestos" element={<PresupuestosPage />} />
            <Route path="pedidos"      element={<PedidosPage />} />
            <Route path="admin"        element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
