import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { proveedoresApi } from '../lib/api'

interface Props {
  onSuccess: (id: string) => void
  onCancel: () => void
}

export function ProveedorQuickForm({ onSuccess, onCancel }: Props) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [email, setEmail] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: any) => proveedoresApi.crear(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
      onSuccess(data.id)
    }
  })

  const handleSubmit = () => {
    if (!nombre) return
    mutation.mutate({ nombre, contacto, email, activo: true })
  }

  return (
    <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 animate-in zoom-in-95 duration-200">
      <h3 className="text-sm font-black uppercase text-gray-900 mb-4 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
        Alta Rápida de Proveedor
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Razón Social / Nombre</label>
          <input 
            autoFocus
            required
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Textiles Argentinos S.A."
            className="w-full text-xs font-bold border-b border-gray-200 py-1.5 focus:outline-none focus:border-gray-900 bg-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Contacto / Teléfono</label>
            <input 
              value={contacto}
              onChange={e => setContacto(e.target.value)}
              placeholder="Ej: 11 4444 5555"
              className="w-full text-xs font-bold border-b border-gray-200 py-1.5 focus:outline-none focus:border-gray-900 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Email</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ventas@textil.com"
              className="w-full text-xs font-bold border-b border-gray-200 py-1.5 focus:outline-none focus:border-gray-900 bg-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || !nombre}
            className="flex-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg hover:bg-black shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Confirmar Proveedor'}
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
