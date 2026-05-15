import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { configuracionApi } from '../lib/api'

interface Props {
  tiposActuales: string[]
  onSuccess: (nuevoTipo: string) => void
  onCancel: () => void
}

export function InsumoTipoQuickForm({ tiposActuales, onSuccess, onCancel }: Props) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')

  const mutacion = useMutation({
    mutationFn: async (nuevo: string) => {
      const config = await configuracionApi.get()
      const tipos = [...tiposActuales, nuevo.toUpperCase().trim()]
      await configuracionApi.update({
        ...config,
        tipos_insumo: JSON.stringify(tipos)
      })
      return nuevo.toUpperCase().trim()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['configuracion-real'] })
      onSuccess(data)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) return
    if (tiposActuales.includes(nombre.toUpperCase().trim())) {
      alert('Este tipo ya existe.')
      return
    }
    mutacion.mutate(nombre)
  }

  return (
    <div className="bg-white rounded-3xl p-8 w-full shadow-2xl border border-gray-100 animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-black uppercase italic leading-none text-gray-900">Nuevo Tipo de Insumo</h3>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Categorización técnica</p>
        </div>
        <button onClick={onCancel} className="text-gray-300 hover:text-gray-900">✕</button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Nombre del Tipo</label>
          <input 
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: SEMI-TERMINADO, TERMINADO..."
            className="w-full border-b-2 border-gray-100 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500 bg-transparent transition-colors uppercase"
          />
        </div>
        
        <div className="flex gap-4">
          <button 
            type="submit" 
            disabled={mutacion.isPending}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
          >
            {mutacion.isPending ? 'Registrando...' : 'Registrar Tipo'}
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="px-6 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
