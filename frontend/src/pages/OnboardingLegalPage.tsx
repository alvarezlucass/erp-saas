import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, MapPin, Calendar, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { toast } from 'sonner'
import { configuracionApi } from '../lib/api'

export function OnboardingLegalPage() {
  const navigate = useNavigate()
  const { usuario, setUsuario } = useAuthStore()
  
  const [razonSocial, setRazonSocial] = useState('')
  const [condicionIva, setCondicionIva] = useState('RESPONSABLE_INSCRIPTO')
  const [domicilioFiscal, setDomicilioFiscal] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!usuario) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const legalData = {
        razonSocial,
        condicionIva,
        domicilioFiscal,
        fechaInicioActividades: fechaInicio
      }

      // Guardar usando el backend (configuracionApi) para evitar bloqueos de RLS
      await configuracionApi.update({
        'LEGAL_DATA': JSON.stringify(legalData),
        'PERFIL_LEGAL_COMPLETO': 'true'
      })

      // Actualizar el estado global
      setUsuario({
        ...usuario,
        perfilLegalCompleto: true
      })

      toast.success('Perfil Legal completado con éxito')
      navigate('/')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al guardar los datos fiscales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl relative z-10 my-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4 backdrop-blur-md">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Paso Final Requerido</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-3">Completar Perfil Legal</h1>
          <p className="text-gray-400 text-sm font-semibold max-w-md mx-auto">
            Para garantizar la seguridad y emitir comprobantes legales, necesitamos los datos fiscales reales de tu empresa.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl p-8 md:p-12"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  <Building2 size={12} /> Razón Social
                </label>
                <input 
                  type="text" 
                  value={razonSocial} 
                  onChange={e => setRazonSocial(e.target.value)} 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
                  placeholder="Nombre Legal Completo S.A."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  <FileText size={12} /> Condición de IVA
                </label>
                <select 
                  value={condicionIva}
                  onChange={e => setCondicionIva(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                >
                  <option value="RESPONSABLE_INSCRIPTO" className="bg-gray-900 text-white">Responsable Inscripto</option>
                  <option value="MONOTRIBUTO" className="bg-gray-900 text-white">Monotributo</option>
                  <option value="EXENTO" className="bg-gray-900 text-white">Exento</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  <Calendar size={12} /> Inicio de Actividades
                </label>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={e => setFechaInicio(e.target.value)} 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  <MapPin size={12} /> Domicilio Fiscal Exacto
                </label>
                <input 
                  type="text" 
                  value={domicilioFiscal} 
                  onChange={e => setDomicilioFiscal(e.target.value)} 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
                  placeholder="Calle, Número, Localidad, Provincia"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-5 py-4 rounded-2xl uppercase tracking-widest">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="pt-6 mt-6 border-t border-white/10">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Guardando Perfil...' : 'Completar y Acceder al Sistema'} <CheckCircle2 size={16} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
