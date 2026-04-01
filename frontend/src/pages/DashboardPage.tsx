import { useQuery } from '@tanstack/react-query'
import { presupuestosApi } from '../lib/api'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export function DashboardPage() {
  const {data:presupuestos=[]} = useQuery({queryKey:['presupuestos'],queryFn:presupuestosApi.listar})

  const activos = presupuestos.filter((p:any)=>p.estado==='VIGENTE').length
  const enPedido = presupuestos.filter((p:any)=>p.estado==='PEDIDO').length
  const totalFacturado = presupuestos.filter((p:any)=>p.estado!=='CANCELADO').reduce((acc:number,p:any)=>acc+Number(p.total),0)
  const ultimos = [...presupuestos].slice(0,5)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-gray-900">Inicio</h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumen del negocio</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:'Presupuestos activos',val:activos,sub:'vigentes'},
          {label:'Pedidos en curso',val:enPedido,sub:'confirmados'},
          {label:'Total facturado',val:fmt(totalFacturado),sub:'todos los presupuestos'},
          {label:'Instituciones',val:'—',sub:'próximamente'},
        ].map(m=>(
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-xl font-medium text-gray-900">{m.val}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="text-sm font-medium text-gray-900">Últimos presupuestos</div>
        </div>
        {ultimos.length===0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin presupuestos todavía</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-50">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N°</th>
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Cliente</th>
              <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Total</th>
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Estado</th>
            </tr></thead>
            <tbody>
              {ultimos.map((p:any)=>(
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">#{p.numero}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{p.institucion?.nombre??p.clienteNombre??'—'}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{fmt(Number(p.total))}</td>
                  <td className="px-5 py-3"><span className="text-xs text-gray-500">{p.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
