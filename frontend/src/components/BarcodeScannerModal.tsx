import { useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (decodedText: string) => void
  title?: string
}

export function BarcodeScannerModal({ isOpen, onClose, onScan, title = 'Escanear Código' }: BarcodeScannerModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const scanner = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    )

    scanner.render(
      (decodedText) => {
        onScan(decodedText)
        scanner.clear().then(() => {
          onClose()
        }).catch(err => console.error("Failed to clear scanner", err))
      },
      (error) => {
        // Silently ignore errors
      }
    )

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner on unmount", err))
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="bg-indigo-600 p-6 flex flex-col items-center text-center text-white relative">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                type="button"
              >
                <X size={24} />
              </button>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                <Camera size={24} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">{title}</h3>
              <p className="text-[10px] text-white/60 font-medium uppercase tracking-[0.2em] mt-1">Coloque el código frente a la cámara</p>
            </div>
            
            <div className="p-8">
              <div id="reader" className="overflow-hidden rounded-3xl border-4 border-gray-50 shadow-inner bg-gray-50 aspect-square"></div>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="text-xl">💡</div>
                  <p className="text-[10px] text-indigo-700 font-bold leading-relaxed uppercase italic">
                    Asegúrese de tener buena iluminación para un escaneo eficiente.
                  </p>
                </div>
                
                <button 
                  onClick={onClose} 
                  type="button"
                  className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancelar Escaneo
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Powered by UniFAI Industrial Core</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
