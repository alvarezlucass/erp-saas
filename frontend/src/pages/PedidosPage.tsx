import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { produccionApi } from '../lib/api'
import { formatCurrency, estadoColor } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  ClipboardList, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  Factory, 
  Package, 
  Truck,
  Layers
} from 'lucide-react'

const ETAPAS = ['CORTE', 'BORDADO', 'COSTURA', 'TERMINADO'] as const
type Etapa = typeof ETAPAS[number]

const ETAPA_LABEL: Record<Etapa, string> = {
  CORTE:     'Corte',
  BORDADO:   'Bordado',
  COSTURA:   'Confección',
  TERMINADO: 'Terminado / Empaque',
}

const ETAPA_ICON: Record<Etapa, any> = {
  CORTE:     <Factory size={16} />,
  BORDADO:   <Layers size={16} />,
  COSTURA:   <CheckCircle2 size={16} />,
  TERMINADO: <Package size={16} />,
}

export function PedidosPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // -- DATA FETCHING --
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['produccion', 'pedidos'],
    queryFn: produccionApi.listar
  })

  // -- MUTATIONS --
  const updateEstadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: string, estado: string }) => produccionApi.actualizarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produccion', 'pedidos'] })
      toast.success('Estado de producción actualizado')
    }
  })

  const toggleOTMut = useMutation({
    mutationFn: ({ id, completada }: { id: string, completada: boolean }) => produccionApi.actualizarOrden(id, completada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produccion', 'pedidos'] })
    }
  })

  // -- HELPERS --
  const porEtapa = (etapa: Etapa) => pedidos.filter((p: any) => p.estado === etapa)
  
  const selected = pedidos.find((p: any) => p.id === selectedId) || pedidos[0]

  const diasHasta = (fecha: string | null) => {
    if (!fecha) return 0
    const diff = new Date(fecha).getTime() - Date.now()
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return dias
  }

  if (isLoading) return (
    <div className="p-12 text-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cargando Tablero de Producción...</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <ClipboardList className="text-white" size={20} />
            </div>
            Pedidos y Órdenes
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
            Control de flujo industrial · {pedidos.length} órdenes en seguimiento
          </p>
        </div>
        <div className="flex gap-3">
           <div className="bg-white px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Planta Activa</span>
           </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {ETAPAS.map(etapa => (
          <div key={etapa} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                 <div className="text-indigo-600 font-black">{ETAPA_ICON[etapa]}</div>
                 <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{ETAPA_LABEL[etapa]}</span>
              </div>
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {porEtapa(etapa).length}
              </span>
            </div>

            <div className="space-y-3 min-h-[500px] bg-gray-50/50 p-3 rounded-[2rem] border border-gray-100">
              {porEtapa(etapa).map((pedido: any) => {
                const dias = diasHasta(pedido.presupuesto?.fechaVencimiento)
                const isLate = dias < 5
                return (
                  <motion.div
                    layout
                    key={pedido.id}
                    onClick={() => setSelectedId(pedido.id)}
                    whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer relative overflow-hidden ${
                      selected?.id === pedido.id ? 'border-indigo-500 shadow-xl' : 'border-transparent shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">#{pedido.numero}</span>
                       <span className={`text-[9px] font-black flex items-center gap-1 ${isLate ? 'text-rose-500' : 'text-gray-400'}`}>
                         <Clock size={10} />
                         {dias < 0 ? 'VENCIDO' : `${dias} DÍAS`}
                       </span>
                    </div>
                    
                    <h4 className="text-xs font-black text-gray-900 leading-tight uppercase mb-1 truncate">
                      {pedido.presupuesto?.clienteNombre || 'S/N'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold mb-4">
                      {pedido.presupuesto?.lineas?.reduce((acc: number, l: any) => acc + l.cantidad, 0)} unidades · {pedido.presupuesto?.lineas?.length} modelos
                    </p>

                    {/* Progress Micro bar */}
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden flex">
                       {pedido.ordenes?.map((ot: any) => (
                         <div key={ot.id} className={`flex-1 h-full border-r border-white last:border-0 ${ot.completada ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                       ))}
                    </div>
                  </motion.div>
                )
              })}
              {porEtapa(etapa).length === 0 && (
                <div className="h-full flex items-center justify-center p-10 opacity-20 filter grayscale">
                   <div className="text-center">
                      <div className="text-2xl mb-2">💤</div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Sin pedidos</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col lg:grid lg:grid-cols-12">
               {/* Left: Info Principal */}
               <div className="lg:col-span-8 p-10 border-b lg:border-b-0 lg:border-r border-gray-50">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">Orden de Trabajo #{selected.numero}</span>
                           <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase ${estadoColor(selected.estado)}`}>● {ETAPA_LABEL[selected.estado as Etapa]}</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{selected.presupuesto?.clienteNombre}</h3>
                     </div>
                     <div className="flex gap-2">
                        {ETAPAS.indexOf(selected.estado as Etapa) > 0 && (
                          <button
                            onClick={() => updateEstadoMut.mutate({ id: selected.id, estado: ETAPAS[ETAPAS.indexOf(selected.estado as Etapa) - 1] })}
                            className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-gray-100 transition-all active:scale-95"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        )}
                        {ETAPAS.indexOf(selected.estado as Etapa) < ETAPAS.length - 1 && (
                          <button
                            onClick={() => updateEstadoMut.mutate({ id: selected.id, estado: ETAPAS[ETAPAS.indexOf(selected.estado as Etapa) + 1] })}
                            className="px-6 h-12 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:bg-black active:scale-95 flex items-center gap-3"
                          >
                            Siguiente Etapa
                            <ChevronRight size={16} />
                          </button>
                        )}
                        {selected.estado === 'TERMINADO' && (
                          <button className="px-6 h-12 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center gap-3">
                             <Truck size={16} /> ENTREGAR
                          </button>
                        )}
                     </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detalle de Prendas</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selected.presupuesto?.lineas?.map((linea: any) => (
                           <div key={linea.id} className="bg-gray-50 p-5 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all flex items-center gap-4">
                              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <span className="text-2xl">👕</span>
                              </div>
                              <div className="flex-1">
                                 <div className="text-xs font-black text-gray-900 uppercase leading-tight line-clamp-1">{linea.productoNombre}</div>
                                 <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase">{linea.talle}</span>
                                    <span className="text-[10px] font-bold text-gray-400">Cantidad: {linea.cantidad}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Right: Work Orders (OTs) */}
               <div className="lg:col-span-4 p-10 bg-gray-50/30">
                  <header className="mb-8">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tareas de Producción (OT)</h4>
                     <p className="text-[9px] font-bold text-gray-400 mt-1 italic">Click para marcar como completada</p>
                  </header>

                  <div className="space-y-4">
                     {selected.ordenes?.map((ot: any) => (
                        <div 
                           key={ot.id}
                           onClick={() => toggleOTMut.mutate({ id: ot.id, completada: !ot.completada })}
                           className={`group relative p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${
                              ot.completada 
                              ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-50' 
                              : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                           }`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                                 ot.completada ? 'bg-emerald-600 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-400'
                              }`}>
                                 {ot.completada ? <CheckCircle2 size={18} /> : ETAPA_ICON[ot.tipo as Etapa]}
                              </div>
                              <div className="flex-1">
                                 <div className={`text-[10px] font-black uppercase tracking-widest ${ot.completada ? 'text-emerald-700' : 'text-gray-900'}`}>{ot.tipo}</div>
                                 <p className="text-[9px] font-bold text-gray-400 mt-0.5 line-clamp-1">{ot.descripcion || 'Sin descripción'}</p>
                              </div>
                              {ot.completada && (
                                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <div className="bg-emerald-600 text-white rounded-full p-1 shadow-lg border-2 border-white">
                                       <CheckCircle2 size={10} strokeWidth={4} />
                                    </div>
                                 </motion.div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
                  
                  <div className="mt-10 p-6 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100">
                     <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Venta</div>
                     <div className="text-3xl font-black mt-1 leading-none">{formatCurrency(selected.presupuesto?.total || 0)}</div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
