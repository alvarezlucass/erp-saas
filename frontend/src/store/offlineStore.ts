import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { queryClient } from '../lib/queryClient'

export interface OfflineRequest {
  id: string
  url: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: any
  title: string
  headers?: Record<string, string>
  createdAt: number
}

interface OfflineState {
  isOnline: boolean
  isSyncing: boolean
  offlineQueue: OfflineRequest[]
  setOnlineStatus: (status: boolean) => void
  addRequest: (request: Omit<OfflineRequest, 'id' | 'createdAt'>) => void
  removeRequest: (id: string) => void
  clearQueue: () => void
  processQueue: () => Promise<void>
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      offlineQueue: [],

      setOnlineStatus: (status) => {
        const wasOffline = !get().isOnline
        set({ isOnline: status })
        
        if (status && wasOffline && get().offlineQueue.length > 0) {
          get().processQueue()
        }
      },

      addRequest: (req) => {
        const newRequest: OfflineRequest = {
          ...req,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: Date.now()
        }
        set((state) => ({
          offlineQueue: [...state.offlineQueue, newRequest]
        }))
      },

      removeRequest: (id) => {
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((r) => r.id !== id)
        }))
      },

      clearQueue: () => set({ offlineQueue: [] }),

      processQueue: async () => {
        const { isOnline, isSyncing, offlineQueue } = get()
        if (!isOnline || isSyncing || offlineQueue.length === 0) return

        set({ isSyncing: true })
        const total = offlineQueue.length
        toast.info(`Iniciando sincronización de ${total} acción(es) pendiente(s)...`, {
          id: 'sync-status',
          duration: 3000
        })

        // Importación dinámica para evitar dependencias circulares
        const { api } = await import('../lib/api')

        const pendingRequests = [...offlineQueue]
        let succeededCount = 0

        for (const req of pendingRequests) {
          try {
            await api({
              url: req.url,
              method: req.method,
              data: req.body,
              headers: {
                ...req.headers,
                'X-Offline-Sync': 'true'
              }
            })
            
            get().removeRequest(req.id)
            succeededCount++
            
            toast.success(`"${req.title}" sincronizado con éxito.`, {
              duration: 2000
            })
          } catch (error: any) {
            console.error(`Error al sincronizar petición offline: ${req.title}`, error)
            
            const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error'
            if (isNetworkError) {
              toast.error(`Sincronización pausada: Conexión perdida.`, {
                id: 'sync-status',
                duration: 4000
              })
              break
            } else {
              get().removeRequest(req.id)
              toast.error(`Error al sincronizar "${req.title}": ${error.response?.data?.error || error.message || 'Error del servidor'}. Se descartó.`, {
                duration: 6000
              })
            }
          }
        }

        set({ isSyncing: false })

        if (succeededCount > 0) {
          toast.success(`Sincronización finalizada: ${succeededCount} de ${total} acciones enviadas.`, {
            id: 'sync-status',
            duration: 4000
          })
          queryClient.invalidateQueries()
        }
      }
    }),
    {
      name: 'unifai-offline-queue',
      partialize: (state) => ({ offlineQueue: state.offlineQueue })
    }
  )
)
