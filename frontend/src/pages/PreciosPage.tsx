import { useState, useMemo } from 'react'
import { formatCurrency } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { productosApi, institucionesApi, categoriasApi, configuracionApi } from '../lib/api'
import { Building2, Plus, Download, LayoutTemplate, Info, TrendingUp, Search, Filter, Tags, ChevronRight, LayoutGrid, List, FileText } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import StockTraceabilityCard from '../components/StockTraceabilityCard'

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
  const [viewMode, setViewMode] = useState<'cards' | 'lista'>(() => {
    return (localStorage.getItem('precios-view-mode') as 'cards' | 'lista') || 'lista'
  })

  const changeViewMode = (mode: 'cards' | 'lista') => {
    setViewMode(mode)
    localStorage.setItem('precios-view-mode', mode)
  }

  const navigate = useNavigate()
  
  // Ficha técnica y presupuestador
  const [verFicha, setVerFicha] = useState<any | null>(null)
  const [selectedTalle, setSelectedTalle] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [showPhotos, setShowPhotos] = useState(false)

  const [draftCount, setDraftCount] = useState(() => {
    const draftStr = localStorage.getItem('unifai-draft-budget')
    if (draftStr) {
      const draft = JSON.parse(draftStr)
      return draft.lineas?.length || 0
    }
    return 0
  })

  const handleOpenFicha = (prod: any) => {
    setVerFicha(prod)
    setSelectedTalle(prod.talles?.[0]?.talle || '')
    setCantidad(1)
    setUnitPrice(prod[selectedTarifa] || 0)
    setShowPhotos(false)
  }

  const handleAddToBudget = (prod: any, talleName: string, qty: number, price: number, startNew = false) => {
    const draftStr = localStorage.getItem('unifai-draft-budget')
    let draft = (draftStr && !startNew) ? JSON.parse(draftStr) : { lineas: [] }

    const newLine = {
      tipoItem: 'PRODUCTO',
      productoNombre: prod.nombre,
      talle: talleName,
      cantidad: qty,
      precioUnitario: price,
      precioBordado: 0,
      precioEstampado: 0,
      bordado: ''
    }

    draft.lineas.push(newLine)
    localStorage.setItem('unifai-draft-budget', JSON.stringify(draft))
    setDraftCount(draft.lineas.length)
    
    toast.success(`${prod.nombre} (Talle ${talleName}) agregado al presupuesto.`, {
      action: {
        label: 'Ver Presupuesto',
        onClick: () => navigate('/presupuestos?open=true')
      }
    })

    if (startNew) {
      navigate('/presupuestos?open=true')
    }
  }
  
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
    <div className="w-full px-4 md:px-12 py-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
               <Tags className="text-white" size={24} />
             </div>
             Catálogo de Precios
          </h1>
          <p className="text-gray-400 font-semibold text-xs mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Acceso Dinámico • {productos.length} Productos Sincronizados
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => setVistaInterna(v => !v)}
              className={`px-5 py-3 text-xs font-semibold rounded-2xl border transition-all flex items-center gap-2 ${
                vistaInterna 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-200 scale-105' 
                  : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {vistaInterna ? <Info size={14}/> : <TrendingUp size={14}/>}
              {vistaInterna ? 'Vista Rentabilidad' : 'Vista Pública'}
            </button>
          )}

          {/* CONTROL DE VISTA */}
          <div className="flex items-center bg-[#1a1b1e]/60 border border-white/5 p-1 rounded-2xl shadow-xl">
            <button
              onClick={() => changeViewMode('lista')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'lista'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Vista de Lista"
            >
              <List size={12} />
              <span>Lista</span>
            </button>
            <button
              onClick={() => changeViewMode('cards')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid size={12} />
              <span>Cards</span>
            </button>
          </div>

          {draftCount > 0 && (
            <button
              onClick={() => navigate('/presupuestos?open=true')}
              className="px-5 py-3 text-xs font-semibold bg-indigo-600 border border-indigo-500 text-white rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20"
            >
              <FileText size={14} />
              Presupuesto Abierto ({draftCount})
            </button>
          )}

          <button className="px-5 py-3 text-xs font-semibold bg-[#1a1b1e]/60 border border-white/5 text-gray-400 rounded-2xl hover:border-white/10 hover:text-white transition-all flex items-center gap-2">
            <Download size={14} />
            PDF
          </button>
        </div>
      </header>

      {/* CONTROLES DINÁMICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-[#1a1b1e]/60 backdrop-blur-xl p-3.5 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            placeholder="Buscar por nombre o código..."
            className="w-full bg-black/30 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="lg:col-span-4 flex items-center gap-2 bg-black/20 p-1 rounded-2xl border border-white/5">
           {(['CATEGORIA', 'INSTITUCION', 'NINGUNO'] as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all ${
                  groupBy === g ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {g === 'NINGUNO' ? 'Plano' : g.charAt(0) + g.slice(1).toLowerCase()}
              </button>
           ))}
        </div>

        <div className="lg:col-span-4 flex items-center gap-2 bg-indigo-500/5 p-1 rounded-2xl border border-indigo-500/10">
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
                 className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all ${
                   selectedTarifa === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400/70 hover:text-indigo-300'
                 }`}
               >
                 {t === 'precioFinal' ? 'Final' : t.slice(6)}
               </button>
             )
           })}
        </div>
      </div>

      {loadingProds && (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-400 animate-pulse">Sincronizando Catálogo Real...</p>
        </div>
      )}

       {!loadingProds && groupedData.length === 0 && (
          <div className="bg-[#1a1b1e]/40 rounded-[3rem] p-20 text-center border border-dashed border-white/5 shadow-2xl">
             <Search className="mx-auto text-gray-600 mb-6" size={64} />
             <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No encontramos coincidencias</h3>
             <p className="text-sm font-medium text-gray-500">Ajusta los filtros o intenta con otro término</p>
          </div>
       )}

      <div className="space-y-12">
        {groupedData.map((group) => (
          <section key={group.label} className="space-y-4">
            <div className="flex items-center gap-4 group">
               <div className="h-px bg-white/10 flex-1" />
               <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2 group-hover:text-indigo-600 transition-all">
                 <div className="w-2 h-2 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100" />
                 {group.label}
                 <span className="text-xs ml-2 px-2 py-0.5 bg-white/5 rounded-lg text-gray-500">({group.items.length} skus)</span>
               </h2>
               <div className="h-px bg-white/10 flex-1" />
            </div>

            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {group.items.map((prod: any) => {
                  const precio = prod[selectedTarifa] || 0
                  const costoEstimado = prod.precioFinal * 0.45 
                  const margen = precio > 0 ? (precio - (costoEstimado)) / precio : 0

                  return (
                    <div key={prod.id} onClick={() => handleOpenFicha(prod)} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group overflow-hidden relative cursor-pointer">
                      {/* Indicador de Institución en vista categoria */}
                      {groupBy === 'CATEGORIA' && prod.institucionId && (
                        <div className="absolute top-0 right-0 p-3">
                          <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-bl-2xl rounded-tr-lg border border-indigo-100">
                            {instituciones.find(i => i.id === prod.institucionId)?.nombre}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-6">
                        <div>
                          {prod.codigoBarra && (
                            <span className="text-xs font-mono text-gray-400 block mb-1">#{prod.codigoBarra}</span>
                          )}
                          <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-all">{prod.nombre}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-gray-400 block mb-1">Precio {getTarifaLabel(selectedTarifa)}</span>
                          <div className="text-3xl font-bold text-gray-900 tracking-tighter">
                            {formatCurrency(precio)}
                          </div>
                        </div>
                        
                        {vistaInterna && (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-gray-400 block mb-1">Margen Neto</span>
                            <span className={`text-xs font-semibold px-4 py-1.5 rounded-xl border ${margenColor(margen)}`}>
                              {(margen * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex -space-x-2">
                           {prod.talles?.map((t: any, idx: number) => (
                             <div key={idx} className="w-9 h-9 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-500 shadow-sm">
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
            ) : (
              <div className="overflow-x-auto bg-[#1a1b1e]/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] shadow-2xl relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-8 py-5 text-sm font-semibold text-gray-400">Código</th>
                      <th className="px-8 py-5 text-sm font-semibold text-gray-400">Producto</th>
                      {groupBy === 'CATEGORIA' && (
                        <th className="px-8 py-5 text-sm font-semibold text-gray-400">Institución</th>
                      )}
                      {groupBy === 'INSTITUCION' && (
                        <th className="px-8 py-5 text-sm font-semibold text-gray-400">Categoría</th>
                      )}
                      {groupBy === 'NINGUNO' && (
                        <>
                          <th className="px-8 py-5 text-sm font-semibold text-gray-400">Categoría</th>
                          <th className="px-8 py-5 text-sm font-semibold text-gray-400">Institución</th>
                        </>
                      )}
                      <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right">Talles</th>
                      <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right">Precio ({getTarifaLabel(selectedTarifa)})</th>
                      {vistaInterna && (
                        <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right">Margen</th>
                      )}
                      <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {group.items.map((prod: any) => {
                      const precio = prod[selectedTarifa] || 0
                      const costoEstimado = prod.precioFinal * 0.45
                      const margen = precio > 0 ? (precio - costoEstimado) / precio : 0

                      const cat = categorias.find(c => c.id === prod.categoriaId)
                      const inst = instituciones.find(i => i.id === prod.institucionId)

                      return (
                        <tr key={prod.id} onClick={() => handleOpenFicha(prod)} className="group hover:bg-white/[0.01] transition-all cursor-pointer border-b border-white/[0.02]">
                          <td className="px-8 py-5 text-sm font-mono text-gray-400">
                            {prod.codigoBarra ? `#${prod.codigoBarra}` : '-'}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-semibold text-sm border border-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                                {prod.nombre.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-base font-bold text-gray-100 group-hover:text-indigo-400 transition-colors">
                                  {prod.nombre}
                                </span>
                                <div className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-2 uppercase tracking-wider">
                                  {cat && <span>Categoría: <strong className="text-gray-400">{cat.nombre}</strong></span>}
                                  {cat && prod.temporada && <span className="text-gray-700">•</span>}
                                  {prod.temporada && <span>Temporada: <strong className="text-gray-400">{prod.temporada}</strong></span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          {groupBy === 'CATEGORIA' && (
                            <td className="px-8 py-5">
                              {inst ? (
                                <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-indigo-500/20 shadow-sm">
                                  {inst.nombre}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500 font-bold">-</span>
                              )}
                            </td>
                          )}
                          {groupBy === 'INSTITUCION' && (
                            <td className="px-8 py-5">
                              {cat ? (
                                <span className="bg-gray-500/10 text-gray-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-500/20">
                                  {cat.nombre}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500 font-bold">-</span>
                              )}
                            </td>
                          )}
                          {groupBy === 'NINGUNO' && (
                            <>
                              <td className="px-8 py-5">
                                {cat ? (
                                  <span className="bg-gray-500/10 text-gray-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-500/20">
                                    {cat.nombre}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500 font-bold">-</span>
                                )}
                              </td>
                              <td className="px-8 py-5">
                                {inst ? (
                                  <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-indigo-500/20 shadow-sm">
                                    {inst.nombre}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500 font-bold">-</span>
                                )}
                              </td>
                            </>
                          )}
                          <td className="px-8 py-5">
                            <div className="flex justify-end gap-1.5 flex-wrap max-w-[220px] ml-auto">
                              {prod.talles?.map((t: any, idx: number) => (
                                <span key={idx} className="text-sm font-semibold text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 transition-colors">
                                  {t.talle}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right font-bold text-indigo-400 text-lg tracking-tight">
                            {formatCurrency(precio)}
                          </td>
                          {vistaInterna && (
                            <td className="px-8 py-5 text-right">
                              <span className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${
                                margen >= 0.50 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                margen >= 0.40 ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                margen >= 0.20 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              } shadow-sm`}>
                                {(margen * 100).toFixed(0)}%
                              </span>
                            </td>
                          )}
                          <td className="px-8 py-5 text-center">
                            <button className="bg-white/5 hover:bg-indigo-600 text-gray-500 hover:text-white p-3 rounded-2xl transition-all border border-white/5">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

{/* MODAL VISTA PREVIA FICHA TÉCNICA Y PRESUPUESTADOR */}
      {verFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setVerFicha(null)} />
           <div className="bg-[#1a1b1e] w-full max-w-5xl rounded-[3rem] shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden border border-white/5 flex flex-col max-h-[95vh]">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                 <div className="space-y-2 text-left">
                    <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">{verFicha.nombre}</h2>
                    <div className="flex gap-4 items-center font-semibold text-sm text-indigo-400">
                       <span className="bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/10 font-semibold uppercase">SKU: {verFicha.codigoBarra || verFicha.id.substring(0,8).toUpperCase()}</span>
                       <span className="w-1 h-1 bg-gray-600 rounded-full" />
                       <span className="text-gray-500 font-semibold uppercase">{categorias.find(c => c.id === verFicha.categoriaId)?.nombre || 'Categoría General'}</span>
                    </div>
                 </div>
                 <button onClick={() => setVerFicha(null)} className="bg-white/5 text-gray-400 hover:text-white w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:bg-red-500/20">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
                 
                 {/* PANEL DE PRESUPUESTO */}
                  <div className="bg-black/30 border border-indigo-500/20 p-8 rounded-[2rem] shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    {/* Talles */}
                    <div className="md:col-span-5 space-y-3 text-left w-full">
                      <label className="text-sm font-semibold text-indigo-400">1. Seleccionar Talle</label>
                      <div className="flex flex-wrap gap-2.5">
                        {verFicha.talles?.map((t: any) => {
                          const isSelected = selectedTalle === t.talle
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedTalle(t.talle)}
                              className={`w-16 h-16 text-sm font-semibold rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 scale-105' 
                                  : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              {t.talle}
                            </button>
                          )
                        })}
                        {(!verFicha.talles || verFicha.talles.length === 0) && (
                          <span className="text-sm text-gray-500 font-semibold py-4">Sin talles</span>
                        )}
                      </div>
                    </div>

                    {/* Cantidad */}
                    <div className="md:col-span-4 flex flex-col gap-3 text-left items-start md:border-l md:border-white/5 md:pl-8 w-full">
                      <label className="text-sm font-semibold text-gray-400">2. Cantidad</label>
                      <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl p-1.5 w-40 justify-between">
                        <button
                          type="button"
                          onClick={() => setCantidad(c => Math.max(1, c - 1))}
                          className="w-11 h-11 rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-semibold text-xl flex items-center justify-center select-none"
                        >
                          -
                        </button>
                        <span className="text-base font-bold text-white text-center w-12 select-none">
                          {cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCantidad(c => c + 1)}
                          className="w-11 h-11 rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-semibold text-xl flex items-center justify-center select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Precio, Total y Acciones */}
                    <div className="md:col-span-3 flex flex-col gap-4 md:border-l md:border-white/5 md:pl-8 w-full text-left">
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold text-gray-400">
                          Precio Unitario: <span className="font-mono text-gray-300 font-bold">{formatCurrency(unitPrice)}</span>
                        </div>
                        <div className="text-sm font-semibold text-emerald-500">
                          Total Estimado
                        </div>
                        <div className="text-3xl font-bold text-emerald-400 tracking-tight leading-none">
                          {formatCurrency(unitPrice * cantidad)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2.5 w-full shrink-0">
                        <button 
                          disabled={!selectedTalle}
                          onClick={() => handleAddToBudget(verFicha, selectedTalle, cantidad, unitPrice, false)}
                          className="w-full py-3.5 bg-black/40 border border-indigo-500/30 text-indigo-400 text-sm font-semibold rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-md disabled:opacity-50 active:scale-95"
                        >
                          Agregar a Abierto
                        </button>
                        <button 
                          disabled={!selectedTalle}
                          onClick={() => handleAddToBudget(verFicha, selectedTalle, cantidad, unitPrice, true)}
                          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-md disabled:opacity-50 active:scale-95"
                        >
                          Iniciar Nuevo
                        </button>
                        {draftCount > 0 && (
                          <button 
                            type="button"
                            onClick={() => navigate('/presupuestos?open=true')}
                            className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-sm font-semibold rounded-xl transition-all border border-emerald-500/20 hover:border-emerald-500/40 text-center flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            Ver Presupuesto Abierto ({draftCount}) →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                 {/* MATRIZ DE MEDIDAS (FULL WIDTH) */}
                  <div className="space-y-6 text-left">
                      <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-3">
                         <span className="w-4 h-px bg-indigo-500" />
                         Matriz Métrica de Producción (cm)
                      </h4>
                      <div className="bg-black/20 border border-white/5 rounded-[2rem] overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-white/5">
                               <tr className="text-xs font-semibold text-gray-400">
                                  <th className="px-6 py-4">Punto de Control</th>
                                  {Array.from(new Set(verFicha.medidas?.map((m: any) => m.talle))).map((t: any) => (
                                     <th key={t} className="px-6 py-4 text-center border-l border-white/5">{t}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                               {Array.from(new Set(verFicha.medidas?.map((m: any) => m.punto?.nombre))).map((punto: any) => (
                                  <tr key={punto} className="text-xs group transition-colors">
                                     <td className="px-6 py-4 font-semibold text-gray-400 group-hover:text-white transition-colors">{punto}</td>
                                     {Array.from(new Set(verFicha.medidas?.map((m: any) => m.talle))).map((t: any) => {
                                        const val = verFicha.medidas?.find((m: any) => m.punto?.nombre === punto && m.talle === t)?.valorCm
                                        return <td key={t} className="px-6 py-4 text-center text-gray-500 font-semibold border-l border-white/5 group-hover:text-indigo-400 transition-colors">{val || '—'}</td>
                                     })}
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                  </div>

                  {/* DOCUMENTACIÓN FOTOGRÁFICA (ACCORDION CARD) */}
                  <div className="pt-4 pb-10">
                     <button 
                       type="button"
                       onClick={() => setShowPhotos(s => !s)}
                       className={`w-full py-5 px-8 rounded-2xl border transition-all text-left flex items-center justify-between group bg-black/20 hover:bg-[#1a1b1e] ${
                         showPhotos ? 'border-indigo-500/40 shadow-lg' : 'border-white/5 hover:border-white/10'
                       }`}
                     >
                       <div className="flex items-center gap-4">
                         <div className={`p-2.5 rounded-xl transition-colors ${showPhotos ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                           <FileText size={18} />
                         </div>
                         <div>
                           <span className="text-sm font-semibold text-white">Documentación Fotográfica de Moldería</span>
                           <p className="text-xs text-gray-500 font-medium mt-0.5">
                             {verFicha.imagenes?.length || 0} archivos de diseño y referencias técnicas adjuntos
                           </p>
                         </div>
                       </div>
                       <span className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                         showPhotos 
                           ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' 
                           : 'bg-white/5 text-gray-400 border border-transparent group-hover:border-white/10 group-hover:text-white'
                       }`}>
                         {showPhotos ? 'Ocultar Fotos ▲' : 'Ver Fotos ▼'}
                       </span>
                     </button>
                     
                     {showPhotos && (
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300 text-left">
                           {verFicha.imagenes?.map((img: any) => (
                              <div key={img.id} className="aspect-square bg-black/40 rounded-[2rem] overflow-hidden group relative border border-white/5 shadow-xl">
                                 <img src={img.url} alt={img.etiqueta} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                 <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-semibold text-white">{img.etiqueta}</span>
                                    <span className="text-xs font-semibold text-indigo-400">HQ RAW</span>
                                  </div>
                              </div>
                           ))}
                           {(!verFicha.imagenes || verFicha.imagenes.length === 0) && (
                              <div className="col-span-full py-20 text-center bg-black/20 rounded-[2.5rem] border-2 border-dashed border-white/5">
                                 <p className="text-xs font-semibold text-gray-500">Sin archivos de moldería visual</p>
                              </div>
                           )}
                        </div>
                     )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
