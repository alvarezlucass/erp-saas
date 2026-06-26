import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Lock, CheckCircle2 } from 'lucide-react'

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Escuchar si Supabase detecta la sesión de recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Todo bien, estamos en modo recovery
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      toast.success('Contraseña actualizada con éxito')
      // Cerrar sesión para que se loguee con la nueva
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-full mb-4">
            <Lock className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-2xl font-black text-white">Actualizar Contraseña</h1>
          <p className="text-sm text-gray-400 mt-2">Ingresa tu nueva contraseña para acceder.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Nueva Contraseña
            </label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Actualizando...' : 'Guardar Contraseña'}
            {!loading && <CheckCircle2 size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
