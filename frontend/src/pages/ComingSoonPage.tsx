import { motion } from 'framer-motion'
import { Rocket, Construction, ArrowLeft, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ComingSoonPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gray-50/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="relative inline-block mb-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-pulse">
            <Rocket size={40} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center text-amber-500">
            <Construction size={20} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4 italic italic">
          Módulo en Desarrollo
        </h1>
        
        <p className="text-sm font-bold text-gray-500 leading-relaxed mb-10">
          Estamos industrializando esta sección para brindarte la mejor experiencia operativa. 
          Estará disponible en la próxima actualización de Unifai.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 py-2 rounded-xl mb-6">
            <Clock size={12} /> Fase: Próximo / Planificado
          </div>

          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
          >
            <ArrowLeft size={16} /> Volver Atrás
          </button>
        </div>
      </motion.div>
    </div>
  )
}
