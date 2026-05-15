import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  DollarSign, 
  User,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react'
import { finanzasApi, MovimientoCC, Cliente } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CuentaCorrientePage() {
  const { tipo, id } = useParams<{ tipo: 'cliente' | 'proveedor', id: string }>()
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState<MovimientoCC[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (tipo && id) {
      loadData()
    }
  }, [tipo, id])

  async function loadData() {
    try {
      const data = await finanzasApi.obtenerCuentaCorriente(tipo!, id!)
      setMovimientos(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const saldoActual = movimientos.length > 0 ? movimientos[0].saldoResultante : 0

  const filteredMovimientos = movimientos.filter(m => 
    m.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3 italic">
              CUENTA CORRIENTE
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-1 bg-zinc-900 px-2 py-0.5 rounded w-fit">
              Gestión de Saldos y Movimientos
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-700 opacity-50" />
          <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <DollarSign className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Actual</p>
            <h3 className={`text-3xl font-black tracking-tighter ${saldoActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              $ {saldoActual.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
          <input 
            type="text"
            placeholder="Buscar por concepto o comprobante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-all"
          />
        </div>
        <button className="bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl text-zinc-400 hover:text-white flex items-center gap-2 font-black text-xs tracking-widest transition-all">
          <Filter className="w-4 h-4" />
          FILTRAR
        </button>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/20">
              <th className="p-6 text-zinc-500 font-black text-[10px] uppercase tracking-widest">Fecha</th>
              <th className="p-6 text-zinc-500 font-black text-[10px] uppercase tracking-widest">Concepto / Comprobante</th>
              <th className="p-6 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right">Debe (+)</th>
              <th className="p-6 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right">Haber (-)</th>
              <th className="p-6 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredMovimientos.map((mov) => (
              <tr key={mov.id} className="group hover:bg-zinc-800/20 transition-all">
                <td className="p-6">
                  <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs">
                    <Calendar className="w-4 h-4 opacity-50" />
                    {format(new Date(mov.fecha), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${mov.tipo === 'DEBE' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {mov.tipo === 'DEBE' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-white font-black text-sm uppercase tracking-tight block">
                        {mov.descripcion || 'Sin concepto'}
                      </span>
                      {mov.comprobante && (
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1 block">
                          Ref: {mov.comprobante.tipo} #{mov.comprobante.numero}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <span className={`text-sm font-black ${mov.tipo === 'DEBE' ? 'text-white' : 'text-zinc-700'}`}>
                    {mov.tipo === 'DEBE' ? `$ ${mov.importe.toLocaleString()}` : '-'}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <span className={`text-sm font-black ${mov.tipo === 'HABER' ? 'text-emerald-400' : 'text-zinc-700'}`}>
                    {mov.tipo === 'HABER' ? `$ ${mov.importe.toLocaleString()}` : '-'}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <span className={`text-sm font-black tracking-tighter ${mov.saldoResultante >= 0 ? 'text-white' : 'text-red-400'}`}>
                    $ {mov.saldoResultante.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}

            {filteredMovimientos.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-32 text-center">
                  <div className="flex flex-col items-center gap-6 text-zinc-700">
                    <FileText className="w-20 h-20 opacity-10" />
                    <p className="font-black uppercase tracking-[0.2em] text-sm italic">Sin movimientos registrados</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
