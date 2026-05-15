import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { institucionesApi } from '../lib/api'

interface Props {
  onSuccess: (id: string) => void
  onCancel: () => void
}

export function InstitucionQuickForm({ onSuccess, onCancel }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('COLEGIO')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: any) => institucionesApi.crear(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['instituciones'] })
      onSuccess(data.id)
    }
  })

  const handleSubmit = () => {
    if (!nombre) return
    mutation.mutate({ nombre, tipo, activo: true })
  }

  return (
    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 animate-in zoom-in-95 duration-200">
      <h3 className="text-sm font-black uppercase text-gray-900 mb-4 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        Alta Rápida de Institución
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nombre Colegio / Empresa</label>
          <input 
            autoFocus
            required
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Colegio San Ignacio"
            className="w-full text-xs font-bold border-b border-indigo-100 py-1.5 focus:outline-none focus:border-indigo-500 bg-transparent"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tipo</label>
          <select 
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="w-full text-[10px] uppercase font-bold bg-white border-none rounded-lg px-2 py-2 shadow-sm"
          >
            <option value="COLEGIO">Colegio / Institución Educativa</option>
            <option value="EMPRESA">Empresa / Corporativo</option>
            <option value="CLUB">Club / Asociación</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || !nombre}
            className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Confirmar Alta'}
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
