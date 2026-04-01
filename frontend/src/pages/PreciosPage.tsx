import { useState } from 'react'
import { formatCurrency } from '../lib/utils'

// Datos de lista de precios reales extraídos de los Excel
const LISTAS_DEMO: Record<string, { producto: string; talles: { talle: string; precio: number; margen: number }[] }[]> = {
  'San Ignacio': [
    { producto: 'Chomba M/C', talles: [
      { talle: '2-4', precio: 23600, margen: 0.509 }, { talle: '6-8',   precio: 24100, margen: 0.511 },
      { talle: '10-12', precio: 26500, margen: 0.498 }, { talle: '14-16', precio: 28100, margen: 0.492 },
      { talle: 'S', precio: 32300, margen: 0.471 }, { talle: 'M-L', precio: 32300, margen: 0.471 },
    ]},
    { producto: 'Chomba M/L', talles: [
      { talle: '2-4', precio: 24700, margen: 0.48 }, { talle: '6-8', precio: 26200, margen: 0.47 },
      { talle: '10-12', precio: 27600, margen: 0.46 }, { talle: '14-16', precio: 29100, margen: 0.45 },
    ]},
    { producto: 'Remera M/C', talles: [
      { talle: '2-4', precio: 23200, margen: 0.50 }, { talle: '6-8', precio: 23800, margen: 0.50 },
      { talle: '10-12', precio: 24200, margen: 0.49 }, { talle: '14-16', precio: 24900, margen: 0.49 },
    ]},
  ],
  'Eco Jardín y Primaria': [
    { producto: 'Chomba M/C', talles: [
      { talle: '2-4', precio: 24900, margen: 0.41 }, { talle: '6-8', precio: 25300, margen: 0.41 },
      { talle: '10-12', precio: 27400, margen: 0.40 }, { talle: '14-16', precio: 29100, margen: 0.39 },
    ]},
    { producto: 'Chomba M/L', talles: [
      { talle: '2-4', precio: 26400, margen: 0.39 }, { talle: '6-8', precio: 27400, margen: 0.39 },
    ]},
    { producto: 'Remera M/C', talles: [
      { talle: '10-12', precio: 25300, margen: 0.48 }, { talle: '14-16', precio: 25900, margen: 0.47 },
    ]},
  ],
  'Amanecer': [
    { producto: 'Chomba M/C', talles: [
      { talle: '6-8', precio: 24400, margen: 0.50 }, { talle: '10-12', precio: 26900, margen: 0.49 },
      { talle: '14-16', precio: 28200, margen: 0.48 },
    ]},
    { producto: 'Remera M/C', talles: [
      { talle: '6-8', precio: 24100, margen: 0.50 }, { talle: '10-12', precio: 24300, margen: 0.49 },
    ]},
  ],
  'Palabras': [
    { producto: 'Chomba M/C', talles: [
      { talle: '6-8', precio: 24400, margen: 0.50 }, { talle: '10-12', precio: 26700, margen: 0.48 },
      { talle: '14-16', precio: 28200, margen: 0.47 },
    ]},
    { producto: 'Chomba M/L', talles: [
      { talle: '6-8', precio: 25900, margen: 0.43 }, { talle: '10-12', precio: 28400, margen: 0.42 },
    ]},
  ],
}

const INSTITUCIONES = Object.keys(LISTAS_DEMO)

const COMPARATIVO = [
  { talle: '2-4',   si: 23600, eco: 24900, amanecer: null,  palabras: null  },
  { talle: '6-8',   si: 24100, eco: 25300, amanecer: 24400, palabras: 24400 },
  { talle: '10-12', si: 26500, eco: 27400, amanecer: 26900, palabras: 26700 },
  { talle: '14-16', si: 28100, eco: 29100, amanecer: 28200, palabras: 28200 },
]

function margenColor(m: number) {
  if (m >= 0.50) return 'bg-teal-50 text-teal-800'
  if (m >= 0.40) return 'bg-blue-50 text-blue-700'
  return 'bg-amber-50 text-amber-700'
}

export function PreciosPage() {
  const [inst, setInst] = useState('San Ignacio')
  const [vistaInterna, setVistaInterna] = useState(false)
  const lista = LISTAS_DEMO[inst] ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Listas de precios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Precios por institución · actualizados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVistaInterna(v => !v)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              vistaInterna ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {vistaInterna ? 'Vista interna' : 'Vista pública'}
          </button>
          <button className="px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 transition-colors">
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Selector instituciones */}
      <div className="flex gap-2 flex-wrap">
        {INSTITUCIONES.map(i => (
          <button
            key={i}
            onClick={() => setInst(i)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              inst === i ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {i}
          </button>
        ))}
        <button className="px-3 py-1.5 text-sm rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
          + Nueva institución
        </button>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Lista principal */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">{inst}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {vistaInterna ? 'Vista interna — costos y márgenes visibles' : 'Lista pública — solo precios'}
                </div>
              </div>
            </div>

            {lista.map(({ producto, talles }) => (
              <div key={producto}>
                <div className="px-5 py-2.5 bg-gray-50/60 border-b border-gray-50">
                  <span className="text-xs font-medium text-gray-600">{producto}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs font-medium text-gray-400 px-5 py-2">Talle</th>
                      <th className="text-right text-xs font-medium text-gray-400 px-5 py-2">Precio público</th>
                      {vistaInterna && <>
                        <th className="text-right text-xs font-medium text-gray-400 px-5 py-2">Margen</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {talles.map(({ talle, precio, margen }) => (
                      <tr key={talle} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{talle}</td>
                        <td className="px-5 py-2.5 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(precio)}
                        </td>
                        {vistaInterna && (
                          <td className="px-5 py-2.5 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${margenColor(margen)}`}>
                              {(margen * 100).toFixed(1)}%
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativo */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="text-sm font-medium text-gray-900">Comparativo</div>
              <div className="text-xs text-gray-400 mt-0.5">Chomba M/C · entre instituciones</div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left font-medium text-gray-400 px-4 py-2.5">Talle</th>
                  <th className="text-right font-medium text-gray-400 px-2 py-2.5">S.I.</th>
                  <th className="text-right font-medium text-gray-400 px-2 py-2.5">Eco</th>
                  <th className="text-right font-medium text-gray-400 px-2 py-2.5">Amanecer</th>
                  <th className="text-right font-medium text-gray-400 px-2 py-2.5">Palabras</th>
                </tr>
              </thead>
              <tbody>
                {COMPARATIVO.map(row => {
                  const precios = [row.si, row.eco, row.amanecer, row.palabras].filter(Boolean) as number[]
                  const min = Math.min(...precios)
                  const max = Math.max(...precios)
                  return (
                    <tr key={row.talle} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.talle}</td>
                      {[row.si, row.eco, row.amanecer, row.palabras].map((p, i) => (
                        <td key={i} className={`px-2 py-2.5 text-right font-medium ${
                          p == null ? 'text-gray-200' :
                          p === min ? 'text-teal-600' :
                          p === max ? 'text-amber-600' : 'text-gray-700'
                        }`}>
                          {p ? '$' + (p / 1000).toFixed(1) + 'k' : '—'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-50 flex gap-3">
              <span className="flex items-center gap-1 text-xs text-teal-600"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />Más bajo</span>
              <span className="flex items-center gap-1 text-xs text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Más alto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

