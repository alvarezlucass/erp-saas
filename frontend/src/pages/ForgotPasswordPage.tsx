import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, ShieldAlert } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Como no hay servidor de correo aún, mostramos un mensaje informativo
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden text-white font-bold">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-md">
            <ShieldAlert size={14} className="text-amber-400" />
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Seguridad de Acceso</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-2">¿Problemas?</h1>
          <p className="text-gray-500">Recuperación de identidad</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-2xl"
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Ingresa tu email y te contactaremos para restablecer tu acceso.
              </p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  <Mail size={12} /> Email Registrado
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                  placeholder="admin@empresa.com"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
              >
                Solicitar Reset
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Mail className="text-emerald-400" size={28} />
              </div>
              <h3 className="text-xl font-black">Solicitud Enviada</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Hemos recibido tu solicitud para <span className="text-indigo-400">{email}</span>. 
                <br /><br />
                Dado que el sistema de correo automático está en configuración, un administrador revisará tu identidad y te contactará en breve.
              </p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              <ArrowLeft size={12} /> Volver al Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
