import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft, Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../lib/api'
import { toast } from 'sonner'

export function RecoverWithPinPage() {
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!dni || !pin || !password || !confirmPassword) {
      setError('Por favor, completa todos los campos')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setError('')

    try {
      await authApi.resetPin(dni, pin, password)
      toast.success('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      navigate('/login')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Error al validar el PIN. Verifica los datos e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <KeyRound size={32} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Recuperar con PIN</h2>
            <p className="text-gray-400 font-medium text-sm">Ingresa tu DNI y el PIN de seguridad proporcionado por tu administrador.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                DNI / Identificador
              </label>
              <input 
                type="text" value={dni} onChange={e => setDni(e.target.value)} required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                placeholder="Ingresa tu DNI"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                PIN de Seguridad
              </label>
              <input 
                type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-center tracking-[0.5em]"
                placeholder="••••"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                <Lock size={12} /> Nueva Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-12 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                <Lock size={12} /> Confirmar Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-12 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                  placeholder="Repite la contraseña"
                  minLength={6}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-2xl uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <ShieldAlert size={14} />
                {error}
              </div>
            )}

            <button 
              type="submit" disabled={loading} 
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>

            <Link 
              to="/login"
              className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors mt-6"
            >
              <ArrowLeft size={14} /> Volver al Login
            </Link>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
