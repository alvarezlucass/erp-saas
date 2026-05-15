import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { usuariosApi } from '../lib/api'
import { toast } from 'sonner'
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function ForcePasswordPage() {
  const { usuario, setAuth, token } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirm) return toast.error('Las contraseñas no coinciden')

    setLoading(true)
    try {
      await usuariosApi.changePassword(password)
      toast.success('Contraseña actualizada correctamente')
      
      // Actualizar estado local para quitar el flag de bloqueo
      if (usuario && token) {
        setAuth(token, { ...usuario, debeCambiarPassword: false })
      }
    } catch (err) {
      toast.error('Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-100/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 relative z-10 border border-gray-100"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-200">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Seguridad Obligatoria</h1>
          <p className="text-sm text-gray-400 font-bold mt-2 leading-relaxed px-4 text-pretty uppercase tracking-widest text-[10px]">
            Para proteger tu cuenta, es necesario que personalices tu contraseña de ingreso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12}/> Nueva Contraseña
            </label>
            <div className="relative">
              <input 
                required 
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12}/> Confirmar Contraseña
            </label>
            <input 
              required 
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !password || password !== confirm}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? 'ACTUALIZANDO...' : (
              <>
                ESTABLECER NUEVA CLAVE
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Protección de Datos End-to-End
            </div>
        </div>
      </motion.div>
    </div>
  )
}
