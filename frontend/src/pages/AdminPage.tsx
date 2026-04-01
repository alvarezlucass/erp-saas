import { useState } from 'react'
import { formatCurrency } from '../lib/utils'

const MOVIMIENTOS_DEMO = [
  { id: '1', fecha: '2025-03-28', concepto: 'Cobro Silos — seña pedido 14', cuenta: 'Caja ahorro',      importe:  500000, tipo: 'COBRO' },
  { id: '2', fecha: '2025-03-25', concepto: 'Pago NORTEXTIL — telas',        cuenta: 'Cta. corriente', importe: -280000, tipo: 'PAGO_PROVEEDOR' },
  { id: '3', fecha: '2025-03-22', concepto: 'Cobro Vicenta — saldo ord. 12', cuenta: 'Caja ahorro',      importe:  230000, tipo: 'COBRO' },
  { id: '4', fecha: '2025-03-20', concepto: 'Sueldos taller — quincena',     cuenta: 'Cta. corriente', importe: -190000, tipo: 'GASTO' },
  { id: '5', fecha: '2025-03-18', concepto: 'Cobro San Ignacio',             cuenta: 'Efectivo',       importe:  145000, tipo: 'COBRO' },
  { id: '6', fecha: '2025-03-15', concepto: 'Insumos bordado',               cuenta: 'Cta. corriente', importe:  -42000, tipo: 'GASTO' },
]

const TIPO_MOV_COLOR: Record<string, string> = {
  COBRO:          'text-teal-600',
  PAGO_PROVEEDOR: 'text-red-500',
  GASTO:          'text-orange-500',
  SENIA:          'text-blue-500',
  TRANSFERENCIA:  'text-purple-500',
}

const TIPOS_MOV = ['COBRO', 'PAGO_PROVEEDOR', 'GASTO', 'SENIA', 'TRANSFERENCIA']
const CUENTAS   = ['Caja ahorro', 'Cta. corriente', 'Efectivo']

export function AdminPage() {
  const [movimientos, setMovimientos] = useState(MOVIMIENTOS_DEMO)
  const [filtro, setFiltro] = useState('')

  // Form nuevo movimiento
  const [tipo, setTipo]         = useState('COBRO')
  const [cuenta, setCuenta]     = useState('Caja ahorro')
  const [concepto, setConcepto] = useState('')
  const [importe, setImporte]   = useState('')

  const total = movimientos.reduce((acc, m) => acc + m.importe, 0)
  const cobros = movimientos.filter(m => m.importe > 0).reduce((acc, m) => acc + m.importe, 0)
  const egresos = movimientos.filter(m => m.importe < 0).reduce((acc, m) => acc + m.importe, 0)

  function registrar() {
    if (!concepto || !importe) return
    const signo = ['COBRO', 'SENIA'].includes(tipo) ? 1 : -1
    setMovimientos(m => [{
      id: String(Date.now()),
      fecha: new Date().toISOString().split('T')[0],
      concepto, cuenta,
      importe: Math.abs(Number(importe)) * signo,
      tipo,
    }, ...m])
    setConcepto('')
    setImporte('')
  }

  const visibles = filtro
    ? movimientos.filter(m => m.concepto.toLowerCase().includes(filtro.toLowerCase()) || m.cuenta.includes(filtro))
    : movimientos

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-medium text-gray-900">Administración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Movimientos de cuentas y gastos</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ingresos',          val: cobros,   color: 'text-teal-600' },
          { label: 'Egresos',           val: Math.abs(egresos), color: 'text-red-500' },
          { label: 'Balance del período', val: total,    color: total >= 0 ? 'text-teal-600' : 'text-red-500' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className={`text-xl font-medium ${m.color}`}>
              {total < 0 && m.label === 'Balance del período' ? '-' : ''}{formatCurrency(Math.abs(m.val))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Formulario imputación */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm font-medium text-gray-900 mb-4">Registrar movimiento</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300">
                  {TIPOS_MOV.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Cuenta</label>
                <select value={cuenta} onChange={e => setCuenta(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300">
                  {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Concepto</label>
                <input value={concepto} onChange={e => setConcepto(e.target.value)}
                  placeholder="Descripción del movimiento..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Importe</label>
                <input type="number" value={importe} onChange={e => setImporte(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300" />
              </div>
              <button
                onClick={registrar}
                disabled={!concepto || !importe}
                className="w-full py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="text-sm font-medium text-gray-900">Movimientos</div>
              <input
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                placeholder="Buscar..."
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Concepto</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Cuenta</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibles.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{m.concepto}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{m.cuenta}</td>
                    <td className={`px-5 py-3 text-right font-medium font-mono ${TIPO_MOV_COLOR[m.tipo]}`}>
                      {m.importe > 0 ? '+' : ''}{formatCurrency(m.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

