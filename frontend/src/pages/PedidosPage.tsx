import { useState } from 'react'
import { formatCurrency, estadoColor } from '../lib/utils'

const ETAPAS = ['CORTE', 'BORDADO', 'COSTURA', 'TERMINADO'] as const
type Etapa = typeof ETAPAS[number]

const ETAPA_LABEL: Record<Etapa, string> = {
  CORTE:     'Corte',
  BORDADO:   'Bordado',
  COSTURA:   'Costura',
  TERMINADO: 'Terminado',
}

// Pedidos demo hasta que haya datos reales
const PEDIDOS_DEMO = [
  { id: '1', numero: 14, cliente: 'Silos',   unidades: 135, total: 152076407, etapa: 'CORTE'    as Etapa, fechaEntrega: '2025-06-19', tipo: 'Colegios' },
  { id: '2', numero: 13, cliente: 'Vicenta', unidades: 106, total: 2298414,   etapa: 'BORDADO'  as Etapa, fechaEntrega: '2025-06-14', tipo: 'Col. Rev.' },
  { id: '3', numero: 12, cliente: 'Vicenta', unidades: 229, total: 8400000,   etapa: 'COSTURA'  as Etapa, fechaEntrega: '2025-06-10', tipo: 'Col. Rev.' },
  { id: '4', numero: 11, cliente: 'S. Ignacio', unidades: 87, total: 1950000, etapa: 'TERMINADO' as Etapa, fechaEntrega: '2025-05-30', tipo: 'Colegios' },
]

const TIPO_COLOR: Record<string, string> = {
  'Colegios':  'bg-blue-50 text-blue-700',
  'Col. Rev.': 'bg-teal-50 text-teal-700',
  'Empresas':  'bg-purple-50 text-purple-700',
}

export function PedidosPage() {
  const [pedidos, setPedidos] = useState(PEDIDOS_DEMO)
  const [selected, setSelected] = useState(PEDIDOS_DEMO[0])

  function moverEtapa(id: string, etapa: Etapa) {
    setPedidos(p => p.map(x => x.id === id ? { ...x, etapa } : x))
    if (selected?.id === id) setSelected(s => ({ ...s, etapa }))
  }

  const porEtapa = (etapa: Etapa) => pedidos.filter(p => p.etapa === etapa)

  const diasHasta = (fecha: string) => {
    const diff = new Date(fecha).getTime() - Date.now()
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return dias
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Pedidos y órdenes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{pedidos.length} pedidos activos</p>
        </div>
        <button className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
          + Nueva orden
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-3">
        {ETAPAS.map(etapa => (
          <div key={etapa} className="bg-gray-50/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-600">{ETAPA_LABEL[etapa]}</span>
              <span className="text-xs bg-white border border-gray-200 text-gray-400 rounded-full px-2 py-0.5">
                {porEtapa(etapa).length}
              </span>
            </div>
            <div className="space-y-2">
              {porEtapa(etapa).map(pedido => {
                const dias = diasHasta(pedido.fechaEntrega)
                return (
                  <div
                    key={pedido.id}
                    onClick={() => setSelected(pedido)}
                    className={`bg-white rounded-lg border p-3 cursor-pointer transition-all ${
                      selected?.id === pedido.id ? 'border-gray-400 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-900">ORD {pedido.numero} · {pedido.cliente}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{pedido.unidades} unidades</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TIPO_COLOR[pedido.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                        {pedido.tipo}
                      </span>
                      <span className={`text-xs ${dias < 7 ? 'text-red-500 font-medium' : dias < 14 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detalle del pedido seleccionado */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <div className="text-sm font-medium text-gray-900">
                ORD {selected.numero} · {selected.cliente}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {selected.unidades} unidades · entrega {new Date(selected.fechaEntrega).toLocaleDateString('es-AR')}
              </div>
            </div>
            {/* Avanzar/retroceder etapa */}
            <div className="flex gap-2">
              {ETAPAS.indexOf(selected.etapa) > 0 && (
                <button
                  onClick={() => moverEtapa(selected.id, ETAPAS[ETAPAS.indexOf(selected.etapa) - 1])}
                  className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                >
                  ← Retroceder
                </button>
              )}
              {ETAPAS.indexOf(selected.etapa) < ETAPAS.length - 1 && (
                <button
                  onClick={() => moverEtapa(selected.id, ETAPAS[ETAPAS.indexOf(selected.etapa) + 1])}
                  className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Avanzar a {ETAPA_LABEL[ETAPAS[ETAPAS.indexOf(selected.etapa) + 1]]} →
                </button>
              )}
            </div>
          </div>

          {/* Progreso visual */}
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-0">
              {ETAPAS.map((etapa, i) => {
                const currentIdx = ETAPAS.indexOf(selected.etapa)
                const done = i < currentIdx
                const active = i === currentIdx
                return (
                  <div key={etapa} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                      done ? 'bg-teal-500 text-white' :
                      active ? 'bg-gray-900 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`ml-2 text-xs ${active ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                      {ETAPA_LABEL[etapa]}
                    </span>
                    {i < ETAPAS.length - 1 && (
                      <div className={`flex-1 h-px mx-3 ${done ? 'bg-teal-300' : 'bg-gray-100'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info del pedido */}
          <div className="px-5 py-4 grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total del pedido</div>
              <div className="font-medium text-gray-900">{formatCurrency(selected.total)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Fecha de entrega</div>
              <div className="font-medium text-gray-900">
                {new Date(selected.fechaEntrega).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Estado actual</div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor(selected.etapa)}`}>
                {ETAPA_LABEL[selected.etapa]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

