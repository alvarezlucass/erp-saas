import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientesApi, Cliente, presupuestosApi } from '../lib/api'
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  CreditCard, 
  MoreVertical,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  X,
  Shield,
  Layers,
  ArrowUpRight,
  Receipt
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// --- Componentes Auxiliares ---

function StatusBadge({ vencimiento }: { vencimiento?: string | null }) {
  if (!vencimiento) return null
  
  const fechaVenc = new Date(vencimiento)
  const hoy = new Date()
  const diffDays = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
        <AlertCircle size={12} /> Vencido
      </span>
    )
  }
  if (diffDays <= 7) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 animate-pulse">
        <Clock size={12} /> Vence pronto
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
      <CheckCircle2 size={12} /> Al día
    </span>
  )
}

export function ClientesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'suscripcion' | 'archivos' | 'pagos'>('info')

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesApi.listar()
  })

  // Para el historial de pagos, filtramos presupuestos por cliente
  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => presupuestosApi.listar(),
    enabled: !!selectedCliente
  })

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(filter.toLowerCase()) || 
    (c.razonSocial?.toLowerCase().includes(filter.toLowerCase())) ||
    (c.cuit?.includes(filter))
  )

  const pagosCliente = presupuestos.filter(p => p.clienteId === selectedCliente?.id)

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 p-2">
      {/* --- LISTADO MAESTRO --- */}
      <div className={`flex flex-col gap-6 transition-all duration-500 ${selectedCliente ? 'w-1/2' : 'w-full'}`}>
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50/50">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Gestión de Clientes</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Ecosistema Industrial · {clientes.length} Cuentas Activas</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nombre, CUIT..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 w-64 transition-all shadow-inner"
              />
            </div>
            <button className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
               <Plus size={20} strokeWidth={3} />
               <span className="text-xs font-black uppercase tracking-widest hidden lg:block">Alta de Cliente</span>
            </button>
          </div>
        </header>

        <section className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-50/50 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente / Razón Social</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado Suscripción</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                  {!selectedCliente && <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</th>}
                  <th className="px-8 py-5 text-right font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClientes.map(cliente => (
                  <motion.tr 
                    layout
                    key={cliente.id} 
                    onClick={() => setSelectedCliente(cliente)}
                    className={`group cursor-pointer transition-colors ${selectedCliente?.id === cliente.id ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 transition-all font-black text-xs">
                          {cliente.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">{cliente.nombre}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{cliente.razonSocial || 'Persona Física'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <StatusBadge vencimiento={cliente.vencimiento} />
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-sm font-black ${cliente.saldo > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        ${cliente.saldo.toLocaleString('es-AR')}
                      </span>
                    </td>
                    {!selectedCliente && (
                      <td className="px-6 py-6 text-gray-400">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold">{cliente.email || '-'}</span>
                          <span className="text-[10px] font-bold">{cliente.telefono || '-'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-indigo-100/50">
                        <ChevronRight size={20} spellCheck />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* --- FICHA 360 (DETALLE) --- */}
      <AnimatePresence>
        {selectedCliente && (
          <motion.aside 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="w-1/2 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
          >
            <header className="p-8 pb-4 relative">
              <button 
                onClick={() => setSelectedCliente(null)}
                className="absolute right-6 top-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="flex items-start gap-6 pt-4">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 font-black text-2xl shadow-inner border border-indigo-100">
                  {selectedCliente.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-3xl font-black text-gray-900 leading-none">{selectedCliente.nombre}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-50/50 px-2.5 py-1 rounded-lg uppercase tracking-widest">{selectedCliente.razonSocial || 'Personal'}</span>
                    <span className="text-[10px] font-black text-gray-400 border border-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-widest">CUIT: {selectedCliente.cuit || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Selector de Pestañas Industrial */}
              <nav className="flex gap-1 mt-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                {[
                  { id: 'info', label: 'General', icon: <Users size={14} /> },
                  { id: 'suscripcion', label: 'Plan / Módulos', icon: <Layers size={14} /> },
                  { id: 'archivos', label: 'Bóveda Documental', icon: <FileText size={14} /> },
                  { id: 'pagos', label: 'Finanzas', icon: <Receipt size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {tab.icon}
                    <span className="hidden md:block">{tab.label}</span>
                  </button>
                ) )}
              </nav>
            </header>

            <main className="flex-1 overflow-y-auto p-8 pt-4 scrollbar-hide">
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50 flex flex-col gap-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Comercial</span>
                        <span className="font-bold text-gray-700">{selectedCliente.email || 'No registrado'}</span>
                      </div>
                      <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50 flex flex-col gap-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Línea de contacto</span>
                        <span className="font-bold text-gray-700">{selectedCliente.telefono || 'No registrado'}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100/50 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300 shadow-sm">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dirección Legal</span>
                        <p className="font-bold text-gray-700 leading-tight">{selectedCliente.direccion || 'Domicilio no provisto'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Configuración Fiscal</h4>
                      <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100/50">
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Condición IVA</p>
                          <p className="text-xs font-black text-gray-800">{selectedCliente.condicionIva}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase">Tipo Facturación</p>
                          <p className="text-xs font-black text-gray-800">Factura {selectedCliente.tipoFactura}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'suscripcion' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                      <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Estado del Servicio</p>
                            <h3 className="text-2xl font-black">Plan Corporativo Premium</h3>
                          </div>
                          <Shield size={32} className="opacity-40" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[8px] font-black uppercase opacity-60">Próximo Vencimiento</p>
                            <p className="text-sm font-black">
                              {selectedCliente.vencimiento 
                                ? format(new Date(selectedCliente.vencimiento), "dd 'de' MMMM", { locale: es }) 
                                : 'A definir'}
                            </p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[8px] font-black uppercase opacity-60">Último Pago</p>
                            <p className="text-sm font-black underline decoration-dotted">
                              {selectedCliente.ultimoCobro
                                ? format(new Date(selectedCliente.ultimoCobro), "dd/MM/yyyy")
                                : 'Ninguno registrado'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end px-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Módulos Contratados</h4>
                        <span className="text-[9px] font-black text-indigo-500">Edit Config</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                         {['Ventas & POS', 'Inventario Industrial', 'Producción Avanzada'].map(mod => (
                           <div key={mod} className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl group hover:bg-white hover:border-indigo-100 transition-all cursor-default">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm">
                                  <CheckCircle2 size={16} />
                                </div>
                                <span className="text-xs font-black text-gray-700">{mod}</span>
                              </div>
                              <ArrowUpRight size={14} className="text-gray-200 group-hover:text-indigo-400 transition-colors" />
                           </div>
                         ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'archivos' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="border-4 border-dashed border-gray-100 rounded-[3rem] p-12 text-center group hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer">
                       <Download size={32} className="text-gray-300 mx-auto mb-4 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                       <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Arrastrar archivos para vincular</p>
                       <p className="text-[10px] font-bold text-gray-300 mt-1">Soporta PDF, PNG, JPG (Max. 10MB)</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:shadow-gray-100/50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-700">Contrato_Servicios_V1.pdf</p>
                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">1.2 MB · Cargado 12/04</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"><ExternalLink size={16} /></button>
                           <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'pagos' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50">
                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Abonado</p>
                          <p className="text-2xl font-black text-emerald-700">${pagosCliente.filter(p => p.pagado).reduce((acc, p) => acc + p.total, 0).toLocaleString('es-AR')}</p>
                       </div>
                       <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50">
                          <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest mb-1">Pendiente</p>
                          <p className="text-2xl font-black text-orange-700">${pagosCliente.filter(p => !p.pagado).reduce((acc, p) => acc + p.total, 0).toLocaleString('es-AR')}</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 mb-4">Historial de Transacciones</h4>
                      {pagosCliente.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                          <CreditCard size={32} className="text-gray-200 mx-auto mb-2" />
                          <p className="text-[10px] font-black text-gray-300 uppercase">Sin movimientos registrados</p>
                        </div>
                      ) : pagosCliente.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-5 bg-white border border-gray-50 rounded-2xl hover:shadow-lg hover:shadow-indigo-50/50 transition-all">
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.pagado ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400'}`}>
                               <Receipt size={18} />
                             </div>
                             <div>
                                <p className="text-xs font-black text-gray-800">Presupuesto #{p.numero}</p>
                                <p className="text-[9px] font-bold text-gray-400">{format(new Date(p.creadoEn), 'dd/MM/yyyy · HH:mm')}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-gray-900">${p.total.toLocaleString('es-AR')}</p>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${p.pagado ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {p.pagado ? 'Completado' : 'Pendiente'}
                             </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <footer className="p-8 pt-4 border-t border-gray-50 bg-gray-50/30 flex gap-3">
               <button className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                  Generar Reporte PDF
               </button>
               <button className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                  Registrar Cobro Manual
               </button>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
