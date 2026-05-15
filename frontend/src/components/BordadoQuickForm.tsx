import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bordadosApi } from '../lib/api'

interface Props {
  onSuccess: (id: string) => void
  onCancel: () => void
}

export function BordadoQuickForm({ onSuccess, onCancel }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntadas, setPuntadas] = useState('0')
  const [precioPorMillar, setPrecioPorMillar] = useState('500')
  const [costoPonchado, setCostoPonchado] = useState('0')
  const [precioEmpresa, setPrecioEmpresa] = useState('')
  const [marginTerceros, setMarginTerceros] = useState('30')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: any) => bordadosApi.crear(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bordados'] })
      onSuccess(data.id)
    }
  })

  const handleSubmit = () => {
    if (!nombre) return
    mutation.mutate({ 
      nombre, 
      descripcion,
      puntadas: parseInt(puntadas) || 0,
      precioPorMillar: parseFloat(precioPorMillar) || 0,
      costoPonchado: parseFloat(costoPonchado) || 0,
      precioEmpresa: parseFloat(precioEmpresa) || null,
      marginTerceros: parseFloat(marginTerceros) || 0,
      activo: true 
    })
  }

  return (
    <div className="bg-violet-50/50 p-6 rounded-3xl border border-violet-100 animate-in zoom-in-95 duration-200">
      <h3 className="text-sm font-black uppercase text-gray-900 mb-4 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
        Configuración Rápida de Bordado
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nombre / ID</label>
            <input 
              autoFocus
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Logo Pecho Colegio"
              className="w-full text-xs font-bold border-b border-violet-200 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Descripción (Opcional)</label>
            <input 
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Bordado hilos dorados"
              className="w-full text-xs font-bold border-b border-violet-200 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Puntadas</label>
            <input 
              type="number"
              value={puntadas}
              onChange={e => setPuntadas(e.target.value)}
              className="w-full text-xs font-bold border-b border-violet-200 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tasa x1k Puntadas</label>
            <input 
              type="number"
              value={precioPorMillar}
              onChange={e => setPrecioPorMillar(e.target.value)}
              className="w-full text-xs font-bold border-b border-violet-200 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Costo Matriz</label>
            <input 
              type="number"
              value={costoPonchado}
              onChange={e => setCostoPonchado(e.target.value)}
              className="w-full text-xs font-bold border-b border-violet-200 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Precio Empresa (ARS)</label>
            <input 
              type="number"
              value={precioEmpresa}
              onChange={e => setPrecioEmpresa(e.target.value)}
              placeholder="Ej: 1400"
              className="w-full text-xs font-black border-b border-emerald-200 py-1.5 focus:outline-none focus:border-emerald-500 bg-emerald-50/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Margen %</label>
            <input 
              type="number"
              value={marginTerceros}
              onChange={e => setMarginTerceros(e.target.value)}
              className="w-full text-xs font-bold border-b border-violet-100 py-1.5 focus:outline-none focus:border-violet-500 bg-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || !nombre}
            className="flex-1 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-violet-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Dar de Alta Bordado'}
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
