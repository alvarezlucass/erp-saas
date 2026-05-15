import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presupuestosApi, api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Wallet, CreditCard, Banknote, QrCode, CheckCircle2, XCircle, Receipt, ArrowRight, Printer, Search } from 'lucide-react'

const StatCard = ({ label, value, icon, color }: any) => (
  <div className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-50 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-xl shadow-inner`}>
      {icon}
    </div>
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
      <div className="text-2xl font-black text-gray-900 leading-none mt-1">{value}</div>
    </div>
  </div>
)

export default function PuntoVentaCajeroPage() {
  const qc = useQueryClient()
  
  // -- CAJERO STATE --
  const [presupuestoCaja, setPresupuestoCaja] = useState<any>(null)
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [cuotas, setCuotas] = useState(1)
  const [recargoPct, setRecargoPct] = useState(0)
  const [descuento, setDescuento] = useState(0)
  const [cuentaId, setCuentaId] = useState('')

  // -- DATA FETCHING --
  const { data: presupuestosBorradores = [] } = useQuery({ 
    queryKey: ['presupuestos', 'mostrador'], 
    queryFn: () => api.get('/presupuestos').then(r => r.data.filter((p:any) => p.estado === 'MOSTRADOR_BORRADOR'))
  })
  const { data: cuentas = [] } = useQuery({ 
      queryKey: ['cuentas'], 
      queryFn: () => api.get('/cuentas').then(r => r.data) 
  })

  // -- MUTATIONS --
  const cobrarMut = useMutation({
    mutationFn: (data: { id: string, payload: any }) => presupuestosApi.cobrar(data.id, data.payload),
    onSuccess: () => {
      toast.success('Cobro exitoso - Imprimiendo comprobante...')
      setPresupuestoCaja(null)
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    }
  })

  return (
    <div className="max-w-[1600px] mx-auto p-6 min-h-screen">
      {/* Header Premium */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Banknote className="text-white" size={24} />
            </div>
            Terminal de Cobros
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1 ml-16">Módulo Cajero · Gestión de pagos y arqueo</p>
        </div>

        {/* Mini stats de caja rápida */}
        <div className="hidden lg:flex gap-4">
           <div className="bg-white border border-gray-100 rounded-2xl px-6 py-3 shadow-sm">
             <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">En espera</div>
             <div className="text-lg font-black text-gray-900">{presupuestosBorradores.length} Pedidos</div>
           </div>
           <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-3 shadow-sm">
             <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Estado Caja</div>
             <div className="text-lg font-black text-emerald-700">Abierta</div>
           </div>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        {/* Lista de Budgets en espera */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-800 tracking-tight uppercase">Pedidos para Cobrar</h2>
              <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                 <Search size={18} />
              </button>
           </div>
           
           <div className="space-y-4 max-h-[40vh] lg:max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-hide">
              {presupuestosBorradores.map((p: any) => (
                 <motion.div 
                    layout
                    key={p.id} 
                    onClick={() => setPresupuestoCaja(p)}
                    className={`bg-white p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${presupuestoCaja?.id === p.id ? 'border-emerald-500 shadow-2xl scale-[1.02] bg-emerald-50/10' : 'border-gray-50 hover:border-gray-200 shadow-sm'}`}
                 >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${presupuestoCaja?.id === p.id ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                             {p.clienteNombre?.[0] || 'C'}
                          </div>
                          <div>
                             <span className="text-xs font-black text-gray-900 truncate uppercase block">{p.clienteNombre || 'Cliente S/N'}</span>
                             <span className="text-[10px] font-bold text-gray-400">Orden #{p.numero}</span>
                          </div>
                       </div>
                       <Receipt size={14} className={presupuestoCaja?.id === p.id ? 'text-emerald-500' : 'text-gray-200'} />
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                       <div className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-widest">{p._count?.lineas || p.lineas?.length} items</div>
                       <div className={`text-2xl font-black tracking-tighter ${presupuestoCaja?.id === p.id ? 'text-emerald-600' : 'text-gray-900'}`}>{formatCurrency(p.total)}</div>
                    </div>
                    {presupuestoCaja?.id === p.id && (
                       <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                    )}
                 </motion.div>
              ))}
              {presupuestosBorradores.length === 0 && (
                 <div className="p-16 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-20">
                      <Banknote size={32} />
                    </div>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Cero pendientes de cobro</p>
                 </div>
              )}
           </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-8 h-full">
           <AnimatePresence mode="wait">
              {presupuestoCaja ? (
                 <motion.div 
                    key={presupuestoCaja.id}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="bg-white rounded-[3rem] shadow-2xl border border-gray-50 flex flex-col h-auto lg:min-h-[calc(100vh-14rem)] overflow-hidden"
                 >
                    {/* Modal-like Header */}
                    <div className="p-10 pb-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                       <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
                             <Wallet size={32} />
                          </div>
                          <div>
                             <h3 className="text-2xl font-black text-gray-900 leading-none">Procesar Pago</h3>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">NÚMERO DE ORDEN: {presupuestoCaja.numero} — DOCK 04</p>
                          </div>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full shadow-sm uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             Esperando Recepción
                          </span>
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-0">
                       {/* Configuración de Pago (Izquierda) */}
                       <div className="p-10 space-y-10 border-r border-gray-50">
                          <section>
                             <div className="flex items-center justify-between mb-5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medio de Pago</label>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                {[
                                   { id: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={16} /> },
                                   { id: 'TRANSFERENCIA', label: 'Transferencia', icon: <QrCode size={16} /> },
                                   { id: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={16} /> },
                                   { id: 'QR', label: 'Mercado Pago', icon: <QrCode size={16} /> },
                                ].map(m => (
                                   <button 
                                      key={m.id} 
                                      onClick={() => { setMetodoPago(m.id); if(m.id==='TARJETA')setRecargoPct(0.1);else setRecargoPct(0); }}
                                      className={`p-5 rounded-2xl text-[11px] font-black transition-all border-2 flex items-center justify-center gap-3 uppercase tracking-widest ${metodoPago === m.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}
                                   >
                                      {m.icon}
                                      {m.label}
                                   </button>
                                ))}
                             </div>
                          </section>

                          <section>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Caja de Destino</label>
                             <div className="relative">
                                <select 
                                   value={cuentaId}
                                   onChange={e => setCuentaId(e.target.value)}
                                   className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-black outline-none ring-2 ring-transparent focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                                >
                                   <option value="">-- SELECCIONAR CAJA --</option>
                                   {cuentas.map((c:any) => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
                                </select>
                                <div className="absolute right-4 top-4 text-gray-400 pointer-events-none">▼</div>
                             </div>
                          </section>

                          {metodoPago === 'TARJETA' && (
                             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 pt-4">
                                <div>
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Cuotas Plan</label>
                                   <select 
                                      value={cuotas}
                                      onChange={e => setCuotas(Number(e.target.value))}
                                      className="w-full bg-indigo-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black text-indigo-700 outline-none"
                                   >
                                      <option value={1}>1 Cuota (DÉBITO)</option>
                                      <option value={3}>3 Cuotas (+RECARGO)</option>
                                      <option value={6}>6 Cuotas (+RECARGO)</option>
                                   </select>
                                </div>
                                <div>
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Ajuste Manual (%)</label>
                                   <div className="relative">
                                      <input 
                                         type="number" 
                                         value={recargoPct * 100}
                                         onChange={e => setRecargoPct(Number(e.target.value)/100)}
                                         className="w-full bg-indigo-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black text-indigo-700 outline-none"
                                      />
                                      <span className="absolute right-4 top-4 text-indigo-400 font-black">%</span>
                                   </div>
                                </div>
                             </motion.div>
                          )}
                       </div>

                       {/* Checkout Resumen (Derecha) */}
                       <div className="bg-gray-950 p-10 flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40" />
                          
                          <div className="space-y-8 relative z-10">
                             <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-1">Resumen de Liquidación</div>
                             
                             <div className="space-y-5">
                                <div className="flex justify-between items-center text-gray-600">
                                   <span className="text-[10px] font-black uppercase tracking-widest">Base de Venta</span>
                                   <span className="text-xl font-bold text-white/50">{formatCurrency(presupuestoCaja.subtotal)}</span>
                                </div>
                                {recargoPct > 0 && (
                                   <div className="flex justify-between items-center text-rose-500 font-black">
                                      <span className="text-[10px] uppercase tracking-widest">Recargo Financiero ({(recargoPct*100).toFixed(0)}%)</span>
                                      <span className="text-xl">+ {formatCurrency(presupuestoCaja.subtotal * recargoPct)}</span>
                                   </div>
                                )}
                                {descuento > 0 && (
                                   <div className="flex justify-between items-center text-emerald-400 font-black">
                                      <span className="text-[10px] uppercase tracking-widest">Bonificación Especial</span>
                                      <span className="text-xl">- {formatCurrency(descuento)}</span>
                                   </div>
                                )}
                                <div className="pt-10 border-t border-white/5 mt-10">
                                   <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Neto a Percibir</div>
                                   <div className="text-6xl font-black text-white tracking-tighter shrink-0">{formatCurrency(presupuestoCaja.subtotal * (1 + recargoPct) - descuento)}</div>
                                   <div className="flex items-center gap-2 mt-4">
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Impuestos incluidos en liquidación</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                          
                          <div className="mt-12 relative z-10">
                             <button 
                                onClick={() => cobrarMut.mutate({ id: presupuestoCaja.id, payload: { cuentaId, recargoPct, descuento, cuotas, requiereFactura: false } })}
                                disabled={!cuentaId || cobrarMut.isPending}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-xs tracking-[0.4em] shadow-2xl shadow-emerald-500/20 disabled:grayscale disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                             >
                                {cobrarMut.isPending ? (
                                   'VALORIZANDO...'
                                ) : (
                                   <>
                                      FINALIZAR Y COBRAR
                                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                   </>
                                )}
                             </button>
                             <button className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
                                <Printer size={12} />
                                Solo imprimir presupuesto
                             </button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-center p-16 bg-white rounded-[3rem] border border-gray-50 shadow-sm min-h-[calc(100vh-14rem)]">
                    <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-8 grayscale opacity-20">
                      <CreditCard size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Terminal Inactiva</h3>
                    <p className="text-sm text-gray-400 font-bold max-w-sm mx-auto mt-3 leading-relaxed">Seleccione un pedido de la lista lateral para cargar los datos de facturación y cobro.</p>
                 </div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
