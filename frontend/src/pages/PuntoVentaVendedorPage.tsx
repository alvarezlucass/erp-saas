import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { institucionesApi, productosApi, clientesApi, presupuestosApi, api, configuracionApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  ShoppingBag, Users, Building2, Search, X, Check, ArrowRight, ArrowLeft, Plus, 
  LayoutGrid, List, Save, ShieldAlert, Trash2, Lock, Clock, TrendingUp, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { BarcodeScannerModal } from '../components/BarcodeScannerModal'
import { Camera, History } from 'lucide-react'

interface CartItem {
  id: string
  productoId: string
  nombre: string
  talle: string
  cantidad: number
  precioUnitario: number
  entregado: boolean
  fotoUrl?: string
}

interface SellingSession {
  id: string
  startTime: string
  label: string
  institucionSel: any | null
  clienteId: string
  searchCli: string
  carrito: CartItem[]
  step: number // 1: Inst, 2: Prods
}

export default function PuntoVentaVendedorPage() {
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  
  // -- PERSISTENCIA & MULTI-SESION --
  const STORAGE_KEY = `pos_sessions_${usuario?.id}`
  const [sessions, setSessions] = useState<SellingSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : [{ 
      id: 'default', 
      startTime: new Date().toISOString(), 
      label: 'Cliente 1', 
      institucionSel: null, 
      clienteId: '', 
      searchCli: '', 
      carrito: [], 
      step: 1 
    }]
  })
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id || 'default')
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]

  const updateActiveSession = (update: Partial<SellingSession>) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...update } : s))
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  // -- VISTA --
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID')
  const [showCancelModal, setShowCancelModal] = useState<{ type: 'ITEM' | 'SESSION', id?: string } | null>(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [señaAmount, setSeñaAmount] = useState(0)
  const [searchProds, setSearchProds] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  // -- DATA FETCHING --
  const { data: instituciones = [] } = useQuery({ queryKey: ['instituciones'], queryFn: institucionesApi.listar })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.listar() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clientesApi.listar })
  
  // Resumen del día para el vendedor (Mi Actividad)
  const { data: hoyResumen = [] } = useQuery({ 
    queryKey: ['mi-actividad-pos'], 
    queryFn: () => api.get('/presupuestos').then(r => r.data.filter((p: any) => 
        p.usuarioId === usuario?.id && 
        new Date(p.creadoEn).toDateString() === new Date().toDateString()
    ))
  })

  // -- OPERACIONES --
  const getPrecioAutorizado = (prod: any) => {
    if (!usuario?.tarifaVenta || usuario.tarifaVenta === 'PRECIO_FINAL' || usuario.tarifaVenta === 'TODAS') return prod.precioFinal || 0
    if (usuario.tarifaVenta === 'PRECIO_REVENDEDOR') return prod.precioRevendedor || 0
    if (usuario.tarifaVenta === 'PRECIO_EMPRESA') return prod.precioEmpresa || 0
    if (usuario.tarifaVenta === 'PRECIO_REVENDIDO') return prod.precioRevendido || 0
    return prod.precioFinal || 0
  }

  const addToCart = (product: any, talle: string, cantidadVal: number = 1) => {
    const talleData = product.talles?.find((t: any) => t.talle === talle)
    const specificPrice = talleData?.precioVenta

    const existing = activeSession.carrito.find(c => c.productoId === product.id && c.talle === talle)
    let newCart = []
    if (existing) {
       newCart = activeSession.carrito.map(c => c.productoId === product.id && c.talle === talle ? { ...c, cantidad: c.cantidad + cantidadVal } : c)
    } else {
       newCart = [...activeSession.carrito, {
         id: Math.random().toString(36).substr(2, 9),
         productoId: product.id,
         nombre: product.nombre,
         talle,
         cantidad: cantidadVal,
         precioUnitario: specificPrice || getPrecioAutorizado(product),
         entregado: true,
         fotoUrl: product.imagenes?.[0]?.url
       }]
    }
    updateActiveSession({ carrito: newCart })
    toast.success(`${product.nombre} añadido (x${cantidadVal})`)
  }

  const handleScanSuccess = (code: string) => {
    setShowScanner(false)
    
    // 1. Buscar por SKU específico (Talle)
    let foundProd: any = null
    let foundTalle: string = ""
    
    productos.forEach((p: any) => {
      const talleMatch = p.talles?.find((t: any) => t.codigoBarra === code)
      if (talleMatch) {
         foundProd = p
         foundTalle = talleMatch.talle
      }
    })
    
    if (foundProd) {
       addToCart(foundProd, foundTalle)
       return
    }
    
    // 2. Buscar por código de producto genérico
    const genericProd = productos.find((p: any) => p.codigoBarra === code)
    if (genericProd) {
       setProductSel(genericProd)
       toast.info(`Producto identificado: ${genericProd.nombre}. Seleccione el talle.`)
       return
    }
    
    toast.error(`Código no reconocido: ${code}`)
  }

  const crearPedidoMut = useMutation({
    mutationFn: (data: any) => presupuestosApi.crear(data),
    onSuccess: () => {
      toast.success('Estado Guardado con éxito')
      setSessions(prev => {
        const next = prev.filter(s => s.id !== activeSessionId)
        if (next.length === 0) return [{ id: 'default', startTime: new Date().toISOString(), label: 'Cliente 1', institucionSel: null, clienteId: '', searchCli: '', carrito: [], step: 1 }]
        return next
      })
      setActiveSessionId('default')
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['mi-actividad-pos'] })
    }
  })

  const auditarCancelacionMut = useMutation({
    mutationFn: (data: any) => api.post('/auditoria/cancelacion', data),
    onSuccess: (res) => {
      if (res.data.isCritical) toast.error(res.data.message, { duration: 5000 })
      else toast.warning(res.data.message)
      
      if (showCancelModal?.type === 'SESSION') {
         setSessions(prev => {
            const next = prev.filter(s => s.id !== activeSessionId)
            if (next.length === 0) return [{ id: 'default', startTime: new Date().toISOString(), label: 'Cliente 1', institucionSel: null, clienteId: '', searchCli: '', carrito: [], step: 1 }]
            return next
         })
         setActiveSessionId('default')
      } else {
         updateActiveSession({ carrito: activeSession.carrito.filter(c => c.id !== showCancelModal?.id) })
      }
      resetCancelForm()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error verificando contraseña')
    }
  })

  const resetCancelForm = () => {
    setShowCancelModal(null)
    setCancelPassword('')
    setCancelReason('')
  }

  const handleAuditCancel = () => {
    if (!cancelReason) return toast.error('Debes indicar un motivo')
    if (!cancelPassword) return toast.error('Ingresa tu contraseña')

    const itemsACancelar = showCancelModal?.type === 'SESSION' 
        ? activeSession.carrito 
        : activeSession.carrito.filter(c => c.id === showCancelModal?.id)

    const monto = itemsACancelar.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0)
    const unidades = itemsACancelar.reduce((acc, i) => acc + i.cantidad, 0)

    auditarCancelacionMut.mutate({
      clienteNombre: activeSession.searchCli || 'Anonimo',
      monto,
      unidades,
      motivo: cancelReason,
      itemsJson: itemsACancelar,
      fechaInicio: activeSession.startTime,
      password: cancelPassword
    })
  }

  const handleFinalizarAccion = (estado: 'MOSTRADOR_BORRADOR' | 'MOSTRADOR_RESERVA') => {
    if (!activeSession.clienteId && !activeSession.searchCli) return toast.error('Seleccione un cliente')
    
    crearPedidoMut.mutate({
      clienteId: activeSession.clienteId || undefined,
      clienteNombre: clientes.find((c:any)=>c.id===activeSession.clienteId)?.nombre || activeSession.searchCli,
      institucionId: activeSession.institucionSel?.id,
      estado,
      senia: estado === 'MOSTRADOR_RESERVA' ? señaAmount : 0,
      canal: 'GESTION',
      lineas: activeSession.carrito.map(i => ({
        tipoItem: 'PRODUCTO',
        productoId: i.productoId,
        productoNombre: i.nombre,
        talle: i.talle,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        entregado: i.entregado
      }))
    })
    setShowReservationModal(false)
  }

  const prodsInstitucion = useMemo(() => {
    let filtered = activeSession.institucionSel 
      ? productos.filter((p: any) => p.institucionId === activeSession.institucionSel.id || !p.institucionId)
      : productos

    if (searchProds) {
       const lower = searchProds.toLowerCase()
       filtered = filtered.filter((p: any) => 
          p.nombre.toLowerCase().includes(lower) || 
          p.codigoBarra?.toLowerCase().includes(lower) ||
          p.talles?.some((t: any) => t.codigoBarra?.toLowerCase().includes(lower))
       )
    }
    return filtered
  }, [activeSession.institucionSel, productos, searchProds])

  const totalCart = activeSession.carrito.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0)

  const [showReservationsList, setShowReservationsList] = useState(false)
  const [productSel, setProductSel] = useState<any | null>(null)

  // Reservas Pendientes (Globales)
  const { data: reservasPendientes = [] } = useQuery({
    queryKey: ['reservas-pendientes'],
    queryFn: () => api.get('/presupuestos').then(r => r.data.filter((p: any) => p.estado === 'MOSTRADOR_RESERVA')),
    enabled: showReservationsList
  })

  return (
    <div className="max-w-[1600px] mx-auto p-6 min-h-screen bg-[#f8fafc]">
      <BarcodeScannerModal 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanSuccess}
        title="Escanear Producto / SKU"
      />
      
      {/* 1. TABS DE SESIÓN */}
      <nav className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
         <button 
            onClick={() => setShowReservationsList(true)}
            className="h-14 px-6 rounded-2xl bg-amber-500 text-white flex items-center gap-3 shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all font-black text-xs uppercase tracking-widest shrink-0"
         >
            <History size={18} />
            RETOMAR RESERVA
         </button>
         <div className="w-px h-10 bg-gray-200 mx-2" />
         {sessions.map((s, idx) => (
            <button
               key={s.id}
               onClick={() => setActiveSessionId(s.id)}
               className={`relative h-14 min-w-[180px] px-6 rounded-2xl flex items-center justify-between gap-4 border transition-all ${
                 activeSessionId === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
               }`}
            >
               <div className="flex flex-col items-start truncate text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ficha 0{idx+1}</span>
                  <span className="text-sm font-black truncate max-w-[100px] uppercase">{s.searchCli || 'Nuevo Cliente'}</span>
               </div>
               {s.carrito.length > 0 && <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${activeSessionId === s.id ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-600'}`}>{s.carrito.length}</span>}
            </button>
         ))}
         <button 
            onClick={() => {
              const newId = Math.random().toString(36).substr(2, 9)
              setSessions([...sessions, { id: newId, startTime: new Date().toISOString(), label: `Cliente ${sessions.length + 1}`, institucionSel: null, clienteId: '', searchCli: '', carrito: [], step: 1 }])
              setActiveSessionId(newId)
            }}
            className="w-14 h-14 rounded-2xl bg-white border border-dashed border-gray-200 text-gray-300 flex items-center justify-center hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
         >
            <Plus size={24} />
         </button>
      </nav>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-gray-900 rounded-3xl shadow-xl">
             <ShoppingBag className="text-white" size={28} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase italic">Punto de Venta</h1>
              <div className="flex items-center gap-2 mt-2">
                 <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded uppercase">Vendedor: {usuario?.nombre}</span>
                 <span className="text-gray-300 text-[10px] font-bold tracking-widest">• UNIFIAI INDUSTRIAL POS</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex-1 max-w-2xl">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
                placeholder="Buscar productos por nombre o SKU..."
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm font-bold border-none outline-none"
                value={searchProds}
                onChange={e => setSearchProds(e.target.value)}
             />
             <button 
                type="button" 
                onClick={() => setShowScanner(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
             >
                <Camera size={18} />
             </button>
           </div>
           <div className="flex gap-1 bg-gray-50 rounded-[1.5rem] p-1">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'GRID' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <List size={18} />
              </button>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
             {activeSession.step === 1 ? (
               <motion.div key="inst" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-3">
                       <Building2 className="text-indigo-600" size={20} />
                       FILTRAR POR INSTITUCIÓN
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                     {instituciones.map((inst: any) => (
                        <button 
                           key={inst.id}
                           onClick={() => updateActiveSession({ institucionSel: inst, step: 2 })}
                           className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col items-center gap-4 group"
                        >
                           <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
                              {inst.logoUrl ? <img src={inst.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="text-gray-200" size={32} />}
                           </div>
                           <span className="text-[10px] font-black text-gray-800 text-center uppercase tracking-tight group-hover:text-indigo-600">{inst.nombre}</span>
                        </button>
                     ))}
                     <button 
                       onClick={() => updateActiveSession({ institucionSel: { id: null, nombre: 'PRODUCTOS GENERALES' }, step: 2 })}
                       className="bg-gray-50 p-6 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center gap-4 group hover:bg-white hover:border-indigo-400 transition-all"
                     >
                       <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl">👕</div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">VENTA GENERAL</span>
                     </button>
                  </div>
               </motion.div>
             ) : (
               <motion.div key="prods" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4 text-left">
                       <button onClick={() => updateActiveSession({ step: 1 })} className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-indigo-600 shadow-sm transition-all"><ArrowLeft size={18}/></button>
                       <div>
                          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{activeSession.institucionSel?.nombre}</h2>
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none bg-indigo-50 px-2 py-0.5 rounded">Catálogo Disponible</span>
                       </div>
                    </div>
                  </div>

                  {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                        {prodsInstitucion.map((prod: any) => (
                          <div key={prod.id} 
                            onClick={() => setProductSel(prod)}
                            className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:border-indigo-500 hover:shadow-2xl transition-all cursor-pointer flex flex-col"
                          >
                            <div className="aspect-square bg-gray-50 relative">
                               {prod.imagenes?.[0] ? <img src={prod.imagenes[0].url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" /> : <div className="w-full h-full flex items-center justify-center opacity-20 text-5xl grayscale">👕</div>}
                               <div className="absolute top-4 right-4 flex flex-col gap-2">
                                  {prod.talles?.map((t: any) => (
                                    <button 
                                      key={t.id}
                                      onClick={() => addToCart(prod, t.talle)}
                                      className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 active:scale-90"
                                    >
                                      {t.talle}
                                    </button>
                                  ))}
                               </div>
                            </div>
                            <div className="p-5">
                               <h3 className="text-xs font-black text-gray-900 leading-tight uppercase truncate">{prod.nombre}</h3>
                               <div className="mt-3 text-lg font-black text-indigo-600">{formatCurrency(getPrecioAutorizado(prod))}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-left">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-100">
                             <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unit.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Rápido</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {prodsInstitucion.map((prod: any) => (
                               <tr key={prod.id} className="hover:bg-indigo-50/20 transition-all group font-bold">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                                           {prod.imagenes?.[0] ? <img src={prod.imagenes[0].url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10 text-xl grayscale">👕</div>}
                                        </div>
                                        <div>
                                           <div className="text-xs font-black text-gray-900 uppercase">{prod.nombre}</div>
                                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">SKU: {prod.codigoBarra || '---'}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-black text-indigo-600">{formatCurrency(getPrecioAutorizado(prod))}</td>
                                  <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end gap-2">
                                        {prod.talles?.map((t: any) => (
                                          <button 
                                            key={t.id}
                                            onClick={() => addToCart(prod, t.talle)}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                                          >
                                            {t.talle} +
                                          </button>
                                        ))}
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  )}
               </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 text-left">
           <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                 <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag size={16} className="text-indigo-600" /> Checkout Cliente
                 </h3>
                 <button onClick={() => setShowCancelModal({ type: 'SESSION' })} className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                   <Trash2 size={20} />
                 </button>
              </div>

              <div className="mb-8 space-y-4">
                 <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                       placeholder="Asignar Cliente..."
                       className="w-full bg-gray-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-indigo-100 transition-all font-mono"
                       value={activeSession.searchCli}
                       onChange={e => updateActiveSession({ searchCli: e.target.value, clienteId: '' })}
                    />
                    {activeSession.searchCli && !activeSession.clienteId && (
                       <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-3xl border border-gray-100 mt-2 z-[60] py-4 max-h-60 overflow-y-auto scrollbar-hide">
                          {clientes.filter(c => c.activo && c.nombre.toLowerCase().includes(activeSession.searchCli.toLowerCase())).map((c: any) => (
                             <button key={c.id} onClick={() => updateActiveSession({ clienteId: c.id, searchCli: `${c.nombre} ${c.apellido || ''}` })} className="w-full px-6 py-3 text-left hover:bg-indigo-50 flex items-center justify-between">
                                <span className="text-xs font-black text-gray-700 uppercase">{c.nombre} {c.apellido}</span>
                                <Plus size={12} className="text-indigo-400" />
                             </button>
                          ))}
                       </div>
                    )}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 px-1 scrollbar-hide min-h-[200px]">
                 {activeSession.carrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                       <ShoppingBag size={64} className="text-gray-300" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Carrito Vacío</p>
                    </div>
                 ) : (
                    activeSession.carrito.map(item => (
                       <div key={item.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4 group">
                          <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shadow-sm">
                             {item.fotoUrl ? <img src={item.fotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-50 text-indigo-400 font-bold flex items-center justify-center">{item.talle}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="text-[11px] font-black text-gray-900 uppercase truncate">{item.nombre}</div>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-white text-[9px] font-black text-gray-400 rounded-lg">{item.talle}</span>
                                <span className="text-[10px] font-bold text-indigo-500">x{item.cantidad}</span>
                             </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                             <div className="text-xs font-black text-gray-900">{formatCurrency(item.precioUnitario * item.cantidad)}</div>
                             <button onClick={() => setShowCancelModal({ type: 'ITEM', id: item.id })} className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                          </div>
                       </div>
                    ))
                 )}
              </div>

              <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-50 space-y-6">
                 <div className="flex justify-between items-end">
                    <div>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1 italic">Total Venta</span>
                        <div className="text-3xl font-black text-indigo-600 leading-none tracking-tighter italic font-mono">
                          {formatCurrency(totalCart)}
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowReservationModal(true)} disabled={activeSession.carrito.length === 0} className="flex items-center justify-center gap-3 py-4 bg-white border border-indigo-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-30"><Save size={16} />RESERVAR</button>
                    <button onClick={() => handleFinalizarAccion('MOSTRADOR_BORRADOR')} disabled={activeSession.carrito.length === 0} className="flex items-center justify-center gap-3 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl disabled:opacity-30"><Check size={16} />A CAJA</button>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl font-black italic">$</div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2"><TrendingUp size={16} /> Mi Actividad</h3>
                 <span className="text-[10px] font-black bg-indigo-500 px-3 py-1 rounded-full uppercase tracking-tighter italic">Hoy</span>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                 <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 block mb-1">Items</span>
                    <span className="text-2xl font-black">{hoyResumen.length}</span>
                 </div>
                 <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 block mb-1">Monto Hoy</span>
                    <span className="text-2xl font-black italic">{formatCurrency(hoyResumen.reduce((acc: number, p: any) => acc + p.total, 0))}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetCancelForm} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 p-10">
                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                <div className="text-center mb-8">
                   <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 border border-rose-100"><ShieldAlert size={32} /></div>
                   <h3 className="text-xl font-black uppercase tracking-tight italic">Auditoría Requerida</h3>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Toda cancelación queda registrada en el control de dueños</p>
                </div>
                <div className="space-y-6 text-left">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Motivo</label>
                      <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                         <option value="">Seleccionar...</option>
                         <option value="ERROR_CARGA">Error de carga</option>
                         <option value="CLIENTE_DESISTE">El cliente desistió</option>
                         <option value="PRECIO_ALTO">Precio muy alto</option>
                         <option value="OTRO">Otro</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Contraseña Vendedor</label>
                      <input type="password" placeholder="Clave de seguridad..." value={cancelPassword} onChange={e => setCancelPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                   </div>
                   <div className="pt-4 flex gap-3">
                      <button onClick={resetCancelForm} className="flex-1 py-4 text-[10px] font-black text-gray-400 border border-gray-100 rounded-2xl">Volver</button>
                      <button onClick={handleAuditCancel} disabled={auditarCancelacionMut.isPending} className="flex-1 py-4 bg-rose-600 text-white text-[10px] font-black rounded-2xl">ELIMINAR Y AUDITAR</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showReservationModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReservationModal(false)} className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 p-10">
                   <div className="bg-indigo-50 -mx-10 -mt-10 px-10 py-8 border-b border-indigo-100 flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Save size={24}/></div>
                      <div className="text-left">
                         <h3 className="text-xl font-black uppercase tracking-tight italic">Guardar Reserva</h3>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">El pedido quedará en pausa</p>
                      </div>
                   </div>
                   <div className="space-y-6 text-left">
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Total</span>
                            <span className="text-sm font-black text-gray-900">{formatCurrency(totalCart)}</span>
                         </div>
                         <div className="h-px bg-gray-200 my-4" />
                         <label className="text-[10px] font-black text-indigo-400 uppercase block mb-3">Seña / Pago Parcial</label>
                         <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-indigo-100 italic">
                            <span className="text-lg font-black text-gray-300 font-mono">$</span>
                            <input type="number" value={señaAmount} onChange={e => setSeñaAmount(parseFloat(e.target.value) || 0)} className="w-full text-2xl font-black text-gray-900 outline-none font-mono" placeholder="0.00" />
                         </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                         <AlertCircle className="text-amber-500 shrink-0" size={18} />
                         <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase italic">Las reservas compartidas permiten que cualquier compañero finalice la venta por ti.</p>
                      </div>
                      <button onClick={() => handleFinalizarAccion('MOSTRADOR_RESERVA')} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                         <Check size={20} /> CONFIRMAR RESERVA
                      </button>
                   </div>
                </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* --- MODAL LISTADO DE RESERVAS --- */}
      <AnimatePresence>
        {showReservationsList && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReservationsList(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 p-10 max-h-[80vh] flex flex-col overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight italic">Reservas Pendientes</h3>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Ventas pausadas por cobrar o retomar</p>
                    </div>
                    <button onClick={() => setShowReservationsList(false)} className="p-3 text-gray-300 hover:text-gray-600"><X /></button>
                 </div>

                 <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                    {reservasPendientes.length === 0 ? (
                       <div className="text-center py-20 opacity-30">
                          <History size={48} className="mx-auto mb-4" />
                          <p className="font-black text-xs uppercase tracking-widest">No hay reservas activas</p>
                       </div>
                    ) : (
                       reservasPendientes.map((r: any) => (
                          <button 
                            key={r.id} 
                            onClick={async () => {
                               const full = await api.get(`/presupuestos/${r.id}`)
                               const res = full.data
                               updateActiveSession({
                                  clienteId: res.clienteId,
                                  searchCli: res.clienteNombre,
                                  institucionSel: res.institucion,
                                  carrito: res.lineas.map((l: any) => ({
                                     id: Math.random().toString(36).substr(2, 9),
                                     productoId: l.productoId,
                                     nombre: l.productoNombre,
                                     talle: l.talle,
                                     cantidad: l.cantidad,
                                     precioUnitario: l.precioUnitario,
                                     entregado: l.entregado
                                  })),
                                  step: 2
                               })
                               setShowReservationsList(false)
                               toast.info(`Venta #${r.numero} cargada en ficha activa`)
                            }}
                            className="w-full bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-amber-500 hover:shadow-xl transition-all text-left"
                          >
                             <div>
                                <div className="text-[10px] font-black text-amber-600 uppercase mb-1">Presupuesto #{r.numero} • {formatCurrency(r.total)}</div>
                                <div className="text-sm font-black text-gray-900 uppercase">{r.clienteNombre || 'Sin nombre'}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-2 mt-1">
                                   <Clock size={10} /> {new Date(r.creadoEn).toLocaleString()}
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                {r.senia > 0 && <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black rounded-full">SEÑA: {formatCurrency(r.senia)}</span>}
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-amber-500 transition-all" />
                             </div>
                          </button>
                       ))
                    )}
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DETALLE PÚBLICO PRODUCTO --- */}
      <AnimatePresence>
         {productSel && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12 overflow-y-auto">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProductSel(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
               <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col lg:flex-row text-left">
                  <button onClick={() => setProductSel(null)} className="absolute top-8 right-8 z-20 w-12 h-12 bg-gray-100/50 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center text-gray-500 transition-all"><X size={20} /></button>

                  <div className="w-full lg:w-1/2 bg-gray-50 p-12 flex flex-col items-center justify-center border-r border-gray-100">
                     <div className="w-full aspect-square rounded-[2.5rem] bg-white shadow-2xl overflow-hidden mb-8">
                        {productSel.imagenes?.[0] ? <img src={productSel.imagenes[0].url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10rem] grayscale opacity-10">👕</div>}
                     </div>
                     <div className="flex gap-4 overflow-x-auto w-full px-2 scrollbar-hide pb-4">
                        {productSel.imagenes?.map((img: any, idx: number) => (
                           <div key={idx} className="w-20 h-20 rounded-2xl bg-white border border-gray-100 overflow-hidden shrink-0 shadow-md">
                              <img src={img.url} className="w-full h-full object-cover" />
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center">
                     <div className="mb-10">
                        <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{productSel.categoria?.nombre || 'INDUSTRIAL'}</span>
                        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight mt-4 leading-none">{productSel.nombre}</h2>
                        <div className="text-4xl font-black text-indigo-600 mt-6 italic font-mono">{formatCurrency(getPrecioAutorizado(productSel))}</div>
                     </div>

                     <div className="space-y-10">
                        <section>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Talles Disponibles</label>
                           <div className="flex flex-wrap gap-3">
                              {productSel.talles?.map((t: any) => (
                                 <button 
                                    key={t.id}
                                    onClick={() => { addToCart(productSel, t.talle); setProductSel(null); }}
                                    className={`relative min-w-[5rem] h-16 rounded-[1.25rem] border-2 transition-all flex flex-col items-center justify-center ${t.stockActual > 0 ? 'bg-white border-gray-100 text-gray-900 hover:border-indigo-500 hover:scale-110' : 'bg-gray-100 border-transparent text-gray-300 opacity-50 cursor-not-allowed'}`}
                                 >
                                    <span className="text-sm font-black">{t.talle}</span>
                                    <span className="text-[8px] font-bold text-gray-400">STOCK {t.stockActual}</span>
                                 </button>
                              ))}
                           </div>
                        </section>

                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                           <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase italic">Selecciona un talle para añadirlo al presupuesto. Los precios mostrados ya incluyen impuestos y ajustes de canal.</p>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

    </div>
  )
}

