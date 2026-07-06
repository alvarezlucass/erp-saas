import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

interface MembresiaConfig {
  empresaId: string
  empresaNombre: string
  rol: string
  preferencias?: Record<string, any>
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  permisos: string[]
  debeCambiarPassword: boolean
  empresaId: string // Empresa Activa
  perfilLegalCompleto?: boolean // True si ya completó el alta formal
  modulos: string[] // Módulos de la empresa activa
  preferencias?: Record<string, any>
  membresias?: MembresiaConfig[]
  tarifaVenta?: string
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  setUsuario: (usuario: Usuario) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:   null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      setUsuario: (usuario) => set({ usuario }),
      logout:  async () => {
        await supabase.auth.signOut()
        set({ token: null, usuario: null })
        localStorage.removeItem('unifai-auth')
      },
    }),
    { name: 'unifai-auth' }
  )
)
