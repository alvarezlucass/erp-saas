import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productosApi, categoriasApi, tallesApi, proveedoresApi, configuracionApi, institucionesApi, subCategoriasApi, usuariosApi } from '../lib/api'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast, Toaster } from 'react-hot-toast'
import { BarcodeScannerModal } from '../components/BarcodeScannerModal'
import { 
  Plus, Trash2, Calculator, Percent, TrendingUp, AlertCircle, CheckCircle2,
  Settings, UserPlus, FolderPlus, HelpCircle, Camera, Truck, ArrowLeft, Layers, Save
} from 'lucide-react'

// Segmentos definidos en la matriz
const SEGMENTOS = [
  { id: 'final', label: 'Final', color: 'bg-emerald-500' },
  { id: 'revendedor', label: 'Revendedor', color: 'bg-amber-500' },
  { id: 'empresa', label: 'Empresa', color: 'bg-blue-500' },
  { id: 'revendido', label: 'Revendido', color: 'bg-purple-500' }
]

export function AltaProductoRetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const qc = useQueryClient()
  const { usuario, setUsuario } = useAuthStore()

  // -- ESTADO MAESTRO (LIMPIO PARA GUARDAR Y NUEVO) --
  const initialState = {
    nombre: '',
    categoriaId: '',
    subCategoriaId: '',
    institucionId: '',
    temporada: 'TODO EL AÑO',
    barcode: '',
    skuProveedor: '',
    proveedorId: '',
    costoCompra: '',
    hasVariants: false,
    curvaId: '',
    fotoUrl: ''
  }

  // Configuración de vista (no persiste en este ejemplo, queda en estado local)
  const [configVista, setConfigVista] = useState({
    showFinal: true,
    showRevendedor: true,
    showEmpresa: true,
    showRevendido: true
  })

  const [form, setForm] = useState(initialState)
  const [subiendoImg, setSubiendoImg] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickProveedor, setShowQuickProveedor] = useState(false)
  const [showQuickCategoria, setShowQuickCategoria] = useState(false)
  const [showQuickSubCategoria, setShowQuickSubCategoria] = useState(false)
  const [showQuickReferencia, setShowQuickReferencia] = useState(false)
  const [showConfigVista, setShowConfigVista] = useState(false)

  // -- QUERIES --
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: categoriasApi.listar })
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: proveedoresApi.listar })
  const { data: instituciones = [] } = useQuery({ queryKey: ['instituciones'], queryFn: institucionesApi.listar })
  const { data: subCategorias = [] } = useQuery({ 
    queryKey: ['sub-categorias', form.categoriaId], 
    queryFn: () => subCategoriasApi.listar(form.categoriaId),
    enabled: !!form.categoriaId 
  })
  const { data: curvas = [] } = useQuery({ queryKey: ['curvas'], queryFn: tallesApi.listar })
  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: configuracionApi.get })

  // Cargar preferencias guardadas
  useEffect(() => {
    if (usuario?.preferencias?.retail_configVista) {
      setConfigVista(usuario.preferencias.retail_configVista)
    }
  }, [usuario])

  // Guardar preferencias automáticamente
  const mutationPrefs = useMutation({
    mutationFn: (newVista: typeof configVista) => usuariosApi.actualizarPreferencias({ 
      ...usuario?.preferencias, 
      retail_configVista: newVista 
    }),
    onSuccess: (res) => {
      if (usuario) setUsuario({ ...usuario, preferencias: res.preferencias })
    }
  })

  const toggleConfigVista = (key: keyof typeof configVista) => {
    const next = { ...configVista, [key]: !configVista[key] }
    setConfigVista(next)
    mutationPrefs.mutate(next)
  }

  // Query para Edición
  const { data: productoEdit } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosApi.obtener(id!),
    enabled: !!id
  })

  // Hidratación de estado
  useEffect(() => {
    if (productoEdit) {
      setForm({
        nombre: productoEdit.nombre,
        categoriaId: productoEdit.categoriaId || '',
        subCategoriaId: productoEdit.subCategoriaId || '',
        institucionId: productoEdit.institucionId || '',
        temporada: productoEdit.temporada || 'TODO EL AÑO',
        barcode: productoEdit.codigoBarra || '',
        skuProveedor: productoEdit.proveedores?.[0]?.codigoReferencia || '',
        proveedorId: productoEdit.proveedores?.[0]?.proveedorId || '',
        costoCompra: String(productoEdit.costoCompra || ''),
        hasVariants: (productoEdit.talles?.length || 0) > 0,
        curvaId: '', // La curva no se guarda como tal, solo los talles resultantes
        fotoUrl: productoEdit.imagenes?.[0]?.url || ''
      })
    }
  }, [productoEdit])

  const updateForm = (field: keyof typeof initialState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(initialState)
    toast.success('Formulario reiniciado para nueva carga')
  }

  // -- MOTOR DE COSTEO DINÁMICO (DETALLADO) --
  const calculatePricing = (segmentId: string) => {
    const base = parseFloat(form.costoCompra || '0')
    if (base <= 0) return { costInd: 0, taxes: 0, margin: 0, final: 0, marginPct: 0 }

    const getPct = (key: string) => parseFloat(config[`retail_${key}_${segmentId}`] || '0')

    // 1. Costos sobre Base (Adicionales Matriz)
    const overheadsPct = 
      getPct('mo_pct') + getPct('logistica_pct') + getPct('admin_pct') + 
      getPct('ventas_pct') + getPct('ley_25413') + getPct('fijos_pct') +
      [1, 2, 3].reduce((acc, i) => acc + getPct(`extra_cost_${i}_pct`), 0)

    const costInd = base * (1 + overheadsPct)

    // 2. Impuestos sobre Venta
    const taxSumPct = 
      getPct('iva') + getPct('iibb') + getPct('costo_tarjeta') + 
      getPct('comision_pct') + getPct('ley_cheque_vta') +
      [1, 2, 3].reduce((acc, i) => acc + getPct(`extra_tax_${i}_pct`), 0)

    // 3. Margen Neto Objetivo
    const targetMarginPct = parseFloat(config[`retail_target_margin_pct_${segmentId}`] || '0.35')

    // 4. Precio Final (Deducción por margen sobre venta)
    // Formula: Final = CostoInd / (1 - (Impuestos% + Margen%))
    const divider = 1 - (taxSumPct + targetMarginPct)
    const finalPrice = divider > 0 ? costInd / divider : costInd * 2 // Fallback si el margen + impuestos > 100%

    const taxesAmt = finalPrice * taxSumPct
    const netProfitAmt = finalPrice - costInd - taxesAmt

    return {
       costInd,
       taxes: taxesAmt,
       margin: netProfitAmt,
       final: finalPrice,
       marginPct: targetMarginPct * 100
    }
  }

  const mutation = useMutation({
    mutationFn: (data: any) => productosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      toast.success('Producto Guardado')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => productosApi.editar(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      toast.success('Producto Actualizado')
    }
  })

  const saveProduct = async (stayOnPage: boolean) => {
    if (!form.nombre || !form.categoriaId) return toast.error('Faltan datos obligatorios')

    const payload = {
      nombre: form.nombre,
      tipo: 'COMPRADO',
      categoriaId: form.categoriaId,
      subCategoriaId: form.subCategoriaId || null,
      institucionId: form.institucionId || null,
      temporada: form.temporada,
      codigoBarra: form.barcode || null,
      costoCompra: parseFloat(form.costoCompra || '0'),
      // Precios por segmento
      precioFinal: calculatePricing('final').final,
      precioRevendedor: calculatePricing('revendedor').final,
      precioEmpresa: calculatePricing('empresa').final,
      precioRevendido: calculatePricing('revendido').final,
      proveedores: form.proveedorId ? [{
        proveedorId: form.proveedorId,
        codigoReferencia: form.skuProveedor,
        costo: parseFloat(form.costoCompra || '0'),
        esPrincipal: true
      }] : [],
      talles: form.hasVariants && form.curvaId 
        ? curvas.find(c => c.id === form.curvaId)?.items.map(it => ({ talle: it.nombre, stockActual: 0 }))
        : [],
      imagenes: form.fotoUrl ? [{ url: form.fotoUrl, etiqueta: 'PRINCIPAL', posicion: 0 }] : []
    }

    const activeMutation = id ? updateMutation : mutation

    activeMutation.mutate(payload, {
      onSuccess: () => {
        if (!id && stayOnPage) {
           setForm(initialState)
        } else {
           navigate('/productos')
        }
      }
    })
  }

  return (
    <div className="max-w-full mx-auto pb-40 px-6 bg-[#f8fafc] min-h-screen">
      <Toaster />
      <BarcodeScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={(code) => { updateForm('barcode', code); setShowScanner(false) }}
      />

      {/* HEADER COMPACTO ERP */}
      <div className="flex items-center justify-between py-6 sticky top-0 bg-[#f8fafc]/80 backdrop-blur-md z-40 mb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/productos')} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-indigo-600 border border-gray-200 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic flex items-center gap-3">
              {id ? 'EDITAR ARTÍCULO' : 'RETAIL MASTER'} <span className="text-gray-300">/</span> <span className="text-indigo-600">{id ? productoEdit?.nombre : 'INDUMENTARIA & CALZADO'}</span>
            </h1>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full" />
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 {id ? `ID: ${id.substring(0,8).toUpperCase()}` : 'Global ERP System · Carga de Artículos de Reventa'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!id && (
            <button 
              onClick={() => saveProduct(true)}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} /> Guardar y Nuevo
            </button>
          )}
          <button 
            onClick={() => saveProduct(false)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-600/10"
          >
            <Save size={14} /> {id ? 'Guardar Cambios' : 'Finalizar Carga'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SECCIÓN 1: DATOS MAESTROS COMPACTOS (FILA UNICA) */}
        <div className="xl:col-span-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
             <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 items-end">
                <div className="lg:col-span-3">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Nombre Comercial (F1)</label>
                  <input 
                    autoFocus
                    value={form.nombre} onChange={e => updateForm('nombre', e.target.value)}
                    placeholder="Ej: Remera Algodón Premium"
                    className="w-full bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-bold text-gray-900 border border-gray-100 focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Categoría</label>
                  <div className="flex gap-1">
                    <select 
                      value={form.categoriaId} onChange={e => {
                        updateForm('categoriaId', e.target.value)
                        updateForm('subCategoriaId', '') // Reset sub-cat
                      }}
                      className="w-full bg-gray-50 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase text-gray-900 border border-gray-100 outline-none"
                    >
                      <option value="">Elegir...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button 
                      onClick={() => setShowQuickCategoria(true)}
                      className="p-2.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Sub-Categoría</label>
                  <div className="flex gap-1">
                    <select 
                      disabled={!form.categoriaId}
                      value={form.subCategoriaId} onChange={e => updateForm('subCategoriaId', e.target.value)}
                      className="w-full bg-gray-50 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase text-gray-900 border border-gray-100 outline-none disabled:opacity-50"
                    >
                      <option value="">S/SubCat</option>
                      {subCategorias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    <button 
                      disabled={!form.categoriaId}
                      onClick={() => setShowQuickSubCategoria(true)}
                      className="p-2.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Referencia / Entidad</label>
                  <div className="flex gap-1">
                    <select 
                      value={form.institucionId} onChange={e => updateForm('institucionId', e.target.value)}
                      className="w-full bg-gray-50 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase text-gray-900 border border-gray-100 outline-none"
                    >
                      <option value="">S/Referencia</option>
                      {instituciones.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                    <button 
                      onClick={() => setShowQuickReferencia(true)}
                      className="p-2.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Temporada</label>
                  <select 
                    value={form.temporada} onChange={e => updateForm('temporada', e.target.value)}
                    className="w-full bg-gray-50 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase text-gray-900 border border-gray-100 outline-none"
                  >
                    <option value="TODO EL AÑO">TODO EL AÑO</option>
                    <option value="VERANO">VERANO ☀️</option>
                    <option value="INVIERNO">INVIERNO ❄️</option>
                  </select>
                </div>
                <div className="lg:col-span-1 flex justify-end gap-2">
                  <div className="relative group/img">
                    <div className={`w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${form.fotoUrl ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                      {form.fotoUrl ? <img src={form.fotoUrl} className="w-full h-full object-cover rounded-lg" /> : <Camera size={14} className="text-gray-300" />}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file).then(url => url && updateForm('fotoUrl', url));
                      }} />
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* SECCIÓN 2: TRAZABILIDAD Y COSTEO BASE */}
        <div className="xl:col-span-4 space-y-6">
           <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-indigo-500 mb-6 flex items-center gap-2">
                 <Truck size={14} /> Origen y Logística
              </h3>
              <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">EAN / Código de Barras</label>
                   <div className="flex gap-2">
                     <input 
                      value={form.barcode} onChange={e => updateForm('barcode', e.target.value)}
                      className="flex-1 bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold border border-gray-100 font-mono"
                     />
                     <button onClick={() => setShowScanner(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Camera size={16}/></button>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Proveedor Principal</label>
                      <div className="flex gap-2">
                        <select 
                          value={form.proveedorId} onChange={e => updateForm('proveedorId', e.target.value)}
                          className="w-full bg-gray-50 px-4 py-2 rounded-lg text-[11px] font-black uppercase border border-gray-100"
                        >
                          <option value="">Elegir Proveedor...</option>
                          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <button 
                          onClick={() => setShowQuickProveedor(true)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <UserPlus size={16}/>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">SKU Origen / Ref. Catálogo</label>
                      <input 
                        value={form.skuProveedor} onChange={e => updateForm('skuProveedor', e.target.value)}
                        placeholder="Ref. Factura"
                        className="w-full bg-gray-50 px-4 py-2 rounded-lg text-[11px] font-black uppercase border border-gray-100"
                      />
                    </div>
                 </div>
                 <div className="pt-4 mt-4 border-t border-gray-50">
                    <label className="text-[10px] font-black uppercase text-indigo-600 block mb-2 tracking-widest">Costo de Compra Base (Reponible)</label>
                    <div className="flex items-center gap-2 bg-indigo-600 p-4 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                       <span className="text-xl font-black opacity-50">$</span>
                       <input 
                        type="number" step="0.01" value={form.costoCompra} onChange={e => updateForm('costoCompra', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-black outline-none placeholder:text-white/20"
                       />
                       <Calculator size={20} className="opacity-30" />
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase text-purple-500 flex items-center gap-2 uppercase tracking-widest">
                    <Layers size={14} /> Estructura de Variantes
                  </h3>
                  <button 
                    onClick={() => updateForm('hasVariants', !form.hasVariants)}
                    className={`w-8 h-4 rounded-full transition-all relative ${form.hasVariants ? 'bg-purple-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${form.hasVariants ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
               </div>
               
               {form.hasVariants ? (
                 <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <select 
                      value={form.curvaId} onChange={e => updateForm('curvaId', e.target.value)}
                      className="w-full bg-purple-50 px-4 py-2 rounded-lg font-black text-[10px] uppercase text-purple-900 border-none outline-none"
                    >
                      <option value="">Curva de Talles...</option>
                      {curvas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    {form.curvaId && (
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-wrap gap-1.5">
                        {curvas.find(c => c.id === form.curvaId)?.items.map(it => (
                           <span key={it.id} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-black text-gray-500">{it.nombre}</span>
                        ))}
                      </div>
                    )}
                 </div>
               ) : (
                 <p className="text-[9px] text-gray-400 font-bold italic uppercase leading-relaxed">
                   Producto unitario estándar sin diferenciación estructural.
                 </p>
               )}
           </div>
        </div>

        {/* SECCIÓN 3: CASCADA DE PRECIOS (MASTER ERP) */}
        <div className="xl:col-span-8">
           <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-20" />
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase text-gray-900 tracking-tighter italic flex items-center gap-3">
                    <Calculator size={18} className="text-emerald-500" /> Cascada Técnica de Rentabilidad (Perfil Retail)
                  </h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowConfigVista(!showConfigVista)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Settings size={14} /> Vista de Segmentos
                    </button>
                    <div className="px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                       <span className="text-[9px] font-black uppercase text-gray-400">Retail Matrix Engine</span>
                    </div>
                  </div>
              </div>

              {/* PANEL DE CONFIGURACIÓN DE VISTA (MODULAR) */}
              {showConfigVista && (
                <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap gap-6 animate-in fade-in duration-300">
                   {SEGMENTOS.map(s => (
                     <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${configVista[`show${s.id[0].toUpperCase()}${s.id.slice(1)}` as keyof typeof configVista] ? `${s.color} text-white border-transparent shadow-lg shadow-gray-200` : 'bg-white text-gray-300 border-gray-200'}`}>
                           {configVista[`show${s.id[0].toUpperCase()}${s.id.slice(1)}` as keyof typeof configVista] ? <CheckCircle2 size={18}/> : <div className="w-2 h-2 bg-gray-200 rounded-full"/>}
                        </div>
                        <input 
                          type="checkbox" 
                          hidden 
                          checked={configVista[`show${s.id[0].toUpperCase()}${s.id.slice(1)}` as keyof typeof configVista]}
                          onChange={() => toggleConfigVista(`show${s.id[0].toUpperCase()}${s.id.slice(1)}` as keyof typeof configVista)}
                        />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest group-hover:text-gray-900">{s.label}</span>
                     </label>
                   ))}
                </div>
              )}

              <div className="overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                        <th className="py-4 text-left font-black">Segmento</th>
                        <th className="py-4 text-right">Costo Reposición (CRO)</th>
                        <th className="py-4 text-right">Impuestos Vta</th>
                        <th className="py-4 text-right">Margen Neto (%)</th>
                        <th className="py-4 text-right">Ganancia (ARS)</th>
                        <th className="py-4 text-right pr-4">Precio Sugerido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {SEGMENTOS.filter(s => configVista[`show${s.id[0].toUpperCase()}${s.id.slice(1)}` as keyof typeof configVista]).map(s => {
                        const pricing = calculatePricing(s.id)
                        return (
                          <tr key={s.id} className="group hover:bg-[#fcfdfd] transition-all">
                            <td className="py-6">
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-8 rounded-full ${s.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                <div>
                                  <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">{s.label}</div>
                                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{segmentIdToLabel(s.id)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-6 text-right font-mono text-gray-400 text-sm">
                              ${pricing.costInd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-6 text-right font-mono text-red-400 text-sm">
                              -${pricing.taxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-6 text-right">
                              <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                <Percent size={10} className="text-emerald-500" />
                                <span className="text-sm font-black text-emerald-600">{pricing.marginPct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-6 text-right font-black text-emerald-600 text-sm">
                              +${pricing.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-6 text-right pr-4">
                              <div className="text-sm font-black text-gray-900 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm inline-block min-w-[120px]">
                                ${pricing.final.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                 </table>
              </div>

              <div className="mt-10 p-6 bg-[#f1f5f9] rounded-2xl border border-gray-200">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shrink-0 border border-gray-200 shadow-sm">
                      <TrendingUp size={18} />
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Análisis de Reposición Operativa</h4>
                       <p className="text-[9px] text-indigo-700/60 font-bold uppercase leading-relaxed max-w-2xl">
                         Los valores mostrados incluyen la carga impositiva y operativa específica para **PRODUCTOS COMPRADOS (REVENTA)**. El Costo de Reposición Operativo (CRO) se calcula sobre el Perfil Retail, ignorando variables de mano de obra industrial.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <QuickCreateProveedorModal 
        isOpen={showQuickProveedor} 
        onClose={() => setShowQuickProveedor(false)} 
        onSuccess={(id) => { 
          updateForm('proveedorId', id); 
          setShowQuickProveedor(false); 
          qc.invalidateQueries({ queryKey: ['proveedores'] }) 
        }} 
      />

      <QuickCreateModal 
        isOpen={showQuickCategoria} 
        onClose={() => setShowQuickCategoria(false)} 
        onSuccess={(cat) => {
          updateForm('categoriaId', cat.id);
          setShowQuickCategoria(false);
          qc.invalidateQueries({ queryKey: ['categorias'] })
        }}
        title="Nueva Categoría"
        label="Nombre de Categoría"
        mutationFn={(name) => categoriasApi.crear({ nombre: name })}
      />

      <QuickCreateModal 
        isOpen={showQuickSubCategoria} 
        onClose={() => setShowQuickSubCategoria(false)} 
        onSuccess={(sub) => {
          updateForm('subCategoriaId', sub.id);
          setShowQuickSubCategoria(false);
          qc.invalidateQueries({ queryKey: ['sub-categorias', form.categoriaId] })
        }}
        title="Nueva Sub-Categoría"
        label="Nombre de Sub-Categoría"
        mutationFn={(name) => subCategoriasApi.crear({ nombre: name, categoriaId: form.categoriaId })}
      />

      <QuickCreateModal 
        isOpen={showQuickReferencia} 
        onClose={() => setShowQuickReferencia(false)} 
        onSuccess={(inst) => {
          updateForm('institucionId', inst.id);
          setShowQuickReferencia(false);
          qc.invalidateQueries({ queryKey: ['instituciones'] })
        }}
        title="Nueva Referencia / Entidad"
        label="Nombre de la Referencia"
        mutationFn={(name) => institucionesApi.crear({ nombre: name })}
      />
    </div>
  )
}

function QuickCreateModal({ isOpen, onClose, onSuccess, title, label, mutationFn }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: (data: any) => void,
  title: string,
  label: string,
  mutationFn: (name: string) => Promise<any>
}) {
  const [nombre, setNombre] = useState('')
  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      toast.success(title + ' creada exitosamente')
      onSuccess(data)
      setNombre('')
    },
    onError: () => toast.error('Error al procesar la solicitud')
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
             <Plus size={24} />
           </div>
           <div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maestro de Datos SaaS</p>
           </div>
        </div>

        <div className="space-y-6">
           <div>
             <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">{label}</label>
             <input 
               autoFocus
               value={nombre} onChange={e => setNombre(e.target.value)}
               placeholder="Ingrese nombre..."
               className="w-full bg-gray-50 px-4 py-3 rounded-xl text-sm font-bold border border-gray-100 focus:border-indigo-400 outline-none transition-all"
             />
           </div>

           <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100">Cerrar</button>
             <button 
              disabled={!nombre || mutation.isPending}
              onClick={() => mutation.mutate(nombre)}
              className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
             >
                {mutation.isPending ? 'Guardando...' : 'Confirmar Registro'}
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}

function QuickCreateProveedorModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (id: string) => void }) {
  const [nombre, setNombre] = useState('')
  const mutation = useMutation({
    mutationFn: (name: string) => proveedoresApi.crear({ nombre: name }),
    onSuccess: (data) => {
      toast.success('Proveedor creado')
      onSuccess(data.id)
      setNombre('')
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
             <UserPlus size={24} />
           </div>
           <div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Alta Rápida</h3>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nuevo Proveedor de Reventa</p>
           </div>
        </div>

        <div className="space-y-6">
           <div>
             <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Nombre del Proveedor / Razón Social</label>
             <input 
               autoFocus
               value={nombre} onChange={e => setNombre(e.target.value)}
               placeholder="Ej: Texcorp S.A."
               className="w-full bg-gray-50 px-4 py-3 rounded-xl text-sm font-bold border border-gray-100 focus:border-indigo-400 outline-none transition-all"
             />
           </div>

           <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100">Cerrar</button>
             <button 
              disabled={!nombre || mutation.isPending}
              onClick={() => mutation.mutate(nombre)}
              className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
             >
                {mutation.isPending ? 'Creando...' : 'Confirmar Proveedor'}
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}

function segmentIdToLabel(id: string) {
  switch(id) {
    case 'final': return 'Venta por menor'
    case 'revendedor': return 'B2B / Comisionistas'
    case 'empresa': return 'Dotaciones Corporativas'
    case 'revendido': return 'Operativa VA'
    default: return 'General'
  }
}

async function handleImageUpload(file: File) {
  try {
    const res = await productosApi.subirImagen(file)
    return res.url
  } catch (err) {
    toast.error('Error al subir imagen')
    return ''
  }
}
