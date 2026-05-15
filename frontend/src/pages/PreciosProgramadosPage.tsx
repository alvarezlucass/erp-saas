import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  Package, 
  Layers, 
  Globe,
  AlertCircle
} from 'lucide-react'
import { api, categoriasApi, productosApi, Categoria, Producto } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function PreciosProgramadosPage() {
  const [programaciones, setProgramaciones] = useState<any[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [tipo, setTipo] = useState<'GLOBAL' | 'CATEGORIA' | 'PRODUCTO'>('CATEGORIA')
  const [targetId, setTargetId] = useState('')
  const [porcentaje, setPorcentaje] = useState(0)
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('00:00')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [p, c] = await Promise.all([
        api.get('/precios-programados/programaciones').then(r => r.data),
        categoriasApi.listar()
      ])
      setProgramaciones(p)
      setCategorias(c)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async () => {
    try {
      await api.post('/precios-programados/programaciones', {
        tipo,
        targetId: tipo === 'GLOBAL' ? null : targetId,
        porcentaje: Number(porcentaje),
        fechaEjecucion: `${fecha}T${hora}:00`
      })
      setShowModal(false)
      loadData()
    } catch (error) {
      alert('Error al programar cambio')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta programación?')) return
    try {
      await api.delete(`/precios-programados/programaciones/${id}`)
      loadData()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <Calendar className="w-10 h-10 text-purple-500" />
            PRECIOS PROGRAMADOS
          </h1>
          <p className="text-gray-400 mt-2 font-medium uppercase tracking-widest text-sm">
            Automatización de ajustes de precios futuros
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-5 h-5" />
          AGENDAR CAMBIO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programaciones.map((prog) => (
          <div key={prog.id} className={`bg-zinc-900/50 border ${prog.ejecutado ? 'border-green-500/30' : 'border-zinc-800'} p-6 rounded-3xl relative overflow-hidden group transition-all hover:border-purple-500/50`}>
            {prog.ejecutado && (
              <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                Ejecutado
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-zinc-800 rounded-2xl">
                {prog.tipo === 'GLOBAL' ? <Globe className="w-6 h-6 text-blue-400" /> : 
                 prog.tipo === 'CATEGORIA' ? <Layers className="w-6 h-6 text-purple-400" /> : 
                 <Package className="w-6 h-6 text-orange-400" />}
              </div>
              {!prog.ejecutado && (
                <button onClick={() => handleDelete(prog.id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-white font-black text-xl tracking-tight">
                  {prog.porcentaje > 0 ? '+' : ''}{prog.porcentaje}% {prog.tipo}
                </h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                  {prog.tipo === 'GLOBAL' ? 'Toda la lista' : prog.targetId || 'ID Desconocido'}
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-tighter">
                    {format(new Date(prog.fechaEjecucion), "dd 'de' MMMM, HH:mm'hs'", { locale: es })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {programaciones.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
            <Calendar className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm">No hay cambios programados</p>
          </div>
        )}
      </div>

      {/* Modal Programación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/30">
              <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                AGENDAR AJUSTE
              </h2>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alcance del Cambio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CATEGORIA', 'PRODUCTO', 'GLOBAL'] as const).map(t => (
                    <button 
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${tipo === t ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === 'CATEGORIA' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seleccionar Categoría</label>
                  <select 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  >
                    <option value="">Elegir...</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Porcentaje de Ajuste</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white text-2xl font-black text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-500">%</span>
                  {porcentaje > 0 ? (
                    <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
                  ) : porcentaje < 0 ? (
                    <TrendingDown className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</label>
                  <input 
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hora</label>
                  <input 
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white font-bold"
                  />
                </div>
              </div>

              <div className="bg-purple-500/10 p-4 rounded-2xl flex items-start gap-3 border border-purple-500/20">
                <AlertCircle className="w-5 h-5 text-purple-400 shrink-0" />
                <p className="text-purple-300 text-[10px] font-medium leading-relaxed">
                  Este ajuste impactará automáticamente en todos los precios de venta de la selección el día indicado. Esta acción no se puede deshacer una vez ejecutada.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-800/30 flex gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:text-white transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleSchedule}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all"
              >
                AGENDAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
