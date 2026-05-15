import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Info, ChevronRight, TrendingUp, Package, AlertTriangle, ListChecks, Bell, User, Clock, Activity, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Data simplificada para el Dashboard Principal (Ficha de Inicio)
const DASHBOARD_DATA = {
  label: "Inicio / Dashboard",
  desc: "Vista general del negocio en tiempo real. Indicadores clave de ventas, stock crítico, pedidos pendientes y caja del día.",
  subs: [
    { name: "Resumen del día", desc: "Ventas, cobros y pedidos del día actual.", to: "/" },
    { name: "Alertas de stock", desc: "Productos bajo punto de reposición.", to: "/inventario" },
    { name: "Tareas pendientes", desc: "Órdenes sin confirmar, presupuestos vencidos.", to: "/" },
    { name: "Accesos rápidos", desc: "Atajos a las secciones más usadas por el usuario.", to: "/" }
  ]
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'CLIENT_ADMIN'

  const { data: novedades = [], isLoading: loadingNovedades } = useQuery({
    queryKey: ['novedades'],
    queryFn: () => api.get('/novedades').then(res => res.data),
    enabled: isAdmin,
    refetchInterval: 1000 * 60 * 5 // Refrescar cada 5 min
  })

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0a0a0b]">
       <div className="p-12 lg:p-20 max-w-[1200px] mx-auto w-full space-y-16">
          
          {/* Header del Módulo con fuente masiva y legible */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
             <div className="space-y-6">
                <div className="flex items-center gap-6">
                   <h1 className="text-6xl font-[900] text-white uppercase tracking-tighter italic leading-none">
                      {DASHBOARD_DATA.label}
                   </h1>
                   <span className="text-xs font-black uppercase px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      Existe
                   </span>
                </div>
                <div className="max-w-4xl text-2xl font-medium text-gray-400 leading-relaxed border-l-4 border-emerald-500 pl-8 italic">
                   "{DASHBOARD_DATA.desc}"
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'Ventas Mes', val: '$1.2M', icon: TrendingUp, color: 'text-emerald-400' },
                  { label: 'Presupuestos', val: '14 ACT.', icon: ListChecks, color: 'text-blue-400' },
                  { label: 'Pedidos', val: '8 PEND.', icon: Package, color: 'text-orange-400' },
                  { label: 'Alertas', val: '5 CRÍT.', icon: AlertTriangle, color: 'text-rose-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
                     <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ${s.color}`}>
                        <s.icon size={24} />
                     </div>
                     <div className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</div>
                     <div className={`text-2xl font-black uppercase italic ${s.color}`}>{s.val}</div>
                  </div>
                ))}
             </div>
          </motion.div>

          {/* Submenús en tarjetas grandes y ultra-legibles */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-10"
          >
           {/* SECCIÓN DE NOVEDADES Y AUDITORÍA - SOLO ADMINS */}
           {isAdmin && (
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="space-y-10 mb-20"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-4 opacity-70">
                      <Bell size={18} className="text-emerald-400" /> Novedades del Sistema
                   </h3>
                   <div className="h-[1px] flex-1 bg-white/5 mx-8" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 space-y-4">
                      {loadingNovedades ? (
                        <div className="p-20 text-center text-gray-600 bg-white/5 rounded-[3rem] border border-white/5 animate-pulse uppercase font-black text-[10px] tracking-widest leading-none">
                           <Activity className="mx-auto mb-4 animate-bounce" />
                           Sincronizando feed de auditoría...
                        </div>
                      ) : novedades.length === 0 ? (
                        <div className="p-20 text-center text-gray-500 bg-white/5 rounded-[3rem] border border-white/5 italic font-medium">No hay novedades registradas recientemente.</div>
                      ) : (
                        <div className="space-y-4">
                           {novedades.map((n: any) => (
                             <div key={n.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex gap-6 hover:bg-white/[0.08] transition-all group shadow-xl">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${n.tipo === 'WARNING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                   <Activity size={24} />
                                </div>
                                <div className="flex-1">
                                   <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-xl font-black text-white uppercase tracking-tight">{n.titulo}</h4>
                                      <span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2">
                                         <Clock size={12} /> {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                                      </span>
                                   </div>
                                   <p className="text-lg text-gray-400 font-medium leading-relaxed mb-4">"{n.mensaje}"</p>
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                         <User size={12} className="text-emerald-400" />
                                         <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ejecutor: {n.usuario?.nombre || 'SISTEMA'}</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>

                   <div className="space-y-8">
                      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all" />
                         <Shield size={40} className="mb-6 opacity-80" />
                         <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-none text-white">Control Maestro de Auditoría</h4>
                         <p className="text-emerald-100 font-medium opacity-80 leading-relaxed mb-8">Usted está visualizando el registro oficial de cambios industriales para {usuario?.empresa?.nombre || 'la organización'}.</p>
                         <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform active:scale-95">Ver Historial Completo</button>
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
                         <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Integridad del Sistema</h5>
                         <div className="space-y-6">
                            {[
                               { label: 'Trazabilidad', val: 'ACTIVA', color: 'text-emerald-400' },
                               { label: 'Eventos Semanales', val: novedades.length, color: 'text-emerald-400' },
                            ].map(stat => (
                               <div key={stat.label} className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-gray-400">{stat.label}</span>
                                  <span className={`text-xl font-black ${stat.color}`}>{stat.val}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
           )}

           {/* Submenús en tarjetas grandes y ultra-legibles */}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {DASHBOARD_DATA.subs.map((sub, idx) => (
                   <div 
                     key={idx}
                     onClick={() => sub.to && navigate(sub.to)}
                     className="group p-10 bg-white/5 border border-white/10 rounded-[3rem] flex items-start gap-8 transition-all hover:bg-white/[0.08] hover:border-emerald-500/50 hover:-translate-y-2 cursor-pointer shadow-xl relative overflow-hidden"
                   >
                      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-3 h-3 rounded-full mt-2.5 bg-emerald-500 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                      <div className="flex-1">
                         <div className="flex items-center justify-between mb-3">
                            <h4 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors italic">{sub.name}</h4>
                            <ChevronRight size={24} className="text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-2 transition-all" />
                         </div>
                         <p className="text-lg text-gray-500 font-bold leading-snug">{sub.desc}</p>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>
       </div>
    </div>
  )
}
