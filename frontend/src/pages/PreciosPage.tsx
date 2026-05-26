import { useState, useMemo } from 'react'
import { formatCurrency } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { productosApi, institucionesApi, categoriasApi, configuracionApi } from '../lib/api'
import { Building2, Plus, Download, LayoutTemplate, Info, TrendingUp, Search, Filter, Tags, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

function margenColor(m: number) {
  if (m >= 0.50) return 'bg-teal-50 text-teal-800 border-teal-100'
  if (m >= 0.40) return 'bg-blue-50 text-blue-700 border-blue-100'
  if (m >= 0.20) return 'bg-indigo-50 text-indigo-700 border-indigo-100'
  return 'bg-amber-50 text-amber-700 border-amber-100'
}

type GroupBy = 'CATEGORIA' | 'INSTITUCION' | 'NINGUNO'
type TarifaType = 'precioFinal' | 'precioRevendedor' | 'precioEmpresa' | 'precioRevendido'

export function PreciosPage() {
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'CLIENT_ADMIN' || usuario?.rol === 'SUPER_ADMIN'
  
  // -- ESTADO --
  const [groupBy, setGroupBy] = useState<GroupBy>('CATEGORIA')
  const [selectedTarifa, setSelectedTarifa] = useState<TarifaType>(() => {
    if (usuario?.tarifaVenta === 'PRECIO_REVENDEDOR') return 'precioRevendedor'
    if (usuario?.tarifaVenta === 'PRECIO_EMPRESA') return 'precioEmpresa'
    if (usuario?.tarifaVenta === 'PRECIO_REVENDIDO') return 'precioRevendido'
    return 'precioFinal'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [vistaInterna, setVistaInterna] = useState(false)
  
  // -- QUERIES --
  const { data: productos = [], isLoading: loadingProds } = useQuery({
    queryKey: ['productos-precios'],
    queryFn: () => productosApi.listar()
  })

  const { data: instituciones = [] } = useQuery({
    queryKey: ['instituciones'],
    queryFn: institucionesApi.listar
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.listar
  })

  const { data: config = {} } = useQuery({ 
    queryKey: ['config'], 
    queryFn: configuracionApi.get 
  })

  // -- LOGICA DE FILTRADO Y AGRUPACION --
  const groupedData = useMemo(() => {
    let filtered = productos.filter(p => 
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.codigoBarra?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groups: Record<string, { label: string; items: any[] }> = {}

    filtered.forEach(p => {
      let key = 'GENERAL'
      let label = 'Productos Generales'

      if (groupBy === 'CATEGORIA') {
        const cat = categorias.find(c => c.id === p.categoriaId)
        key = p.categoriaId || 'SIN_CAT'
        label = cat?.nombre || 'Sin Categoría'
      } else if (groupBy === 'INSTITUCION') {
        const inst = instituciones.find(i => i.id === p.institucionId)
        key = p.institucionId || 'GENERAL'
        label = inst?.nombre || 'General / Venta Libre'
      }

      if (!groups[key]) groups[key] = { label, items: [] }
      groups[key].items.push(p)
    })

    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label))
  }, [productos, searchQuery, groupBy, categorias, instituciones])

  const getTarifaLabel = (t: string) => {
    switch(t) {
      case 'precioFinal': return 'Venta Final'
      case 'precioRevendedor': return 'Revendedor'
      case 'precioEmpresa': return 'Corporativo'
      case 'precioRevendido': return 'Revendido'
      default: return ''
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
               <Tags className="text-white" size={24} />
             </div>
             Catálogo de Precios
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Acceso Dinámico • {productos.length} Productos Sincronizados
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => setVistaInterna(v => !v)}
              className={`px-5 py-3 text-[10px] font-black rounded-2xl border transition-all uppercase tracking-widest flex items-center gap-2 ${
                vistaInterna 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-200 scale-105' 
                  : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {vistaInterna ? <Info size={14}/> : <TrendingUp size={14}/>}
              {vistaInterna ? 'VISTA RENTABILIDAD' : 'VISTA PÚBLICA'}
            </button>
          )}
          <button className="px-5 py-3 text-[10px] font-black bg-white border border-gray-200 text-gray-400 rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase tracking-widest flex items-center gap-2">
            <Download size={14} />
            PDF
          </button>
        </div>
      </header>

      {/* CONTROLES DINÁMICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            placeholder="Buscar por nombre o código..."
            className="w-full bg-gray-50/50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="lg:col-span-4 flex items-center gap-2 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
           {(['CATEGORIA', 'INSTITUCION', 'NINGUNO'] as GroupBy[]).map(g => (
             <button
               key={g}
               onClick={() => setGroupBy(g)}
               className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                 groupBy === g ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               {g === 'NINGUNO' ? 'PLANO' : g}
             </button>
           ))}
        </div>

        <div className="lg:col-span-4 flex items-center gap-2 bg-indigo-50/30 p-1 rounded-2xl border border-indigo-100">
           {(['precioFinal', 'precioRevendedor', 'precioEmpresa', 'precioRevendido'] as TarifaType[]).map(t => {
             const canSee = usuario?.tarifaVenta === 'TODAS' || 
                            usuario?.tarifaVenta === t.replace('precio', 'PRECIO_').toUpperCase() ||
                            (t === 'precioFinal' && usuario?.tarifaVenta === 'PRECIO_FINAL') ||
                            isAdmin;
             if (!canSee) return null;

             return (
               <button
                 key={t}
                 onClick={() => setSelectedTarifa(t)}
                 className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                   selectedTarifa === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'
                 }`}
               >
                 {t.slice(6)}
               </button>
             )
           })}
        </div>
      </div>

      {loadingProds && (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic animate-pulse">Sincronizando Catálogo Real...</p>
        </div>
      )}

      {!loadingProds && groupedData.length === 0 && (
         <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200">
            <Search className="mx-auto text-gray-200 mb-6" size={64} />
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No encontramos coincidencias</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ajusta los filtros o intenta con otro término</p>
         </div>
      )}

      <div className="space-y-12">
        {groupedData.map((group) => (
          <section key={group.label} className="space-y-4">
            <div className="flex items-center gap-4 group">
               <div className="h-px bg-gray-100 flex-1" />
               <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic flex items-center gap-2 group-hover:text-indigo-600 transition-all">
                 <div className="w-2 h-2 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100" />
                 {group.label}
                 <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-100 rounded-lg text-gray-400 lowercase italic">({group.items.length} skus)</span>
               </h2>
               <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {group.items.map((prod: any) => {
                const precio = prod[selectedTarifa] || 0
                const costoEstimado = prod.precioFinal * 0.45 // Mock logic if logic helper is not ready
                // En un sistema real usaríamos el helper industrial
                const margen = precio > 0 ? (precio - (costoEstimado)) / precio : 0

                return (
                  <div key={prod.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                    {/* Indicador de Institución en vista categoria */}
                    {groupBy === 'CATEGORIA' && prod.institucionId && (
                      <div className="absolute top-0 right-0 p-3">
                        <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase px-3 py-1 rounded-bl-2xl rounded-tr-lg border border-indigo-100">
                          {instituciones.find(i => i.id === prod.institucionId)?.nombre}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        {prod.codigoBarra && (
                          <span className="text-[10px] font-mono text-gray-300 block mb-1">#{prod.codigoBarra}</span>
                        )}
                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-all uppercase">{prod.nombre}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Precio {getTarifaLabel(selectedTarifa)}</span>
                        <div className="text-3xl font-black text-gray-900 italic tracking-tighter">
                          {formatCurrency(precio)}
                        </div>
                      </div>
                      
                      {vistaInterna && (
                        <div className="text-right">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Margen Neto</span>
                          <span className={`text-xs font-black px-4 py-1.5 rounded-xl border ${margenColor(margen)}`}>
                            {(margen * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex -space-x-2">
                         {prod.talles?.map((t: any, idx: number) => (
                           <div key={idx} className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-400 uppercase shadow-sm">
                             {t.talle}
                           </div>
                         ))}
                      </div>
                      <button className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
