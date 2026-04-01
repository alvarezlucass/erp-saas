import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insumosApi, type Insumo } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPOS = ['TELA','COSTURA','BORDADO','ACCESORIO','CIERRE','CUELLO','ESTAMPADO','QUEPIS']
const TIPO_COLOR: Record<string,string> = {
  TELA:'bg-teal-50 text-teal-800', COSTURA:'bg-blue-50 text-blue-800',
  BORDADO:'bg-amber-50 text-amber-800', ACCESORIO:'bg-orange-50 text-orange-800',
  CIERRE:'bg-purple-50 text-purple-800', CUELLO:'bg-pink-50 text-pink-800',
  ESTAMPADO:'bg-red-50 text-red-800', QUEPIS:'bg-gray-50 text-gray-700',
}
const fmt = (n: number|null) => n==null ? '—' : '$'+Math.round(n).toLocaleString('es-AR')

function HistorialModal({insumo,onClose}:{insumo:Insumo;onClose:()=>void}) {
  const {data:historial=[]} = useQuery({
    queryKey:['historial',insumo.id], queryFn:()=>insumosApi.historial(insumo.id)
  })
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-900">{insumo.nombre}</div>
            <div className="text-xs text-gray-400 mt-0.5">{insumo.tipo} · {insumo.categoria}</div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 max-h-80 overflow-y-auto">
          {historial.length===0 ? <p className="text-sm text-gray-400 text-center py-4">Sin historial</p> : (
            historial.map((h:any,i:number) => {
              const prev=historial[i+1]
              const pct=prev?Math.round(((h.costo-prev.costo)/prev.costo)*100):null
              return (
                <div key={h.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{fmt(h.costo)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{h.motivo||'Sin descripción'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{new Date(h.fechaDesde).toLocaleDateString('es-AR')}</div>
                    {pct!=null && <span className={`text-xs font-medium ${pct>0?'text-amber-600':'text-blue-600'}`}>{pct>0?'+':''}{pct}%</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function ActualizacionMasiva({onSuccess}:{onSuccess:()=>void}) {
  const [tipo,setTipo]=useState('')
  const [categoria,setCategoria]=useState('')
  const [pct,setPct]=useState('')
  const [motivo,setMotivo]=useState('')
  const [ok,setOk]=useState<{actualizados:number}|null>(null)
  const mutation=useMutation({
    mutationFn:()=>insumosApi.actualizarMasivo({porcentaje:parseFloat(pct),tipo:tipo||undefined,categoria:categoria||undefined,motivo:motivo||undefined}),
    onSuccess:(data)=>{setOk(data);onSuccess();setPct('');setMotivo('');setTimeout(()=>setOk(null),4000)}
  })
  const pctNum=parseFloat(pct)||0
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="text-sm font-medium text-gray-900 mb-4">Actualización masiva</div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo de insumo</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Todos los tipos</option>
            {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría (opcional)</label>
          <input value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="ej. Piquet, CHOMBA…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Porcentaje</label>
          <div className="relative">
            <input type="number" value={pct} onChange={e=>setPct(e.target.value)} placeholder="ej. 15" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            <span className="absolute right-3 top-2.5 text-xs text-gray-400">%</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo</label>
          <input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="ej. Aumento NORTEXTIL" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>
        {pctNum!==0 && <div className={`text-xs px-3 py-2.5 rounded-lg ${pctNum>0?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700'}`}><strong>{pctNum>0?'+':''}{pctNum}%</strong> sobre {tipo?tipo.toLowerCase():'todos los insumos'}{categoria?` · "${categoria}"`:''}.</div>}
        {ok && <div className="text-xs px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium">✓ {ok.actualizados} insumos actualizados</div>}
        {mutation.isError && <div className="text-xs px-3 py-2.5 rounded-lg bg-red-50 text-red-600">Error. Verificá el porcentaje.</div>}
        <button onClick={()=>mutation.mutate()} disabled={!pct||isNaN(pctNum)||mutation.isPending} className="w-full text-sm font-medium bg-gray-900 text-white rounded-lg py-2.5 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {mutation.isPending?'Aplicando…':'Aplicar actualización'}
        </button>
      </div>
    </div>
  )
}

export function InsumosPage() {
  const qc=useQueryClient()
  const [filtroTipo,setFiltroTipo]=useState('')
  const [buscar,setBuscar]=useState('')
  const [historialInsumo,setHistorialInsumo]=useState<Insumo|null>(null)
  const [editando,setEditando]=useState<Insumo|null>(null)
  const [nuevoCosto,setNuevoCosto]=useState('')
  const [motivoEdit,setMotivoEdit]=useState('')

  const {data:insumos=[],isLoading}=useQuery({
    queryKey:['insumos',filtroTipo,buscar],
    queryFn:()=>insumosApi.listar({tipo:filtroTipo||undefined,buscar:buscar||undefined})
  })

  const actualizarPrecio=useMutation({
    mutationFn:()=>insumosApi.actualizarPrecio(editando!.id,parseFloat(nuevoCosto),motivoEdit||undefined),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['insumos']});setEditando(null);setNuevoCosto('');setMotivoEdit('')}
  })

  const porTipo=insumos.reduce<Record<string,Insumo[]>>((acc,i)=>{ if(!acc[i.tipo])acc[i.tipo]=[]; acc[i.tipo].push(i); return acc },{})

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Insumos y costos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{insumos.length} insumos activos</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <ActualizacionMasiva onSuccess={()=>qc.invalidateQueries({queryKey:['insumos']})}/>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm font-medium text-gray-900 mb-3">Filtrar</div>
            <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar insumo…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={()=>setFiltroTipo('')} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filtroTipo===''?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-500 hover:border-gray-400'}`}>Todos</button>
              {TIPOS.map(t=><button key={t} onClick={()=>setFiltroTipo(filtroTipo===t?'':t)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filtroTipo===t?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-500 hover:border-gray-400'}`}>{t}</button>)}
            </div>
          </div>
        </div>
        <div className="col-span-2">
          {isLoading ? <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400">Cargando insumos…</div>
          : Object.keys(porTipo).length===0 ? <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400">No hay insumos con ese filtro</div>
          : <div className="space-y-4">
            {Object.entries(porTipo).map(([tipo,items])=>(
              <div key={tipo} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[tipo]??'bg-gray-50 text-gray-700'}`}>{tipo}</span>
                  <span className="text-xs text-gray-400">{items.length} insumos</span>
                </div>
                <table className="w-full">
                  <thead><tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Nombre</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Categoría</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-4 py-2.5">Costo actual</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-4 py-2.5">Actualizado</th>
                    <th className="px-4 py-2.5 w-28"></th>
                  </tr></thead>
                  <tbody>
                    {items.map(insumo=>(
                      <tr key={insumo.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{insumo.nombre}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{insumo.categoria}</td>
                        <td className="px-4 py-3 text-right">
                          {editando?.id===insumo.id ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <input type="number" value={nuevoCosto} onChange={e=>setNuevoCosto(e.target.value)} placeholder={String(Math.round(insumo.costoActual??0))} className="w-24 text-sm border border-blue-300 rounded-lg px-2 py-1 text-right focus:outline-none" autoFocus onKeyDown={e=>{if(e.key==='Enter'&&nuevoCosto)actualizarPrecio.mutate();if(e.key==='Escape')setEditando(null)}}/>
                              <input value={motivoEdit} onChange={e=>setMotivoEdit(e.target.value)} placeholder="Motivo…" className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"/>
                              <button onClick={()=>actualizarPrecio.mutate()} disabled={!nuevoCosto} className="text-xs text-white bg-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-40">✓</button>
                              <button onClick={()=>setEditando(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                          ) : <span className="text-sm font-medium text-gray-900">{fmt(insumo.costoActual)}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 text-right whitespace-nowrap">
                          {insumo.ultimaActualizacion ? formatDistanceToNow(new Date(insumo.ultimaActualizacion),{addSuffix:true,locale:es}) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={()=>{setEditando(insumo);setNuevoCosto('');setMotivoEdit('')}} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">Editar</button>
                            <span className="text-gray-200">·</span>
                            <button onClick={()=>setHistorialInsumo(insumo)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Historial</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>}
        </div>
      </div>
      {historialInsumo && <HistorialModal insumo={historialInsumo} onClose={()=>setHistorialInsumo(null)}/>}
    </div>
  )
}
