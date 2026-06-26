import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada y ejecutándose en modo standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://')

    if (isStandalone) {
      return
    }

    // Detectar si fue descartado en esta sesión
    if (sessionStorage.getItem('unifai-pwa-dismissed') === 'true') {
      return
    }

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    if (ios) {
      // Mostrar banner de iOS de forma automática después de unos segundos
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Escuchar el evento antes de instalar en Android/Desktop
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Ocultar banner
    setShowBanner(false)
    
    // Mostrar prompt
    deferredPrompt.prompt()
    
    // Esperar respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice
    console.log(`Respuesta de instalación PWA: ${outcome}`)
    
    // Limpiar deferredPrompt
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('unifai-pwa-dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-sm bg-[#131317]/95 border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl z-[9999] text-left animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-4 items-start">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white shrink-0 shadow-lg shadow-indigo-600/20">
          <Download size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-tight">Instalar Unifai ERP</h4>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-white p-1 rounded-full transition-colors hover:bg-white/5">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">
            {isIOS 
              ? "Accede más rápido y trabaja sin conexión. Para instalar, toca el botón de compartir abajo en Safari y selecciona 'Agregar al inicio'."
              : "Accede más rápido y trabaja sin conexión instalando la aplicación en tu pantalla de inicio."
            }
          </p>
          <div className="mt-4 flex gap-3">
            {!isIOS ? (
              <>
                <button 
                  onClick={handleDismiss} 
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  Ahora no
                </button>
                <button 
                  onClick={handleInstallClick} 
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  Descargar App
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl">
                <Share size={12} className="animate-bounce" />
                <span>Instrucciones en Safari</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
