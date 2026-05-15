import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface EmpresaOnboarding {
  empresa: {
    nombre: string
    cuit: string
    plan: string
    modulos: string[]
  }
  admin: {
    nombre: string
    email: string
    password: string
  }
}

export const superAdminService = {
  async listarEmpresas() {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/super/empresas?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Error al listar empresas')
    return res.json()
  },

  async onboardEmpresa(datos: EmpresaOnboarding) {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/super/onboard`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    })
    if (!res.ok) {
      const error = await res.json()
      // Si el error viene de Zod como un array de problemas
      if (Array.isArray(error.error)) {
        const msgs = error.error.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
        throw new Error(`Validación: ${msgs}`)
      }
      throw new Error(error.error || 'Error en el onboarding')
    }
    return res.json()
  },

  async actualizarEmpresa(id: string, datos: any) {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/super/empresas/${id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    })
    if (!res.ok) throw new Error('Error al actualizar empresa')
    return res.json()
  },

  async listarStaging() {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/importaciones/staging`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Error al listar staging')
    return res.json()
  },

  async actualizarStaging(id: string, datos: any) {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/importaciones/staging/${id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    })
    if (!res.ok) throw new Error('Error al actualizar staging')
    return res.json()
  },

  async ejecutarImportacion(id: string) {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/importaciones/staging/${id}/ejecutar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al ejecutar importación')
    return { data }
  }
}
