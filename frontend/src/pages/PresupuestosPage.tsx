import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presupuestosApi, institucionesApi } from '../lib/api'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const ESTADO_COLOR: Record<string,string> = {
  VIGENTE:'bg-blue-50 text-blue-700', PEDIDO:'bg-teal-50 text-teal-700',
  CERRADO:'bg-gray-50 text-gray-500', CANCELADO:'bg-red-50 text-red-600'
}
const MODOS_PAGO = ['TRANSFERENCIA','EFECTIVO','TARJETA']

interface Linea { productoNombre:string; talle:string; bordado?:string; cantidad:number; precioUnitario:number; precioBordado:number; precioEstampado:number }

function NuevoPresupuesto({onClose}:{onClose:()=>void}) {
  const qc = useQueryClient()
  const {data:instituciones=[]} = useQuery({queryKey:['instituciones'],queryFn:institucionesApi.listar})
  const [institucionId,setInstitucionId] = useState('')
  const [clienteNombre,setClienteNombre] = useState('')
  const [modoPago,setModoPago] = useState('TRANSFERENCIA')
  const [senia,setSenia] = useState('')
  const [notas,setNotas] = useState('')
  const [lineas,setLineas] = useState<Linea[]>([{productoNombre:'',talle:'',bordado:'',cantidad:1,precioUnitario:0,precioBordado:0,precioEstampado:0}])

  const addLinea = () => setLineas(l=>[...l,{productoNombre:'',talle:'',bordado:'',cantidad:1,precioUnitario:0,precioBordado:0,precioEstampado:0}])
  const removeLinea = (i:number) => setLineas(l=>l.filter((_,idx)=>idx!==i))
  const updateLinea = (i:number, field:string, value:any) => setLineas(l=>l.map((item,idx)=>idx===i?{...item,[field]:value}:item))

  const subtotal = lineas.reduce((acc,l)=>(l.precioUnitario+l.precioBordado+l.precioEstampado)*l.cantidad+acc, 0)

  const mutation = useMutation({
    mutationFn: () => presupuestosApi.crear({
      institucionId: institucionId||undefined,
      clienteNombre: clienteNombre||undefined,
      modoPago, senia: parseFloat(senia)||0, notas: notas||undefined,
      lineas: lineas.filter(l=>l.productoNombre&&l.precioUnitario>0).map(l=>({
        productoNombre:l.productoNombre, talle:l.talle, bordado:l.bordado||undefined,
        cantidad:l.cantidad, precioUnitario:l.precioUnitario, precioBordado:l.precioBordado, precioEstampado:l.precioEstampado
      }))
    }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['presupuestos']}); onClose() }
  })

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900">Nuevo presupuesto</div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Institución</label>
              <select value={institucionId} onChange={e=>setInstitucionId(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">Sin institución</option>
                {instituciones.map((i:any)=><option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente / nombre</label>
              <input value={clienteNombre} onChange={e=>setClienteNombre(e.target.value)} placeholder="ej. Lucas Álvarez" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Modo de pago</label>
              <select value={modoPago} onChange={e=>setModoPago(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100">
                {MODOS_PAGO.map(m=><option key={m} value={m}>{m.charAt(0)+m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Seña</label>
              <input type="number" value={senia} onChange={e=>setSenia(e.target.value)} placeholder="$0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            </div>
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Productos</label>
              <button onClick={addLinea} className="text-xs text-blue-600 hover:text-blue-800">+ Agregar línea</button>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Producto</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2 w-16">Talle</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Bordado</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-2 w-10">Cant.</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">P. Unit.</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">Bordado $</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">Subtotal</th>
                    <th className="px-2 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l,i)=>{
                    const sub=(l.precioUnitario+l.precioBordado)*l.cantidad
                    return (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-2"><input value={l.productoNombre} onChange={e=>updateLinea(i,'productoNombre',e.target.value)} placeholder="Chomba M/C…" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2"><input value={l.talle} onChange={e=>updateLinea(i,'talle',e.target.value)} placeholder="6-8" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2"><input value={l.bordado||''} onChange={e=>updateLinea(i,'bordado',e.target.value)} placeholder="Solo frente…" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2"><input type="number" value={l.cantidad} min={1} onChange={e=>updateLinea(i,'cantidad',parseInt(e.target.value)||1)} className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2"><input type="number" value={l.precioUnitario||''} onChange={e=>updateLinea(i,'precioUnitario',parseFloat(e.target.value)||0)} placeholder="0" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2"><input type="number" value={l.precioBordado||''} onChange={e=>updateLinea(i,'precioBordado',parseFloat(e.target.value)||0)} placeholder="0" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-right focus:outline-none focus:border-blue-300"/></td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900 text-right whitespace-nowrap">{sub>0?fmt(sub):'—'}</td>
                        <td className="px-2 py-2"><button onClick={()=>removeLinea(i)} className="text-gray-300 hover:text-red-400 text-sm">×</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas internas</label>
            <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Observaciones, colores, instrucciones especiales…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"/>
          </div>
        </div>

        {/* Footer con total */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-gray-400">Subtotal</div>
              <div className="text-base font-medium text-gray-900">{fmt(subtotal)}</div>
            </div>
            {parseFloat(senia)>0 && <div>
              <div className="text-xs text-gray-400">Resto</div>
              <div className="text-sm font-medium text-gray-700">{fmt(subtotal-(parseFloat(senia)||0))}</div>
            </div>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 transition-colors">Cancelar</button>
            <button onClick={()=>mutation.mutate()} disabled={lineas.every(l=>!l.productoNombre)||mutation.isPending} className="text-sm px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors font-medium">
              {mutation.isPending?'Guardando…':'Guardar presupuesto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PresupuestosPage() {
  const [nuevo,setNuevo] = useState(false)
  const {data:presupuestos=[],isLoading} = useQuery({
    queryKey:['presupuestos'], queryFn:presupuestosApi.listar
  })

  const totalUnidades = presupuestos.reduce((acc:number,p:any)=>acc+(p.lineas?.reduce((s:number,l:any)=>s+l.cantidad,0)??0),0)
  const totalFacturado = presupuestos.filter((p:any)=>p.estado!=='CANCELADO').reduce((acc:number,p:any)=>acc+Number(p.total),0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Presupuestos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{presupuestos.length} presupuestos</p>
        </div>
        <button onClick={()=>setNuevo(true)} className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          + Nuevo presupuesto
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {label:'Presupuestos activos', val:presupuestos.filter((p:any)=>p.estado==='VIGENTE').length, sub:'vigentes'},
          {label:'Unidades totales', val:totalUnidades.toLocaleString('es-AR'), sub:'en todos los presupuestos'},
          {label:'Total facturado', val:fmt(totalFacturado), sub:'excluyendo cancelados'},
        ].map(m=>(
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-xl font-medium text-gray-900">{m.val}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-400">Cargando presupuestos…</div>
        ) : presupuestos.length===0 ? (
          <div className="p-10 text-center">
            <div className="text-sm text-gray-400 mb-3">Todavía no hay presupuestos</div>
            <button onClick={()=>setNuevo(true)} className="text-sm text-blue-600 hover:text-blue-800">Crear el primero →</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N°</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Fecha</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Unidades</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Modo pago</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.map((p:any)=>{
                const unidades=p.lineas?.reduce((s:number,l:any)=>s+l.cantidad,0)??0
                const cliente=p.institucion?.nombre ?? p.clienteNombre ?? '—'
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">#{p.numero}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-900">{cliente}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(p.creadoEn).toLocaleDateString('es-AR')}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 text-right">{unidades}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 text-right">{fmt(Number(p.total))}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{p.modoPago.charAt(0)+p.modoPago.slice(1).toLowerCase()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado]??'bg-gray-50 text-gray-500'}`}>
                        {p.estado.charAt(0)+p.estado.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {nuevo && <NuevoPresupuesto onClose={()=>setNuevo(false)}/>}
    </div>
  )
}
