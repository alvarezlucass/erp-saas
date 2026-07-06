import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[300px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-white">
              {offlineReady ? 'App lista para uso offline' : '¡Nueva versión disponible!'}
            </span>
            <span className="text-sm text-gray-400">
              {offlineReady 
                ? 'La aplicación se descargó correctamente.'
                : 'Hay nuevo contenido. Haz clic para actualizar.'}
            </span>
          </div>
          <button 
            onClick={close}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Actualizar ahora
          </button>
        )}
      </div>
    </div>
  )
}
