import { useState } from 'react'
import { saasApi } from '../lib/api'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CONFIG_MODULOS } from '../constants/modules'
import { Check, Edit3, Save, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function SaasPackagingTab() {
  const { data: planesData = [], refetch, isLoading } = useQuery({
    queryKey: ['saasPlanes'],
    queryFn: saasApi.getPlanes
  })

  const defaultMatrix = [
    { id: 'ESENCIAL', nombre: 'Esencial', precioMensual: 49, usuariosBase: 8, precioUsuarioExtra: 5, tiempoRespuesta: '24hs hábiles', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR'] },
    { id: 'PROFESIONAL', nombre: 'Profesional', precioMensual: 79, usuariosBase: 15, precioUsuarioExtra: 5, tiempoRespuesta: '12hs hábiles', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA'] },
    { id: 'ESCALA', nombre: 'Escala', precioMensual: 99, usuariosBase: 20, precioUsuarioExtra: 2, tiempoRespuesta: 'Atención Prioritaria', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA', 'COMPRAS_INSUMOS', 'TALLER_MOLDERIA'] },
    { id: 'TOTAL', nombre: 'Total', precioMensual: 199, usuariosBase: 50, precioUsuarioExtra: 0, tiempoRespuesta: 'Soporte VIP 24/7', modulos: ['VENTAS_PRECIOS', 'VENTAS_PRESUPUESTOS', 'VENTAS_POS_VENDEDOR', 'VENTAS_POS_CAJA', 'COMPRAS_INSUMOS', 'TALLER_MOLDERIA', 'RRHH_FICHADAS', 'ADMINISTRACION_MOVIMIENTOS'] }
  ]

  const activePlanes = planesData && planesData.length > 0 ? planesData : defaultMatrix

  const [matrix, setMatrix] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)

  const handleEdit = () => {
    setMatrix(JSON.parse(JSON.stringify(activePlanes)))
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const saveMut = useMutation({
    mutationFn: (data: any[]) => saasApi.updatePlanes(data),
    onSuccess: () => {
      toast.success('Matriz SaaS actualizada correctamente')
      refetch()
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Error al guardar la matriz')
    }
  })

  const handleSave = () => {
    saveMut.mutate(matrix)
  }

  const toggleModule = (planId: string, moduloId: string) => {
    if (!isEditing) return
    setMatrix(prev => prev.map(p => {
      if (p.id !== planId) return p
      const has = p.modulos.includes(moduloId)
      return {
        ...p,
        modulos: has ? p.modulos.filter((m: string) => m !== moduloId) : [...p.modulos, moduloId]
      }
    }))
  }

  const updatePlanField = (planId: string, field: string, value: any) => {
    setMatrix(prev => prev.map(p => p.id === planId ? { ...p, [field]: value } : p))
  }

  if (isLoading) return <div className="text-gray-500">Cargando matriz...</div>

  const planes = isEditing ? matrix : activePlanes

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900">Configuración de Planes SaaS</h2>
          <p className="text-sm text-gray-500">Administra los módulos y precios de cada plan de suscripción.</p>
        </div>
        {!isEditing ? (
          <button onClick={handleEdit} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100">
            <Edit3 size={16} /> Editar Matriz
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex items-center gap-2 bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-100">
              <X size={16} /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saveMut.isPending} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700">
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-y border-gray-200 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Módulo / Función</th>
              {planes.map(p => (
                <th key={p.id} className="px-4 py-3 text-center min-w-[150px]">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={p.nombre} 
                      onChange={e => updatePlanField(p.id, 'nombre', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-center font-bold"
                    />
                  ) : (
                    <span className="font-bold text-gray-900">{p.nombre}</span>
                  )}
                  
                  <div className="mt-2 text-gray-500 font-normal">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        $ <input type="number" value={p.precioMensual} onChange={e => updatePlanField(p.id, 'precioMensual', Number(e.target.value))} className="w-16 bg-white border border-gray-200 rounded px-1 py-0.5" />
                      </div>
                    ) : (
                      <>${p.precioMensual} USD</>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <td className="px-4 py-2 font-semibold text-gray-700">Configuración Base</td>
              <td colSpan={planes.length}></td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 pl-8 text-gray-600">Usuarios Incluidos</td>
              {planes.map(p => (
                <td key={p.id} className="px-4 py-2 text-center">
                  {isEditing ? (
                    <input type="number" value={p.usuariosBase} onChange={e => updatePlanField(p.id, 'usuariosBase', Number(e.target.value))} className="w-16 text-center border border-gray-200 rounded px-1" />
                  ) : (
                    <span>{p.usuariosBase}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 pl-8 text-gray-600">Costo Usuario Extra</td>
              {planes.map(p => (
                <td key={p.id} className="px-4 py-2 text-center">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-1">
                      $ <input type="number" value={p.precioUsuarioExtra} onChange={e => updatePlanField(p.id, 'precioUsuarioExtra', Number(e.target.value))} className="w-16 text-center border border-gray-200 rounded px-1" />
                    </div>
                  ) : (
                    <span>${p.precioUsuarioExtra}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 pl-8 text-gray-600">Tiempo de Respuesta</td>
              {planes.map(p => (
                <td key={p.id} className="px-4 py-2 text-center">
                  {isEditing ? (
                    <input type="text" value={p.tiempoRespuesta} onChange={e => updatePlanField(p.id, 'tiempoRespuesta', e.target.value)} className="w-full text-center border border-gray-200 rounded px-1 text-xs" />
                  ) : (
                    <span className="text-xs">{p.tiempoRespuesta}</span>
                  )}
                </td>
              ))}
            </tr>

            {CONFIG_MODULOS.map(group => (
              <optgroup key={group.id} label={group.label} className="contents">
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-900" colSpan={planes.length + 1}>
                    {group.label}
                  </td>
                </tr>
                {group.submodules.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2 pl-8 text-gray-600">
                      {sub.label}
                    </td>
                    {planes.map(p => {
                      const isActive = p.modulos.includes(sub.id)
                      return (
                        <td key={p.id} className="px-4 py-2 text-center" onClick={() => toggleModule(p.id, sub.id)}>
                          <div className={`mx-auto w-6 h-6 rounded flex items-center justify-center transition-colors ${isEditing ? 'cursor-pointer' : ''} ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-transparent'}`}>
                            <Check size={14} className={isActive ? 'opacity-100' : 'opacity-0'} />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </optgroup>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
