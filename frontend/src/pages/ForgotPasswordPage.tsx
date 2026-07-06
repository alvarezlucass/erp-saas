import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, ShieldAlert, KeyRound, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'
import { toast } from 'sonner'

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [mode, setMode] = useState<'INITIAL' | 'PIN_RECOVERY' | 'EMAIL_SUCCESS'>('INITIAL')
  
  const [pin, setPin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (identifier.includes('@')) {
       // Admin (Email) -> Supabase Recovery
       try {
         const { error: sbError } = await supabase.auth.resetPasswordForEmail(identifier, {
           redirectTo: window.location.origin + '/update-password'
         })
         if (sbError) throw sbError
         setMode('EMAIL_SUCCESS')
       } catch (err: any) {
         let errorMessage = err.message || 'Error al solicitar el reseteo de contraseña'
         
         if (errorMessage.toLowerCase().includes('email logins are disabled')) {
           errorMessage = 'El inicio de sesión por email está desactivado. Habilítalo en Supabase (Auth > Providers).'
         } else if (errorMessage.toLowerCase().includes('user not found')) {
           errorMessage = 'No existe una cuenta con este email.'
         } else if (errorMessage.toLowerCase().includes('rate limit')) {
           errorMessage = 'Demasiados intentos. Por favor espera unos minutos.'
         }

         setError(errorMessage)
       } finally {
         setLoading(false)
       }
    } else {
       // Empleado (DNI) -> PIN Recovery
       setMode('PIN_RECOVERY')
       setLoading(false)
    }
  }
  
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      setError('Por favor, completa las contraseñas')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setError('')
    try {
      await authApi.resetPin(identifier, pin, newPassword)
      toast.success('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al validar el PIN. Verifica los datos e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden text-white font-bold">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-md">
            <ShieldAlert size={14} className="text-amber-400" />
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Seguridad de Acceso</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-2">¿Problemas?</h1>
          <p className="text-gray-500">Recuperación de identidad</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'INITIAL' && (
            <motion.div 
              key="initial"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
            >
              <form onSubmit={handleNext} className="space-y-6">
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Ingresa tu Email (Admins) o DNI (Empleados) para restablecer tu acceso.
                </p>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Mail size={12} /> Email o DNI
                  </label>
                  <input 
                    type="text" 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    placeholder="admin@empresa.com o 12345678"
                  />
                </div>

                {error && (
                  <div className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-2xl uppercase tracking-widest text-center">
                    {error}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                >
                  {loading ? 'Procesando...' : 'Solicitar Reset'}
                </button>
              </form>
            </motion.div>
          )}

          {mode === 'PIN_RECOVERY' && (
            <motion.div 
              key="pin_recovery"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                  <KeyRound size={32} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Recuperar con PIN</h2>
                <p className="text-gray-400 font-medium text-xs">
                  Para el DNI <span className="text-indigo-400">{identifier}</span>. <br/>
                  Ingresa el PIN de seguridad proporcionado por tu administrador.
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    PIN de Seguridad
                  </label>
                  <div className="relative">
                    <input 
                      type={showPin ? 'text' : 'password'} maxLength={6} value={pin} onChange={e => setPin(e.target.value)} required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-12 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-center tracking-[0.5em]"
                      placeholder="••••"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Lock size={12} /> Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-12 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
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
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
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
              </form>
            </motion.div>
          )}

          {mode === 'EMAIL_SUCCESS' && (
            <motion.div 
              key="email_success"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
            >
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="text-emerald-400" size={28} />
                </div>
                <h3 className="text-xl font-black">Solicitud Enviada</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Hemos recibido tu solicitud para <span className="text-indigo-400">{identifier}</span>. 
                  <br /><br />
                  Enviamos un correo a esa dirección con un enlace seguro para restablecer tu contraseña. 
                  <br /><br />
                  Por favor revisa tu bandeja de entrada o spam.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center relative z-10">
          <Link 
            to="/login"
            className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
          >
            <ArrowLeft size={12} /> Volver al Login
          </Link>
        </div>
      </div>
    </div>
  )
}
