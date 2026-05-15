import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tallesApi } from '../lib/api'

export function TallesConfig() {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [items, setItems] = useState('') // Separados por coma

  const { data: curvas = [], isLoading } = useQuery({
    queryKey: ['curvas'],
    queryFn: tallesApi.listar
  })

  const mutacion = useMutation({
    mutationFn: (data: any) => tallesApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curvas'] })
      setNombre('')
      setItems('')
    }
  })

  const mutacionEditar = useMutation({
    mutationFn: (data: any) => tallesApi.editar(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curvas'] })
      setEditando(null)
    }
  })

  const mutacionBorrar = useMutation({
    mutationFn: (id: string) => tallesApi.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curvas'] }),
    onError: (err: any) => alert(err.response?.data?.error || 'No se puede eliminar la curva de talles.')
  })

  const [editando, setEditando] = useState<any | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editando) {
      mutacionEditar.mutate({ id: editando.id, nombre: editando.nombre })
    } else {
      mutacion.mutate({
        nombre,
        items: items.split(',').map(i => i.trim()).filter(i => i)
      })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Listado de Curvas */}
      <div className="md:col-span-2 space-y-4">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          Curvas de Talle Registradas
        </h3>
        
        {isLoading ? (
          <div className="text-gray-400 italic text-sm">Cargando curvas industriales...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {curvas.map(c => (
              <div key={c.id} className="bg-[#1a1b1e] border border-white/5 rounded-3xl p-6 shadow-xl hover:border-amber-500/30 transition-all group">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-widest">{c.nombre}</div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditando(c)} className="text-gray-500 hover:text-white transition-colors">✎</button>
                    <button onClick={() => { if(window.confirm('¿Eliminar curva de talles?')) mutacionBorrar.mutate(c.id) }} className="text-gray-500 hover:text-red-500 transition-colors">🗑️</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {c.items?.map((it: any) => (
                    <span key={it.id} className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/10">
                      {it.nombre}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de Alta / Edición */}
      <div className="bg-[#1a1b1e] rounded-[2.5rem] p-10 border border-white/5 h-fit sticky top-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">{editando ? '📝' : '📏'}</span>
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
            {editando ? 'Modificar Curva' : 'Nueva Matriz de Talles'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">Identificador de Curva</label>
            <input 
              required
              value={editando ? editando.nombre : nombre}
              onChange={e => editando ? setEditando({...editando, nombre: e.target.value}) : setNombre(e.target.value)}
              placeholder="Ej: Adultos S a XL"
              className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white shadow-inner focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
            />
          </div>
          {!editando && (
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">Talles (Delimitados por Coma)</label>
              <input 
                required
                value={items}
                onChange={e => setItems(e.target.value)}
                placeholder="S, M, L, XL..."
                className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white shadow-inner focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
              />
              <p className="text-[8px] text-gray-600 mt-4 italic font-black uppercase tracking-widest leading-relaxed">
                Determine la secuencia estructural (ej: 4, 6, 8, 10, 12, 14, 16).
              </p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <button 
              type="submit"
              disabled={mutacion.isPending || mutacionEditar.isPending}
              className="w-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-5 rounded-3xl hover:bg-amber-500 transition-all shadow-xl disabled:opacity-50 active:scale-95"
            >
              {mutacion.isPending || mutacionEditar.isPending ? 'Sincronizando...' : (editando ? 'Sincronizar Curva' : 'Registrar Matriz')}
            </button>
            {editando && (
              <button 
                type="button"
                onClick={() => setEditando(null)}
                className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors text-center"
              >
                Abortar Edición
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
