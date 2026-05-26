import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, ChevronRight, Lock, Mail, Rocket, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [tempData, setTempData] = useState<any>(null)
  
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(identifier, password)
      
      // Si tiene varias membresías, mostramos el selector
      if (data.usuario.membresias && data.usuario.membresias.length > 1) {
        setTempData(data)
      } else {
        // Si tiene una sola, logueamos directo
        setAuth(data.token, data.usuario)
        navigate('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCompany = (membresia: any) => {
    // Aquí podríamos refrescar el token para esa empresa específica si fuera necesario
    // Por ahora, como el login inicial nos dio un token funcional para la primera, 
    // y el backend es flexible, actualizamos el estado local.
    const updatedUser = {
      ...tempData.usuario,
      empresaId: membresia.empresaId,
      // Los módulos deberían actualizarse también si varían por empresa
      // Tendríamos que pedirlos al backend en una versión más granular.
    }
    setAuth(tempData.token, updatedUser)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-md">
            <Rocket size={14} className="text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Unifai v3.0 Industrial</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Bienvenido</h1>
          <p className="text-gray-500 font-bold">Gestión de alto rendimiento</p>
        </div>

        <AnimatePresence mode="wait">
          {!tempData ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Mail size={12} /> Email o DNI / Cédula
                  </label>
                  <input 
                    type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    placeholder="nombre@empresa.com o DNI"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Lock size={12} /> Contraseña
                  </label>
                  <div className="relative group">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password} onChange={e => setPassword(e.target.value)} required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-14 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link 
                    to="/forgot-password"
                    className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-xl uppercase tracking-widest text-center">
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit" disabled={loading} 
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Sincronizando...' : 'Iniciar Sesión'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    ¿Eres nuevo?{' '}
                  </span>
                  <Link 
                    to="/register"
                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                  >
                    Registra tu empresa aquí
                  </Link>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="selector"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2 mb-4">
                <h3 className="text-xl font-black text-white">Selecciona Sucursal</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tienes múltiples accesos habilitados</p>
              </div>

              <div className="space-y-3">
                {tempData.usuario.membresias.map((m: any) => (
                  <button
                    key={m.empresaId}
                    onClick={() => handleSelectCompany(m)}
                    className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-600 group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-indigo-600 transition-all">
                        <Building2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-white group-hover:text-white transition-colors">{m.empresaNombre}</p>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest group-hover:text-indigo-200">{m.rol}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
                  </button>
                )) as any}
              </div>

              <button 
                onClick={() => setTempData(null)}
                className="w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                Volver al login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center mt-12 text-[10px] font-black text-gray-700 uppercase tracking-widest">
          Desarrollado por Google Deepmind & Unifai Team
        </p>
      </div>
    </div>
  )
}
