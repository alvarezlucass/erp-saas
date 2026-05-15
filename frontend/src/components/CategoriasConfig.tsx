import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasApi } from '../lib/api'

export function CategoriasConfig() {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [puntos, setPuntos] = useState('') // Separados por coma

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.listar
  })

  const mutacion = useMutation({
    mutationFn: (data: any) => categoriasApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      setNombre('')
      setPuntos('')
    }
  })

  const mutacionEditar = useMutation({
    mutationFn: (data: any) => categoriasApi.editar(data.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      setEditando(null)
    }
  })

  const mutacionBorrar = useMutation({
    mutationFn: (id: string) => categoriasApi.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
    onError: (err: any) => alert(err.response?.data?.error || 'No se puede eliminar la categoría.')
  })

  const [editando, setEditando] = useState<any | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editando) {
      mutacionEditar.mutate({ id: editando.id, nombre: editando.nombre })
    } else {
      mutacion.mutate({
        nombre,
        puntos: puntos.split(',').map(p => p.trim()).filter(p => p)
      })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Listado de Categorías */}
      <div className="md:col-span-2 space-y-4">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          Categorías Registradas
        </h3>
        
        {isLoading ? (
          <div className="text-gray-400 italic text-sm">Cargando maestros...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categorias.map(c => (
              <div key={c.id} className="bg-[#1a1b1e] border border-white/5 rounded-3xl p-6 shadow-xl hover:border-indigo-500/30 transition-all group">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">{c.nombre}</div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditando(c)} className="text-gray-500 hover:text-white transition-colors">✎</button>
                    <button onClick={() => { if(window.confirm('¿Eliminar categoría?')) mutacionBorrar.mutate(c.id) }} className="text-gray-500 hover:text-red-500 transition-colors">🗑️</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {c.puntosReferencia?.map((p: any) => (
                    <span key={p.id} className="text-[10px] font-black bg-white/5 text-gray-400 px-3 py-1 rounded border border-white/5 group-hover:text-indigo-300 transition-colors">
                      {p.nombre}
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
        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-8">
          {editando ? 'Modificar Registro' : 'Nueva Estructura Técnica'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Nombre de Identificación</label>
            <input 
              required
              value={editando ? editando.nombre : nombre}
              onChange={e => editando ? setEditando({...editando, nombre: e.target.value}) : setNombre(e.target.value)}
              placeholder="Ej: Chomba Manga Corta"
              className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white shadow-inner focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          {!editando && (
            <div>
              <label className="block text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Puntos de Medición (CM)</label>
              <textarea 
                value={puntos}
                onChange={e => setPuntos(e.target.value)}
                placeholder="Sisa, Largo Total, Ancho Hombros..."
                className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white shadow-inner focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[120px] transition-all"
              />
              <p className="text-[8px] text-gray-600 mt-3 italic font-black uppercase tracking-widest leading-relaxed">
                Use comas como delimitadores estructurales.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <button 
              type="submit"
              disabled={mutacion.isPending || mutacionEditar.isPending}
              className="w-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-5 rounded-3xl hover:bg-indigo-500 transition-all shadow-xl disabled:opacity-50 active:scale-95"
            >
              {mutacion.isPending || mutacionEditar.isPending ? 'Sincronizando...' : (editando ? 'Sincronizar Cambios' : 'Registrar Categoría')}
            </button>
            {editando && (
              <button 
                type="button"
                onClick={() => setEditando(null)}
                className="w-full text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
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
