import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insumosApi, inventarioApi, proveedoresApi, Insumo } from '../lib/api'
import StockTraceabilityCard from '../components/StockTraceabilityCard'

export function InventarioPage() {
  const qc = useQueryClient()
  const { data: insumos = [], isLoading } = useQuery({ 
    queryKey: ['insumos'], 
    queryFn: () => insumosApi.listar() 
  })

  const [selInsumo, setSelInsumo] = useState<Insumo | null>(null)
  const [ajuste, setAjuste] = useState({ cantidad: 0, tipo: 'INGRESO' as 'INGRESO' | 'EGRESO' | 'AJUSTE', motivo: '', costoUnitario: 0, proveedorId: '' })

  const { data: todosProveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: () => proveedoresApi.listar() })

  const mutAjuste = useMutation({
    mutationFn: (data: any) => inventarioApi.ajustarInsumo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      setSelInsumo(null)
      setAjuste({ cantidad: 0, tipo: 'INGRESO', motivo: '', costoUnitario: 0, proveedorId: '' })
    }
  })

  if (isLoading) return <div className="p-8 text-center text-gray-400 font-medium">Cargando inventario...</div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Control de Stock Técnico</h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Gestión de Insumos y Materias Primas</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Insumo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Stock Actual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Estado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {insumos.map(insumo => {
                const esBajo = (insumo.stockActual || 0) <= (insumo.stockMinimo || 0)
                return (
                  <tr key={insumo.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{insumo.nombre}</div>
                      <div className="text-[10px] text-gray-400 font-medium font-mono">{insumo.codigoInterno || 'SIN-COD'}</div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">{insumo.categoria}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-black ${esBajo ? 'text-red-500' : 'text-emerald-600'}`}>
                        {insumo.stockActual || 0}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{insumo.unidad}</span>
                    </td>
                    <td className="px-6 py-4">
                      {esBajo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-600 uppercase border border-red-100">Stock Crítico</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">Óptimo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        onClick={() => setSelInsumo(insumo)}
                        className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 opacity-0 group-hover:opacity-100"
                       >Ajustar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Adjustment Panel */}
        <div className="space-y-6">
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
              <h3 className="text-xs font-black uppercase text-gray-900 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                Ajuste de Existencias
              </h3>
              
              {!selInsumo ? (
                <div className="py-12 text-center">
                   <div className="text-4xl mb-3 opacity-20">📦</div>
                   <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase">Selecciona un insumo de la lista<br/>para realizar un movimiento</p>
                </div>
              ) : (
                <div className="space-y-5">
                   <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-50">
                      <div className="text-[10px] font-medium text-indigo-400 uppercase tracking-widest mb-1">Insumo Seleccionado</div>
                      <div className="text-sm font-black text-indigo-900">{selInsumo.nombre}</div>
                      <div className="text-[10px] font-bold text-indigo-500/70 mt-1 uppercase">Stock Actual: {selInsumo.stockActual} {selInsumo.unidad}</div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">Tipo de Movimiento</label>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => setAjuste({...ajuste, tipo: 'INGRESO'})}
                            className={`py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${ajuste.tipo === 'INGRESO' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200 hover:text-emerald-600'}`}
                         >Ingreso (+)</button>
                         <button 
                            onClick={() => setAjuste({...ajuste, tipo: 'EGRESO'})}
                            className={`py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${ajuste.tipo === 'EGRESO' ? 'bg-red-600 text-white border-red-600 shadow-lg scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 hover:border-red-200 hover:text-red-600'}`}
                         >Egreso (-)</button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">Cantidad</label>
                        <input 
                          type="number" 
                          value={ajuste.cantidad} 
                          onChange={e => setAjuste({...ajuste, cantidad: parseFloat(e.target.value) || 0})}
                          className="w-full text-lg font-black bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/10"
                        />
                      </div>
                      <div className="flex items-end">
                         <div className="text-[10px] font-bold text-gray-400 pb-3 uppercase italic">unidades: {selInsumo.unidad}</div>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">Motivo o Referencia</label>
                      <textarea 
                        value={ajuste.motivo}
                        onChange={e => setAjuste({...ajuste, motivo: e.target.value})}
                        placeholder="Ej: Compra factura #334, Rotura, etc."
                        rows={2}
                        className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-indigo-500/10 resize-none"
                      />
                   </div>

                   {ajuste.tipo === 'INGRESO' && (
                     <div className="space-y-4 pt-2 border-t border-dashed border-gray-100 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[10px] font-black uppercase text-indigo-500 mb-2 tracking-widest">Costo Unitario ($)</label>
                              <input 
                                 type="number" step="0.01"
                                 value={ajuste.costoUnitario} 
                                 onChange={e => setAjuste({...ajuste, costoUnitario: parseFloat(e.target.value) || 0})}
                                 className="w-full text-sm font-black bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/20 text-indigo-700"
                              />
                           </div>
                           <div className="flex items-center">
                              <p className="text-[9px] font-bold text-indigo-300 uppercase leading-tight italic">Este valor actualizará automáticamente el costo actual del insumo.</p>
                           </div>
                        </div>

                        <div>
                           <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2">Proveedor de Origen</label>
                           <select 
                              value={ajuste.proveedorId} 
                              onChange={e => setAjuste({...ajuste, proveedorId: e.target.value})}
                              className="w-full text-[11px] font-black uppercase bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none"
                           >
                              <option value="">Seleccionar Proveedor...</option>
                              {todosProveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                           </select>
                        </div>
                     </div>
                   )}

                   <div className="pt-2 flex gap-2">
                      <button 
                        onClick={() => setSelInsumo(null)}
                        className="flex-1 py-3 text-[10px] font-black uppercase bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                      >Cancelar</button>
                      <button 
                        onClick={() => mutAjuste.mutate({ insumoId: selInsumo.id, ...ajuste })}
                        disabled={mutAjuste.isPending || ajuste.cantidad <= 0}
                        className="flex-[2] py-3 text-[10px] font-black uppercase bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                      >Confirmar Movimiento</button>
                   </div>
                </div>
              )}
            </div>

           {/* Traceability Ficha */}
           {selInsumo && (
             <StockTraceabilityCard 
               insumoId={selInsumo.id} 
               title={`Historial: ${selInsumo.nombre}`}
             />
           )}
        </div>
      </div>
    </div>
  )
}
