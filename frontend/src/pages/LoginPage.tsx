import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const [email,setEmail]=useState('admin@amanecer.com')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const {setAuth}=useAuthStore()
  const navigate=useNavigate()

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data=await authApi.login(email,password)
      setAuth(data.token,data.usuario)
      navigate('/')
    } catch { setError('Email o contraseña incorrectos') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-medium text-gray-900 tracking-tight">Unifai</div>
          <div className="text-sm text-gray-400 mt-1">Amanecer Indumentaria</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"/>
            </div>
            {error && <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading} className="w-full text-sm font-medium bg-gray-900 text-white rounded-lg py-2.5 hover:bg-gray-700 disabled:opacity-50 transition-colors mt-2">
              {loading?'Ingresando…':'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
