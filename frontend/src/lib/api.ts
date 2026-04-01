import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

// Inyecta el token en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró, logout automático
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── INSUMOS ─────────────────────────────────────────────────────────────────

export interface Insumo {
  id: string
  tipo: string
  categoria: string
  nombre: string
  unidad: string | null
  costoActual: number | null
  ultimaActualizacion: string | null
}

export const insumosApi = {
  listar:     (params?: { tipo?: string; categoria?: string; buscar?: string }) =>
    api.get<Insumo[]>('/insumos', { params }).then(r => r.data),

  historial:  (id: string) =>
    api.get(`/insumos/${id}/historial`).then(r => r.data),

  crear:      (data: { tipo: string; categoria: string; nombre: string; costo: number }) =>
    api.post('/insumos', data).then(r => r.data),

  actualizarPrecio: (id: string, costo: number, motivo?: string) =>
    api.patch(`/insumos/${id}/precio`, { costo, motivo }).then(r => r.data),

  actualizarMasivo: (data: {
    porcentaje: number
    tipo?: string
    categoria?: string
    motivo?: string
  }) => api.post('/insumos/actualizar-masivo', data).then(r => r.data),
}

// ─── PRESUPUESTOS ─────────────────────────────────────────────────────────────

export const presupuestosApi = {
  listar:  () => api.get('/presupuestos').then(r => r.data),
  obtener: (id: string) => api.get(`/presupuestos/${id}`).then(r => r.data),
  crear:   (data: unknown) => api.post('/presupuestos', data).then(r => r.data),
  estado:  (id: string, estado: string) =>
    api.patch(`/presupuestos/${id}/estado`, { estado }).then(r => r.data),
}

// ─── INSTITUCIONES ────────────────────────────────────────────────────────────

export const institucionesApi = {
  listar: () => api.get('/instituciones').then(r => r.data),
  listas: (id: string) => api.get(`/instituciones/${id}/listas`).then(r => r.data),
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
}
