import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productosApi, categoriasApi, institucionesApi, type Producto } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import StockTraceabilityCard from '../components/StockTraceabilityCard'
import { useAuthStore } from '../store/authStore'

// Componentes secundarios
import { CategoriasConfig } from '../components/CategoriasConfig'
import { TallesConfig } from '../components/TallesConfig'

export function ProductosPage() {
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const [tab, setTab] = useState<'catalogo' | 'talles' | 'categorias'>('catalogo')
  const [buscar, setBuscar] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTemporada, setFiltroTemporada] = useState('')
  const [verFicha, setVerFicha] = useState<Producto | null>(null)
  
  // Estados para Actualización Masiva
  const [showMasivo, setShowMasivo] = useState(false)
  const [masivoConfig, setMasivoConfig] = useState({
    porcentaje: 0,
    categoriaId: '',
    institucionId: '',
    temporada: '',
    motivo: ''
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.listar
  })

  const { data: instituciones = [] } = useQuery({
    queryKey: ['instituciones'],
    queryFn: institucionesApi.listar
  })

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos', buscar, filtroCategoria, filtroTemporada],
    queryFn: () => productosApi.listar({ buscar: buscar || undefined, categoriaId: filtroCategoria || undefined })
  })

  // Filtrado local adicional para temporada
  const productosFiltrados = productos.filter(p => !filtroTemporada || p.temporada === filtroTemporada)

  const mutacionEstado = useMutation({
    mutationFn: (p: Producto) => productosApi.eliminar(p.id, false), // Toggle activo
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] })
  })

  const mutacionBorrar = useMutation({
    mutationFn: (id: string) => productosApi.eliminar(id, true), // Borrado físico
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] })
  })

  const mutacionMasivo = useMutation({
    mutationFn: (data: any) => productosApi.actualizarMasivo(data),
    onSuccess: (res) => {
      toast.success(`Se actualizaron ${res.actualizados} productos correctamente`, { icon: '💰' })
      qc.invalidateQueries({ queryKey: ['productos'] })
      setShowMasivo(false)
    },
    onError: () => toast.error('Error al realizar actualización masiva')
  })

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <Toaster position="top-right" />
      
      {/* HEADER INDUSTRIAL REFINADO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-16 gap-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white uppercase tracking-tight italic leading-none">Ingeniería de Productos</h1>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-[0.3em] rounded-md">Moldería Industrial</span>
            <span className="w-1 h-1 bg-gray-700 rounded-full" />
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.3em] rounded-md">Control de Costos</span>
          </div>
        </div>
        
        {/* TABS DE NAVEGACIÓN - DISTRIBUCIÓN GRID JUSTIFICADA */}
        <div className="bg-[#1a1b1e]/60 backdrop-blur-xl p-2 rounded-[2rem] border border-white/5 grid grid-cols-3 gap-2 shadow-2xl w-full max-w-4xl">
          {[
            { id: 'catalogo', label: 'Catálogo Central', icon: '📦' },
            { id: 'talles', label: 'Curvas / Grillas', icon: '📏' },
            { id: 'categorias', label: 'Maestros / Categorías', icon: '🏷️' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 whitespace-nowrap ${tab === t.id ? 'bg-indigo-600 text-white shadow-lg scale-105 z-10' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'catalogo' && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
             <div className="md:col-span-6 relative group">
               <input 
                 value={buscar}
                 onChange={e => setBuscar(e.target.value)}
                 placeholder="Buscar por nombre, SKU o moldería..."
                 className="w-full bg-[#1a1b1e] border border-white/5 rounded-3xl px-8 py-5 text-base text-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-gray-600 group-hover:border-white/10"
               />
               <span className="absolute right-7 top-5.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors">🔍</span>
             </div>
             
             {(usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'CLIENT_ADMIN' || usuario?.permisos?.includes('STOCK_PRICING')) && (
               <div className="md:col-span-3">
                 <button 
                   onClick={() => setShowMasivo(true)}
                   className="w-full h-full bg-[#1a1b1e] text-indigo-400 text-xs font-black uppercase tracking-widest px-6 py-5 rounded-3xl border border-indigo-500/20 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-3 active:scale-95"
                 >
                   💰 Actualización Masiva
                 </button>
               </div>
             )}

             <div className="md:col-span-3 flex flex-col gap-2">
               <Link 
                 to="/productos/alta-retail"
                 className="w-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl hover:bg-emerald-500 transition-all shadow-[0_10px_25px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 active:scale-95"
               >
                 + Alta Retail (Maestro)
               </Link>
               <Link 
                 to="/productos/alta-industrial"
                 className="w-full bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 flex items-center justify-center gap-3 active:scale-95"
               >
                 + Alta Industrial (Ficha)
               </Link>
             </div>
          </div>

          {/* FILTROS AVANZADOS */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="flex bg-[#1a1b1e] p-2 rounded-2xl border border-white/5 gap-1 shadow-inner overflow-x-auto no-scrollbar max-w-full">
              <button onClick={() => setFiltroCategoria('')} className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!filtroCategoria ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>TODOS</button>
              {categorias.map((c: any) => (
                <button key={c.id} onClick={() => setFiltroCategoria(c.id)} className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filtroCategoria === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{c.nombre}</button>
              ))}
            </div>
            
            <div className="flex bg-[#1a1b1e] p-2 rounded-2xl border border-white/5 gap-1 ml-auto">
               <button onClick={() => setFiltroTemporada('')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!filtroTemporada ? 'bg-white text-black' : 'text-gray-500 font-bold'}`}>TODOS</button>
               <button onClick={() => setFiltroTemporada('VERANO')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filtroTemporada === 'VERANO' ? 'bg-amber-400 text-black shadow-lg' : 'text-gray-500'}`}>VERANO ☀️</button>
               <button onClick={() => setFiltroTemporada('INVIERNO')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filtroTemporada === 'INVIERNO' ? 'bg-sky-400 text-black shadow-lg' : 'text-gray-500'}`}>INVIERNO ❄️</button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-40 flex flex-col items-center gap-6">
              <div className="w-10 h-10 border-2 border-white/5 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando moldería...</p>
            </div>
          ) : (
            <div className="bg-[#1a1b1e]/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-8 py-6 text-xs uppercase font-black tracking-[0.2em] text-gray-400">Producto / Ficha Técnica</th>
                    <th className="px-8 py-6 text-xs uppercase font-black tracking-[0.2em] text-gray-400">Categoría & Temp</th>
                    <th className="px-8 py-6 text-xs uppercase font-black tracking-[0.2em] text-gray-400">Curva Standard</th>
                    <th className="px-8 py-6 text-xs uppercase font-black tracking-[0.2em] text-gray-400">Origen</th>
                    <th className="px-8 py-6 text-xs uppercase font-black tracking-[0.2em] text-gray-400 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {productosFiltrados.map((p: any) => (
                    <tr key={p.id} className={`group hover:bg-white/[0.01] transition-all cursor-default ${!p.activo ? 'opacity-30 grayscale' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                             {p.nombre.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <div 
                               onClick={() => setVerFicha(p)}
                               className="text-base font-black text-gray-100 uppercase tracking-tight group-hover:text-indigo-400 transition-colors cursor-pointer"
                             >
                               {p.nombre}
                             </div>
                             <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Ref: {p.id.substring(0, 8).toUpperCase()}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-black uppercase tracking-widest text-indigo-400">
                            {p.categoria?.nombre || 'General'}
                          </span>
                          <span className={`text-[11px] font-black uppercase tracking-widest w-fit px-3 py-1 rounded-md ${p.temporada === 'INVIERNO' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : p.temporada === 'VERANO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                            {p.temporada || 'TODO EL AÑO'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2 max-w-[220px]">
                          {p.talles.map((t: any) => (
                            <span key={t.id} className="text-sm font-black text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 transition-colors">
                              {t.talle}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border inline-block ${p.tipo === 'FABRICADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                           {p.tipo}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => setVerFicha(p)} className="bg-white/5 hover:bg-indigo-600 text-gray-500 hover:text-white p-3 rounded-2xl transition-all border border-white/5">👁️</button>
                          <Link 
                            to={p.tipo === 'COMPRADO' ? `/productos/${p.id}/editar-retail` : `/productos/${p.id}/editar`} 
                            className="bg-white/5 hover:bg-emerald-600 text-gray-500 hover:text-white p-3 rounded-2xl transition-all border border-white/5"
                          >
                            ✎
                          </Link>
                          <button onClick={() => mutacionEstado.mutate(p)} className={`p-3 rounded-2xl border border-white/5 transition-all ${p.activo ? 'bg-white/5 text-gray-500 hover:bg-amber-600 hover:text-white' : 'bg-emerald-600 text-white animate-pulse'}`}>
                            {p.activo ? '⏸️' : '▶️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'talles' && <TallesConfig />}
      {tab === 'categorias' && <CategoriasConfig />}

      {/* MODAL ACTUALIZACIÓN MASIVA */}
      {showMasivo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMasivo(false)} />
           <div className="bg-[#1a1b1e] w-full max-w-xl rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="p-10 border-b border-white/5 bg-black/20">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Ajuste Masivo de Precios</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-3 tracking-widest">Afectará proporcionalmente a todos los niveles de precio</p>
             </div>
             <div className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                   <div className="col-span-2">
                       <label className="block text-[10px] uppercase font-black text-gray-500 mb-4 tracking-widest flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                         Variación Porcentual (%)
                       </label>
                      <input 
                        type="number" step="0.5"
                        value={masivoConfig.porcentaje}
                        onChange={e => setMasivoConfig(prev => ({...prev, porcentaje: parseFloat(e.target.value)}))}
                        placeholder="Ej: 15.5 o -10"
                        className="w-full bg-black/40 border border-white/5 rounded-3xl px-10 py-6 text-3xl font-black text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-center" 
                      />
                   </div>
                   
                   <div>
                       <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 tracking-widest">Categoría</label>
                      <select 
                        value={masivoConfig.categoriaId}
                        onChange={e => setMasivoConfig(prev => ({...prev, categoriaId: e.target.value}))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-gray-300 outline-none focus:border-indigo-500"
                      >
                         <option value="">TODAS LAS CATEGORÍAS</option>
                         {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                   </div>
                   
                   <div>
                       <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 tracking-widest">Temporada</label>
                      <select 
                        value={masivoConfig.temporada}
                        onChange={e => setMasivoConfig(prev => ({...prev, temporada: e.target.value}))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-gray-300 outline-none focus:border-indigo-500"
                      >
                         <option value="">TODAS</option>
                         <option value="VERANO">VERANO ☀️</option>
                         <option value="INVIERNO">INVIERNO ❄️</option>
                         <option value="TODO EL AÑO">TODO EL AÑO</option>
                      </select>
                   </div>

                   <div className="col-span-2">
                       <label className="block text-xs uppercase font-black text-gray-400 mb-2 tracking-widest">Institución / Cliente</label>
                      <select 
                        value={masivoConfig.institucionId}
                        onChange={e => setMasivoConfig(prev => ({...prev, institucionId: e.target.value}))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs font-black text-gray-300 outline-none focus:border-indigo-500"
                      >
                         <option value="">TODOS LOS CLIENTES</option>
                         {instituciones.map(inst => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
                      </select>
                   </div>
                </div>

                <div className="pt-8">
                   <button 
                     disabled={mutacionMasivo.isPending || masivoConfig.porcentaje === 0}
                     onClick={() => !mutacionMasivo.isPending && mutacionMasivo.mutate(masivoConfig)}
                     className={`w-full py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 ${masivoConfig.porcentaje > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'}`}
                   >
                     {mutacionMasivo.isPending ? 'PROCESANDO...' : `EJECUTAR ${masivoConfig.porcentaje > 0 ? '+' : ''}${masivoConfig.porcentaje}% AHORA`}
                   </button>
                   <p className="text-center text-[11px] text-gray-500 mt-6 uppercase font-bold tracking-[0.2em]">Esta acción es irreversible y actualizará todas las variantes talle/color</p>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA FICHA TÉCNICA */}
      {verFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setVerFicha(null)} />
           <div className="bg-[#1a1b1e] w-full max-w-5xl rounded-[3rem] shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[95vh] border border-white/5">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                 <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">{verFicha.nombre}</h2>
                    <div className="flex gap-4 items-center uppercase font-black text-[9px] tracking-widest text-indigo-400">
                       <span className="bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/10">SKU: {verFicha.id.substring(0,8).toUpperCase()}</span>
                       <span className="w-1 h-1 bg-gray-600 rounded-full" />
                       <span className="text-gray-500">{verFicha.categoria?.nombre || 'Categoría General'}</span>
                    </div>
                 </div>
                 <button onClick={() => setVerFicha(null)} className="bg-white/5 text-gray-500 hover:text-white w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:bg-red-500/20">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* MATRIZ DE MEDIDAS */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 flex items-center gap-3">
                           <span className="w-4 h-px bg-indigo-500" />
                           Matriz Métrica de Producción (CM)
                        </h4>
                        <div className="bg-black/20 border border-white/5 rounded-[2rem] overflow-hidden">
                           <table className="w-full text-left">
                              <thead className="bg-white/5">
                                 <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                    <th className="px-6 py-5">Control Point</th>
                                    {Array.from(new Set(verFicha.medidas?.map(m => m.talle))).map(t => (
                                       <th key={t} className="px-6 py-5 text-center border-l border-white/5">{t}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                 {Array.from(new Set(verFicha.medidas?.map(m => m.punto?.nombre))).map(punto => (
                                    <tr key={punto} className="text-[11px] group transition-colors">
                                       <td className="px-6 py-5 font-bold text-gray-400 italic uppercase group-hover:text-white transition-colors">{punto}</td>
                                       {Array.from(new Set(verFicha.medidas?.map(m => m.talle))).map(t => {
                                          const val = verFicha.medidas?.find(m => m.punto?.nombre === punto && m.talle === t)?.valorCm
                                          return <td key={t} className="px-6 py-5 text-center text-gray-500 font-black border-l border-white/5 group-hover:text-indigo-400 transition-colors">{val || '—'}</td>
                                       })}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                    </div>

                    {/* GALERÍA */}
                    <div className="space-y-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 flex items-center gap-3">
                           <span className="w-4 h-px bg-indigo-500" />
                           Documentación Fotográfica
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                           {verFicha.imagenes?.map(img => (
                              <div key={img.id} className="aspect-square bg-black/40 rounded-[2.5rem] overflow-hidden group relative border border-white/5 shadow-xl">
                                 <img src={img.url} alt={img.etiqueta} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                 <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{img.etiqueta}</span>
                                    <span className="text-[8px] font-bold text-indigo-400">HQ RAW</span>
                                 </div>
                              </div>
                           ))}
                           {(verFicha.imagenes?.length === 0) && (
                              <div className="col-span-2 py-32 text-center bg-black/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                 <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Sin archivos de moldería visual</p>
                              </div>
                           )}
                        </div>
                    </div>
                 </div>

                 {/* ESTRUCTURA BOM */}
                 <div className="pt-12 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-10 flex items-center gap-3">
                       <span className="w-4 h-px bg-indigo-500" />
                       Composición Técnica (BOM)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {verFicha.insumos?.map((i: any) => (
                          <div key={i.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between group hover:bg-[#1f2128] transition-all hover:-translate-y-1">
                             <div className="space-y-1">
                                <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{i.insumo.tipo}</div>
                                <div className="text-sm font-black text-gray-200 uppercase italic leading-tight group-hover:text-white transition-colors">{i.insumo.nombre}</div>
                             </div>
                             <div className="mt-8 flex items-baseline justify-between border-t border-white/5 pt-4">
                                <span className="text-2xl font-black text-white leading-none tracking-tighter">x{i.cantidad}</span>
                                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Unit. Req</span>
                             </div>
                          </div>
                       ))}
                       
                       {verFicha.bordados?.map((b: any) => (
                          <div key={b.id} className="bg-violet-600/5 p-8 rounded-[2.5rem] border border-violet-500/10 flex flex-col justify-between group hover:bg-[#211b2b] transition-all hover:-translate-y-1">
                             <div className="space-y-1">
                                <div className="text-[8px] font-black text-violet-400 uppercase tracking-widest">MAQUINARIA BORDADO</div>
                                <div className="text-sm font-black text-gray-200 uppercase italic leading-tight">{b.bordado.nombre}</div>
                                <div className="bg-violet-500/10 w-fit px-2 py-0.5 rounded text-[8px] font-black text-violet-300 mt-2 uppercase">{b.posicion}</div>
                             </div>
                             <div className="mt-8 flex items-baseline justify-between border-t border-white/5 pt-4">
                                <span className="text-2xl font-black text-white leading-none tracking-tighter">{Math.round(b.bordado.puntadas / 1000)}K</span>
                                <span className="text-[8px] font-bold text-violet-500 uppercase tracking-widest">Stitches</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* TRAZABILIDAD */}
                 <div className="pt-12 border-t border-white/5 pb-20">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-10 flex items-center gap-3">
                       <span className="w-4 h-px bg-indigo-500" />
                       Trazabilidad & Eventos de Ingeniería
                    </h4>
                    
                    <div className="bg-black/40 rounded-[3rem] p-10 border border-white/5 shadow-2xl overflow-hidden">
                       <StockTraceabilityCard 
                          productoId={verFicha.id} 
                          title=""
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
