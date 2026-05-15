import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insumosApi, proveedoresApi, productosApi, categoriasApi, tallesApi, bordadosApi, configuracionApi, institucionesApi, type Insumo, type Categoria, type CurvaTalle } from '../lib/api'
import { useNavigate, useParams } from 'react-router-dom'
import { toast, Toaster } from 'react-hot-toast'
import { InstitucionQuickForm } from '../components/InstitucionQuickForm'
import { InsumoQuickForm } from '../components/InsumoQuickForm'
import { BordadoQuickForm } from '../components/BordadoQuickForm'
import { ProveedorQuickForm } from '../components/ProveedorQuickForm'
import { BarcodeScannerModal } from '../components/BarcodeScannerModal'
import { Camera } from 'lucide-react'

const IMAGEN_SLOTS = [
  'FRENTE', 'DORSO', 'LATERAL DER', 'LATERAL IZQ', 'CUELLO / ESCOTE', 'PUÑO / RUEDO', 'INTERIOR / ETIQUETA', 'OTRO DETALLE'
]

export function AltaProductoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const qc = useQueryClient()
  
  // -- ESTADO PRINCIPAL --
  const [nombre, setNombre] = useState('')
  const [codigoBarra, setCodigoBarra] = useState('')
  const [masterCatId, setMasterCatId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [curvaId, setCurvaId] = useState('')

  // -- PERFIL DE VISTA (UNIFICADO INDUSTRIAL) --
  const [modoVista] = useState<'INDUSTRIAL'>('INDUSTRIAL')

  const [tipo, setTipo] = useState<'FABRICADO' | 'COMPRADO' | 'SEMI_TERMINADO'>('FABRICADO')
  const [tipoVenta, setTipoVenta] = useState<'UNIDAD' | 'FRACCIONADO'>('UNIDAD')
  const [proveedorId, setProveedorId] = useState('')
  const [costoCompra, setCostoCompra] = useState('')
  const [institucionId, setInstitucionId] = useState('')
  const [temporada, setTemporada] = useState('TODO EL AÑO')
  
  // -- ESTADOS DE UI (QUICK FORMS) --
  const [showQuickProv, setShowQuickProv] = useState(false)
  const [showQuickInst, setShowQuickInst] = useState(false)
  const [showQuickIns, setShowQuickIns] = useState(false)
  const [showQuickBor, setShowQuickBor] = useState(false)
  
  // -- PDM METADATA PER SIZE --
  // Estructura: { [talle]: { refMolderia, peso, consumos: { [insumoId]: q } } }
  const [pdmMetadata, setPdmMetadata] = useState<Record<string, any>>({})
  const [selectedTallesAvg, setSelectedTallesAvg] = useState<string[]>([])
  
  // -- BOM (Insumos) --
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<{insumoId: string, cantidad: number, nombre: string, costo: number}[]>([])
  
  // -- BORDADOS --
  const [bordadosSeleccionados, setBordadosSeleccionados] = useState<{bordadoId: string, nombre: string, puntadas: number, posicion: string, costo: number}[]>([])
  
  // -- MATRIZ DE MEDIDAS (CM) --
  const [matrizMedidas, setMatrizMedidas] = useState<Record<string, Record<string, string>>>({})

  // -- GALERÍA --
  const [imagenes, setImagenes] = useState<Record<string, string>>({})
  const [subiendoImg, setSubiendoImg] = useState<string | null>(null)
  
  // -- COSTEO Y SIMULACIÓN --
  const [targetMargin, setTargetMargin] = useState(35)
  const [preciosSegmentos, setPreciosSegmentos] = useState<Record<string, string>>({
    final: '',
    revendedor: '',
    empresa: '',
    revendido: ''
  })
  const [segmentoSimulacion, setSegmentoSimulacion] = useState<'final' | 'revendedor' | 'empresa' | 'revendido'>('final')
  const [originalProduct, setOriginalProduct] = useState<any>(null)

  // -- SCANNER STATE --
  const [showScanner, setShowScanner] = useState(false)
  const [scanningTarget, setScanningTarget] = useState<{ type: 'GLOBAL' | 'TALLE', talle?: string } | null>(null)

  // Consultas
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: categoriasApi.listar })
  const { data: curvas = [] } = useQuery({ queryKey: ['curvas'], queryFn: tallesApi.listar })
  const { data: todosInsumos = [] } = useQuery({ queryKey: ['insumos'], queryFn: () => insumosApi.listar() })
  const { data: todosProveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: proveedoresApi.listar })
  const { data: todosBordados = [] } = useQuery({ queryKey: ['bordados'], queryFn: bordadosApi.listar })
  const { data: todasInstituciones = [] } = useQuery({ queryKey: ['instituciones'], queryFn: institucionesApi.listar })
  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: configuracionApi.get })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.listar() })

  // Sync targetMargin with config when segment or config changes
  useEffect(() => {
    const key = `target_margin_pct_${segmentoSimulacion}`
    if (config[key]) {
      setTargetMargin(Math.round(parseFloat(config[key]) * 100))
    }
  }, [segmentoSimulacion, config])

  const masterCat = categorias.find(c => c.id === masterCatId)
  const variants = categorias.filter(c => c.parentId === masterCatId)
  const subCat = categorias.find(c => c.id === categoriaId)
  const curvaSeleccionada = curvas.find(c => c.id === curvaId)

  // -- MOTOR DE COSTEO INDUSTRIAL (MATRIX BASED) --
  const totalBOM_Fijo = insumosSeleccionados.reduce((acc, i) => acc + (i.cantidad * i.costo), 0)
  const totalBordados = bordadosSeleccionados.reduce((acc, b) => acc + b.costo, 0)
  
  // Cálculo de Costo por Talle Específico (Real)
  const getCostoTalle = (talleStr: string) => {
    // 1. Costos Fijos (Insumos no-tela)
    const fixedBomCost = insumosSeleccionados.reduce((acc, i) => {
      const isTela = todosInsumos.find(ti => ti.id === i.insumoId)?.tipo === 'TELA'
      return isTela ? acc : acc + (i.cantidad * i.costo)
    }, 0)

    // 2. Costos Variables (Telas por talle)
    const variableFabricCost = insumosSeleccionados.reduce((acc, i) => {
      const isTela = todosInsumos.find(ti => ti.id === i.insumoId)?.tipo === 'TELA'
      if (!isTela) return acc
      const qty = parseFloat(pdmMetadata[talleStr]?.consumos?.[i.insumoId] || '0')
      return acc + (qty * i.costo)
    }, 0)

    return fixedBomCost + totalBordados + variableFabricCost
  }

  // La base para el costeo industrial promedio se calcula solo sobre los talles seleccionados
  const getCostoPromediadoManual = () => {
    if (selectedTallesAvg.length === 0) return totalBOM_Fijo + totalBordados
    const total = selectedTallesAvg.reduce((acc, t) => acc + getCostoTalle(t), 0)
    return total / selectedTallesAvg.length
  }

  const currentTotalIndustrialAvg = getCostoPromediadoManual()

  const costeBaseIndustrial = tipo === 'FABRICADO'
    ? (currentTotalIndustrialAvg - totalBordados) 
    : (parseFloat(costoCompra || '0') + totalBOM_Fijo)

  const getPct = (key: string) => parseFloat(config[`${key}_${segmentoSimulacion}`] || '0')

  const getOverheadsForBase = (base: number) => {
    const mo_val = base * getPct('mo_pct')
    const log_val = base * getPct('logistica_pct')
    const adm_val = base * getPct('admin_pct')
    const vt_val = base * getPct('ventas_pct')
    const ley_val = base * getPct('ley_25413')
    const fijos_val = base * getPct('fijos_pct')
    
    const extra_val = [1, 2, 3].reduce((acc, i) => acc + (base * getPct(`extra_cost_${i}_pct`)), 0)
    
    return {
      mo: mo_val,
      logistica: log_val,
      admin: adm_val,
      ventas: vt_val,
      ley: ley_val,
      fijos: fijos_val,
      extras: extra_val,
      total: mo_val + log_val + adm_val + vt_val + ley_val + fijos_val + extra_val
    }
  }

  const overheadsAvg = getOverheadsForBase(costeBaseIndustrial)
  
  const extraIndustrialCosts = [1, 2, 3].map(i => ({
    name: config[`extra_cost_${i}_name`],
    pct:  getPct(`extra_cost_${i}_pct`),
    amt:  costeBaseIndustrial * getPct(`extra_cost_${i}_pct`)
  })).filter(c => c.name)

  const industrialSubTotal = costeBaseIndustrial + overheadsAvg.total - overheadsAvg.extras + extraIndustrialCosts.reduce((acc, c) => acc + c.amt, 0)
  const totalIndustrialCost = costeBaseIndustrial + overheadsAvg.total + totalBordados

  // -- MOTOR COMERCIAL (MATRIX BASED) --
  const taxSumPct = 
    getPct('iva') + 
    getPct('iibb') + 
    getPct('costo_tarjeta') + 
    getPct('comision_pct') + 
    getPct('ley_cheque_vta') +
    [1, 2, 3].reduce((acc, i) => acc + getPct(`extra_tax_${i}_pct`), 0)

  const recommendedPrice = totalIndustrialCost / (1 - (taxSumPct + targetMargin/100))
  const currentPrice = preciosSegmentos[segmentoSimulacion] ? parseFloat(preciosSegmentos[segmentoSimulacion]) : recommendedPrice

  const ivaVal = currentPrice * getPct('iva')
  const iibbVal = currentPrice * getPct('iibb')
  const tarjetaVal = currentPrice * getPct('costo_tarjeta')
  const comisionVal = currentPrice * getPct('comision_pct')
  const leyVtaVal = currentPrice * getPct('ley_cheque_vta')
  
  const calcExtraTaxes = [1, 2, 3].map(i => ({
    name: config[`extra_tax_${i}_name`],
    amt:  currentPrice * getPct(`extra_tax_${i}_pct`)
  })).filter(t => t.name)

  const totalTaxes = ivaVal + iibbVal + tarjetaVal + comisionVal + leyVtaVal +
    calcExtraTaxes.reduce((acc, t) => acc + t.amt, 0)
  
  const netProfit = currentPrice - totalIndustrialCost - totalTaxes
  const netMarginPct = currentPrice > 0 ? (netProfit / currentPrice) * 100 : 0

  useEffect(() => {
    if (id && categorias.length > 0 && curvas.length > 0) {
       productosApi.obtener(id).then(p => {
          setOriginalProduct(p)
          setNombre(p.nombre)
          setTipo(p.tipo)
          if (p.temporada) setTemporada(p.temporada)
          if (p.codigoBarra) setCodigoBarra(p.codigoBarra)
          if (p.tipoVenta) setTipoVenta(p.tipoVenta)

          if (p.proveedores && p.proveedores.length > 0) {
             const prov = p.proveedores[0]
             setProveedorId(prov.proveedorId)
             if (prov.costo) setCostoCompra(prov.costo.toString())
          }
          
          setInsumosSeleccionados(p.insumos.map((i: any) => ({
            insumoId: i.insumo.id,
            cantidad: i.cantidad,
            nombre: i.insumo.nombre,
            costo: i.insumo.costoActual || 0
          })))

          setBordadosSeleccionados(p.bordados?.map((b: any) => {
            const fx = parseFloat(config?.COTIZACION_DOLAR || '1500')
            const manualARS = b.bordado.precioEmpresa
            const autoARS = ((b.bordado.puntadas / 1000) * b.bordado.precioPorMillar + b.bordado.costoPonchado) * fx
            return {
              bordadoId: b.bordadoId,
              nombre:    b.bordado.nombre,
              puntadas:  b.bordado.puntadas,
              posicion:  b.posicion || '',
              costo:     manualARS || autoARS
            }
          }) || [])

          setPreciosSegmentos({
            final: p.precioFinal?.toString() || '',
            revendedor: p.precioRevendedor?.toString() || '',
            empresa: p.precioEmpresa?.toString() || '',
            revendido: p.precioRevendido?.toString() || ''
          })

          const pm: any = {}
          // 1. Cargar desde talles físicos primero (Modelo de datos)
          p.talles?.forEach((pt: any) => {
            const tKey = pt.talle.trim().toUpperCase()
            pm[tKey] = {
              refMolderia: pt.referenciaMolderia || '',
              peso: pt.pesoKg?.toString() || '',
              codigoBarra: pt.codigoBarra || '',
              precioVenta: pt.precioVenta?.toString() || '',
              consumos: {} 
            }
          })
          
          let meta: any = p.metadata
          if (typeof meta === 'string') {
              try { meta = JSON.parse(meta) } catch (e) { meta = {} }
          }
          if (!meta) meta = {}

          // 2. Sobre-escribir/Complementar con metadatos (Consumos técnicos)
          if (meta.consumos) {
            Object.entries(meta.consumos).forEach(([t, cons]: [string, any]) => {
              const tKey = t.trim().toUpperCase()
              if (!pm[tKey]) pm[tKey] = { refMolderia: '', peso: '', consumos: {} }
              pm[tKey].consumos = cons
            })
          }
          if (meta.selectedTallesAvg) {
              const normAvg = (meta.selectedTallesAvg as string[]).map(s => s.trim().toUpperCase())
              setSelectedTallesAvg(normAvg)
          }
          if (meta.curvaId) setCurvaId(meta.curvaId)

          setPdmMetadata(pm)

          if (p.institucionId) setInstitucionId(p.institucionId)
          
          // RESOLVER JERARQUÍA DE CATEGORÍAS (Modelo Maestro vs Variante) con respaldo en el catálogo global
          const cid = p.categoriaId
          const catFull = categorias.find(c => c.id === cid)
          const finalParentId = p.categoria?.parentId || catFull?.parentId

          if (finalParentId) {
            setMasterCatId(finalParentId)
            setCategoriaId(cid || '')
          } else {
            setMasterCatId(cid || '')
            setCategoriaId(cid || '')
          }
          
          if (p.talles && p.talles.length > 0) {
            const tallesProdNorm = p.talles.map((pt: any) => pt.talle?.trim().toUpperCase()).filter(Boolean)
            const nombresProdStr = [...tallesProdNorm].sort().join(',')

            // Prioridad: 1. Metadata | 2. Match exacto | 3. Best overlap
            if (p.metadata?.curvaId) {
                setCurvaId(p.metadata.curvaId)
            } else {
                let curvaMatch = curvas.find(c => 
                  c.items.map(it => it.nombre?.trim().toUpperCase()).sort().join(',') === nombresProdStr
                )

                if (!curvaMatch) {
                  let maxOverlap = 0
                  curvas.forEach(c => {
                    const nombresCurva = c.items.map(it => it.nombre?.trim().toUpperCase())
                    const overlap = tallesProdNorm.filter(t => nombresCurva.includes(t)).length
                    if (overlap > maxOverlap) {
                      maxOverlap = overlap
                      curvaMatch = c
                    }
                  })
                }
                if (curvaMatch) setCurvaId(curvaMatch.id)
            }

            // Cargar Matriz de Medidas
            const mm: any = {}
            p.medidas?.forEach((m: any) => {
              if (!mm[m.talle]) mm[m.talle] = {}
              mm[m.talle][m.puntoId] = m.valorCm.toString()
            })
            setMatrizMedidas(mm)
          }

          const img: any = {}
          p.imagenes?.forEach((i: any) => img[i.etiqueta] = i.url)
          setImagenes(img)
       })
    }
  }, [id, categorias.length, curvas.length])

  // -- AUTO-FILL PDM FROM TEMPLATE --
  useEffect(() => {
    if (id) return // No sobreescribir si estamos editando un producto existente
    if (!categoriaId || !curvaSeleccionada) return

    const cat = categorias.find(c => c.id === categoriaId) || masterCat
    if (cat && cat.medidasBase && cat.medidasBase.length > 0) {
      const pm: any = { ...matrizMedidas }
      cat.medidasBase.forEach(mb => {
        // Solo cargar si el talle existe en la curva seleccionada
        if (curvaSeleccionada.items.some(it => it.nombre === mb.talle)) {
          if (!pm[mb.talle]) pm[mb.talle] = {}
          pm[mb.talle][mb.puntoId] = mb.valorCm.toString()
        }
      })
      setMatrizMedidas(pm)
      toast.success(`Especificaciones técnicas cargadas desde template: ${cat.nombre}`, { icon: '📐' })
    }
  }, [categoriaId, curvaId, categorias, id])

  const handleScanSuccess = (code: string) => {
    if (!scanningTarget) return
    if (scanningTarget.type === 'GLOBAL') {
      setCodigoBarra(code)
    } else if (scanningTarget.type === 'TALLE' && scanningTarget.talle) {
      const tKey = scanningTarget.talle.trim().toUpperCase()
      const next = { ...pdmMetadata }
      if (!next[tKey]) next[tKey] = { refMolderia: '', peso: '', codigoBarra: '', consumos: {} }
      next[tKey].codigoBarra = code
      setPdmMetadata(next)
    }
    setShowScanner(false)
    setScanningTarget(null)
    toast.success(`Código escaneado: ${code}`)
  }

  const mutation = useMutation({
    mutationFn: (data: any) => id ? productosApi.editar(id, data) : productosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      navigate('/productos')
    }
  })

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault()
    const medidasPayload: any[] = []
    Object.entries(matrizMedidas).forEach(([talle, puntos]) => {
      Object.entries(puntos).forEach(([puntoId, valor]) => {
        if (valor) medidasPayload.push({ talle, puntoId, valorCm: parseFloat(valor) })
      })
    })

    const imagenesPayload = Object.entries(imagenes).map(([etiqueta, url]) => ({ url, etiqueta }))

    const payload = {
      nombre,
      codigoBarra: codigoBarra || null,
      categoriaId,
      institucionId: institucionId || null,
      tipo,
      tipoVenta,
      temporada,
      proveedores: (tipo !== 'FABRICADO' && proveedorId) ? [{ 
         proveedorId, 
         costo: parseFloat(costoCompra) || 0, 
         esPrincipal: true 
      }] : [],
      costoCompra: parseFloat(costoCompra) || null,
      precioFinal: parseFloat(preciosSegmentos.final) || null,
      precioRevendedor: parseFloat(preciosSegmentos.revendedor) || null,
      precioEmpresa: parseFloat(preciosSegmentos.empresa) || null,
      precioRevendido: parseFloat(preciosSegmentos.revendido) || null,
      insumos: insumosSeleccionados.map(i => ({ 
        insumoId: i.insumoId, 
        cantidad: i.cantidad,
        consumoVariable: todosInsumos.find(ti => ti.id === i.insumoId)?.tipo === 'TELA'
      })),
      talles: (curvaSeleccionada?.items.length || 0) > 0 
        ? curvaSeleccionada?.items.map(it => {
            const tKey = it.nombre.trim().toUpperCase()
            const dataTalle = pdmMetadata[tKey] || {}
            return { 
                talle: it.nombre, // Mantenemos el nombre original para visualización
                referenciaMolderia: dataTalle.refMolderia || '',
                pesoKg: parseFloat(dataTalle.peso || '0'),
                metrosTela: Object.values(dataTalle.consumos || {}).reduce((acc: number, v: any) => acc + (parseFloat(v) || 0), 0),
                codigoBarra: dataTalle.codigoBarra || null,
                precioVenta: parseFloat(dataTalle.precioVenta) || null
            }
          })
        : (id && originalProduct?.talles?.length > 0 ? originalProduct.talles.map((ot: any) => ({
            talle: ot.talle,
            referenciaMolderia: ot.referenciaMolderia,
            pesoKg: ot.pesoKg,
            metrosTela: ot.metrosTela,
            codigoBarra: ot.codigoBarra,
            precioVenta: ot.precioVenta
          })) : []),
      metadata: {
        consumos: Object.fromEntries(
          Object.entries(pdmMetadata).map(([talle, data]) => {
              const tKey = talle.trim().toUpperCase()
              const cleanedConsumos: Record<string, number> = {}
              if (data.consumos) {
                  Object.entries(data.consumos).forEach(([insumoId, valor]) => {
                      if (valor) cleanedConsumos[insumoId] = parseFloat(valor as string)
                  })
              }
              return [tKey, cleanedConsumos]
          })
        ),
        selectedTallesAvg: selectedTallesAvg.map(s => s.trim().toUpperCase()),
        curvaId
      },
      medidas: medidasPayload,
      imagenes: imagenesPayload,
      bordados: bordadosSeleccionados.map(b => ({ bordadoId: b.bordadoId, posicion: b.posicion }))
    }
    mutation.mutate(payload)
  }

  const handleSubirArchivo = async (etiqueta: string, file: File) => {
    try {
      setSubiendoImg(etiqueta)
      const res = await productosApi.subirImagen(file)
      setImagenes(prev => ({ ...prev, [etiqueta]: res.url }))
    } catch (err) {
      alert('Error al subir imagen técnica.')
    } finally {
      setSubiendoImg(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-32 px-4">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => navigate('/productos')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all border border-gray-50">←</button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">{id ? 'Edición Técnica' : 'Alta de Producto'}</h1>
          <p className="text-sm text-indigo-500 font-black uppercase tracking-[0.3em] mt-2">Flujo Industrial · Producción Propia</p>
        </div>
      </div>


      <form onSubmit={handleEnviar} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <BarcodeScannerModal 
          isOpen={showScanner} 
          onClose={() => setShowScanner(false)} 
          onScan={handleScanSuccess} 
          title={scanningTarget?.type === 'GLOBAL' ? 'Escanear Código Producto' : `Escanear Talle ${scanningTarget?.talle}`}
        />
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6">Identificación</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm uppercase font-black text-gray-400 mb-1">Nombre Comercial</label>
                <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Chomba Piquet AGS" className="w-full text-sm font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm uppercase font-black text-gray-400 mb-1">Código de Barra (Scan)</label>
                <div className="flex gap-2">
                  <input value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} placeholder="Ej: 779..." className="flex-1 text-sm font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500 bg-transparent font-mono text-indigo-600" />
                  <button type="button" onClick={() => { setScanningTarget({ type: 'GLOBAL' }); setShowScanner(true) }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all">
                    <Camera size={18} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm uppercase font-black text-gray-400 mb-1">Modelo Maestro (Template)</label>
                <select required value={masterCatId} onChange={e => { setMasterCatId(e.target.value); setCategoriaId('') }} className="w-full text-sm font-bold uppercase bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">Seleccionar Modelo...</option>
                  {categorias.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className={`transition-all duration-300 ${!masterCatId ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-sm uppercase font-black text-gray-400 mb-1">Variante / Estilo Específico</label>
                <select required value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full text-sm font-bold uppercase bg-indigo-50 text-indigo-700 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">Seleccionar Estilo (e.g. Slim, Recto)...</option>
                  {variants.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  <option value={masterCatId}>Usar Modelo Maestro directamente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm uppercase font-black text-gray-400 mb-1">Institución / Colegio / Cliente</label>
                <div className="flex gap-2">
                  <select value={institucionId} onChange={e => setInstitucionId(e.target.value)} className="flex-1 text-sm font-bold uppercase bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Sin Institución (General)...</option>
                    {todasInstituciones.map(inst => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowQuickInst(true)} className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all font-bold text-xl">+</button>
                </div>
                {showQuickInst && (
                  <div className="mt-4">
                    <InstitucionQuickForm onSuccess={(id) => { setInstitucionId(id); setShowQuickInst(false) }} onCancel={() => setShowQuickInst(false)} />
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-50 space-y-6">
                <div>
                  <label className="block text-sm uppercase font-black text-gray-400 mb-1">Tipo de Origen</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="w-full text-sm font-black uppercase bg-gray-900 text-white border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="FABRICADO">Fabricación Propia</option>
                    <option value="COMPRADO">Compra Directa (Reventa)</option>
                    <option value="SEMI_TERMINADO">Semi-terminado / V.A.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm uppercase font-black text-gray-400 mb-1">Temporada / Estacionalidad</label>
                  <select value={temporada} onChange={e => setTemporada(e.target.value)} className="w-full text-sm font-black uppercase bg-gray-50 text-gray-900 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="TODO EL AÑO">TODO EL AÑO</option>
                    <option value="VERANO">VERANO ☀️</option>
                    <option value="INVIERNO">INVIERNO ❄️</option>
                  </select>
                </div>
                
                {tipo !== 'FABRICADO' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-sm uppercase font-black text-indigo-500 mb-1">Costo de Compra (Base)</label>
                      <input 
                        type="number" step="0.01" required
                        value={costoCompra} onChange={e => setCostoCompra(e.target.value)}
                        placeholder="Precio pagado al proveedor..."
                        className="w-full text-xl font-black border-b-2 border-indigo-100 py-2 focus:outline-none focus:border-indigo-500 bg-transparent text-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm uppercase font-black text-gray-400 mb-1">Proveedor Origen</label>
                      <div className="flex gap-2">
                        <select value={proveedorId} onChange={e => setProveedorId(e.target.value)} className="flex-1 text-sm font-bold uppercase bg-gray-50 border-none rounded-xl px-4 py-3 outline-none">
                          <option value="">Seleccionar Proveedor...</option>
                          {todosProveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowQuickProv(true)} className="w-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all font-bold">+</button>
                      </div>
                      {showQuickProv && (
                        <div className="mt-4">
                          <ProveedorQuickForm onSuccess={(id) => { setProveedorId(id); setShowQuickProv(false) }} onCancel={() => setShowQuickProv(false)} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden relative ${tipo === 'COMPRADO' ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
            <div className="absolute top-0 right-0 px-4 py-2 bg-emerald-600 text-white text-sm font-black uppercase tracking-widest">Costo BOM</div>
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6 mt-4">Insumos y Consumos</h3>
            <div className="space-y-4">
              {tipo === 'COMPRADO' ? (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 italic text-[10px] text-amber-700 font-bold uppercase">
                  Los productos de compra directa no requieren explosión de materiales (BOM).
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <select 
                      onChange={e => {
                        const val = e.target.value
                        if (!val) return
                        
                        const [tipoItem, idItem] = val.split(':')
                        
                        if (tipoItem === 'INS') {
                          const ins = todosInsumos.find(i => i.id === idItem)
                          if (ins && !insumosSeleccionados.find(s => s.insumoId === ins.id)) {
                            setInsumosSeleccionados([...insumosSeleccionados, { insumoId: ins.id, cantidad: 1, nombre: ins.nombre, costo: ins.costoActual || 0 }])
                          }
                        } else if (tipoItem === 'PROD') {
                          const prod = productos.find(p => p.id === idItem)
                          if (prod && !insumosSeleccionados.find(s => s.insumoId === prod.id)) {
                            // Simulamos el producto como un insumo de costo directo (costoCompra o promedio)
                            setInsumosSeleccionados([...insumosSeleccionados, { 
                              insumoId: prod.id, 
                              cantidad: 1, 
                              nombre: `[PRODUCTO BASE] ${prod.nombre}`, 
                              costo: prod.costoCompra || prod.precioFinal || 0 
                            }])
                          }
                        }
                        e.target.value = ""
                      }}
                      className="flex-1 text-sm font-black uppercase bg-indigo-50 text-indigo-600 border-none rounded-xl px-4 py-3 outline-none"
                    >
                      <option value="">+ Agregar Materia Prima o Base...</option>
                      <optgroup label="INSUMOS TÉCNICOS">
                        {todosInsumos.map(i => <option key={i.id} value={`INS:${i.id}`}>{i.tipo} · {i.nombre}</option>)}
                      </optgroup>
                      <optgroup label="PRODUCTOS BASE / SEMITERMINADOS">
                        {productos.filter(p => (p.tipo === 'COMPRADO' || p.tipo === 'SEMI_TERMINADO') && p.id !== id).map(p => (
                          <option key={p.id} value={`PROD:${p.id}`}>{p.nombre} (${p.costoCompra || p.precioFinal})</option>
                        ))}
                      </optgroup>
                    </select>
                    <button type="button" onClick={() => setShowQuickIns(true)} className="w-12 bg-indigo-50 rounded-xl text-indigo-600 font-bold border border-indigo-100">+</button>
                  </div>
                  {showQuickIns && (
                    <div className="mt-2">
                      <InsumoQuickForm onSuccess={(id) => { 
                        const ins = todosInsumos.find(i => i.id === id) || {id, nombre: 'Recién creado', costoActual: 0}
                        setInsumosSeleccionados([...insumosSeleccionados, { insumoId: id, cantidad: 1, nombre: ins.nombre, costo: ins.costoActual || 0 }])
                        setShowQuickIns(false) 
                      }} onCancel={() => setShowQuickIns(false)} />
                    </div>
                  )}
                  <div className="space-y-3 pt-4">
                    {insumosSeleccionados.map((item, idx) => (
                      <div key={item.insumoId} className="flex items-center justify-between gap-4 border-b border-gray-50 pb-3 last:border-0 italic">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-gray-900 truncate">{item.nombre}</div>
                          <div className="text-xs text-gray-400 font-bold uppercase">${item.costo} / u</div>
                        </div>
                        <input type="number" step="0.01" value={item.cantidad} onChange={e => {
                            const next = [...insumosSeleccionados]; next[idx].cantidad = parseFloat(e.target.value) || 0; setInsumosSeleccionados(next)
                        }} className="w-14 text-center text-sm font-black bg-gray-50 border-none rounded-lg py-1 px-1" />
                        <button type="button" onClick={() => setInsumosSeleccionados(s => s.filter(i => i.insumoId !== item.insumoId))} className="text-gray-300 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden relative ${tipo === 'COMPRADO' ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
            <div className="absolute top-0 right-0 px-4 py-2 bg-violet-600 text-white text-sm font-black uppercase tracking-widest">Estética</div>
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6 mt-4">Bordados Aplicados</h3>
            <div className="space-y-4">
               {tipo === 'COMPRADO' ? (
                 <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 italic text-[10px] text-violet-700 font-bold uppercase">
                   Solo disponible para fabricación / VA.
                 </div>
               ) : (
                <>
                  <div className="flex gap-2">
                    <select 
                      onChange={e => {
                        const bor = todosBordados.find(b => b.id === e.target.value)
                        if (bor && !bordadosSeleccionados.find(s => s.bordadoId === bor.id)) {
                          const fx = parseFloat(config?.COTIZACION_DOLAR || '1500')
                          const manualARS = bor.precioEmpresa
                          const autoARS = ((bor.puntadas / 1000) * bor.precioPorMillar + bor.costoPonchado) * fx
                          setBordadosSeleccionados([...bordadosSeleccionados, { 
                            bordadoId: bor.id, nombre: bor.nombre, puntadas: bor.puntadas, posicion: 'Frente',
                            costo: manualARS || autoARS
                          }])
                        }
                        e.target.value = ""
                      }}
                      className="flex-1 text-sm font-black uppercase bg-violet-100 text-violet-700 border-none rounded-xl px-4 py-3 outline-none"
                    >
                      <option value="">+ Vincular Bordado Técnico...</option>
                      {todosBordados.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowQuickBor(true)} className="w-12 bg-violet-100 rounded-xl text-violet-700 font-bold border border-violet-200">+</button>
                  </div>
                  {showQuickBor && (
                    <div className="mt-2">
                      <BordadoQuickForm onSuccess={(newId) => { 
                        const fx = parseFloat(config?.COTIZACION_DOLAR || '1500')
                        const bor = todosBordados.find(b => b.id === newId) || { id: newId, nombre: 'Nuevo Bordado', puntadas: 0, precioPorMillar: 0, costoPonchado: 0, precioEmpresa: null }
                        const manualARS = bor.precioEmpresa
                        const autoARS = ((bor.puntadas / 1000) * bor.precioPorMillar + bor.costoPonchado) * fx
                        setBordadosSeleccionados([...bordadosSeleccionados, { 
                          bordadoId: newId, nombre: bor.nombre, puntadas: bor.puntadas, posicion: 'Frente',
                          costo: manualARS || autoARS
                        }])
                        setShowQuickBor(false) 
                      }} onCancel={() => setShowQuickBor(false)} />
                    </div>
                  )}
                  <div className="space-y-3 pt-4">
                    {bordadosSeleccionados.map((item, idx) => (
                      <div key={item.bordadoId} className="bg-white/50 p-3 rounded-2xl border border-violet-50 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="text-xs font-black text-gray-900 uppercase italic leading-none">{item.nombre}</div>
                          <button type="button" onClick={() => setBordadosSeleccionados(s => s.filter(b => b.bordadoId !== item.bordadoId))} className="text-violet-300 hover:text-red-500">✕</button>
                        </div>
                        <div className="flex gap-2">
                          <input value={item.posicion} onChange={e => {
                              const next = [...bordadosSeleccionados]; next[idx].posicion = e.target.value; setBordadosSeleccionados(next)
                          }} placeholder="Posición" className="flex-1 text-xs font-bold bg-white border border-violet-50 rounded-lg px-2 py-1 outline-none" />
                          <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                            +${item.costo.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl overflow-x-auto">
            <h3 className="text-sm font-black uppercase text-gray-900 mb-8 tracking-tighter italic flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              Matriz de Medidas por Talle (CM)
            </h3>
            <div className="flex gap-10 mb-8">
              <div className="flex-1">
                <label className="block text-sm uppercase font-black text-gray-400 mb-2">Curva de Talles Aplicada</label>
                <select required value={curvaId} onChange={e => setCurvaId(e.target.value)} className="w-full text-sm font-black uppercase bg-gray-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">Seleccionar Curva...</option>
                  {curvas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="flex-[2] flex flex-col justify-end">
                <p className="text-sm text-gray-400 italic font-medium leading-relaxed">* Centímetros críticos para el control de calidad en taller.</p>
              </div>
            </div>

            {masterCat && curvaSeleccionada ? (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="bg-gray-50 text-sm font-black uppercase text-gray-400 p-4 rounded-2xl text-left">Ficha Técnica</th>
                      {curvaSeleccionada.items.map(t => <th key={t.id} className="bg-indigo-600 text-sm font-black uppercase text-white p-4 rounded-2xl min-w-[120px]">Talle {t.nombre}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {/* FILA DE CHECKS PARA PROMEDIO */}
                    <tr className="bg-gray-50/30">
                      <td className="p-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase italic">Usar para Promedio</td>
                      {curvaSeleccionada.items.map(t => (
                        <td key={t.id} className="text-center">
                          <input 
                            type="checkbox"
                            checked={selectedTallesAvg.includes(t.nombre.trim().toUpperCase())}
                            onChange={e => {
                               const tKey = t.nombre.trim().toUpperCase()
                               if (e.target.checked) setSelectedTallesAvg([...selectedTallesAvg, tKey])
                               else setSelectedTallesAvg(selectedTallesAvg.filter(s => s !== tKey))
                            }}
                            className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* FILA DE BARCODES (ESENCIAL PARA PYMES) */}
                    <tr className="bg-amber-50/30">
                      <td className="p-4 rounded-2xl text-[10px] font-black text-amber-600 border border-amber-100 italic uppercase">Código de Barra (SKU)</td>
                      {curvaSeleccionada.items.map(t => {
                        const tKey = t.nombre.trim().toUpperCase()
                        return (
                          <td key={t.id}>
                            <div className="flex gap-1 items-center">
                              <input 
                                placeholder="Escanear..."
                                value={pdmMetadata[tKey]?.codigoBarra || ''} 
                                onChange={e => {
                                    const next = { ...pdmMetadata }; 
                                    if (!next[tKey]) next[tKey] = { refMolderia: '', peso: '', codigoBarra: '', consumos: {} }; 
                                    next[tKey].codigoBarra = e.target.value; 
                                    setPdmMetadata(next)
                                }} 
                                className="w-full bg-white border border-amber-200 rounded-2xl p-4 text-center text-[10px] font-mono font-black shadow-sm outline-none placeholder:text-amber-200" 
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    <tr className="bg-emerald-50/10">
                      <td className="p-4 rounded-2xl text-[10px] font-black text-emerald-700 border border-emerald-50 italic uppercase">Precio Talle ($)</td>
                      {curvaSeleccionada.items.map(t => {
                        const tKey = t.nombre.trim().toUpperCase()
                        return (
                          <td key={t.id}>
                            <input 
                              type="number" step="0.01"
                              placeholder={preciosSegmentos.final || '0'}
                              value={pdmMetadata[tKey]?.precioVenta || ''} 
                              onChange={e => {
                                  const next = { ...pdmMetadata }; 
                                  if (!next[tKey]) next[tKey] = { refMolderia: '', peso: '', codigoBarra: '', precioVenta: '', consumos: {} }; 
                                  next[tKey].precioVenta = e.target.value; 
                                  setPdmMetadata(next)
                              }} 
                              className="w-full bg-white border border-emerald-100 rounded-2xl p-4 text-center text-[10px] font-black shadow-sm outline-none focus:ring-1 focus:ring-emerald-500" 
                            />
                          </td>
                        )
                      })}
                    </tr>
                    {modoVista === 'INDUSTRIAL' && (
                      <tr className="bg-indigo-50/30">
                        <td className="p-4 rounded-2xl text-[10px] font-black text-indigo-600 border border-indigo-100 italic uppercase">Referencia Moldería</td>
                        {curvaSeleccionada.items.map(t => (
                          <td key={t.id}>
                            <input 
                              placeholder="Ej: CH-S-V2"
                              value={pdmMetadata[t.nombre.trim().toUpperCase()]?.refMolderia || ''} 
                              onChange={e => {
                                  const tKey = t.nombre.trim().toUpperCase()
                                  const next = { ...pdmMetadata }; 
                                  if (!next[tKey]) next[tKey] = { refMolderia: '', peso: '', codigoBarra: '', consumos: {} }; 
                                  next[tKey].refMolderia = e.target.value.toUpperCase(); 
                                  setPdmMetadata(next)
                              }} 
                              className="w-full bg-white border border-indigo-200 rounded-2xl p-4 text-center text-xs font-black shadow-sm outline-none placeholder:text-indigo-200" 
                            />
                          </td>
                        ))}
                      </tr>
                    )}
                    
                    {/* FILAS DE CONSUMO TELA (OCULTAR SI ES RETAIL/BULK) */}
                    {modoVista === 'INDUSTRIAL' && insumosSeleccionados.filter(i => todosInsumos.find(ti => ti.id === i.insumoId)?.tipo === 'TELA').map(insumo => {
                      const insumoFull = todosInsumos.find(ti => ti.id === insumo.insumoId)
                      const unidadBase = (insumoFull?.unidad || 'm').toLowerCase()
                      
                      return (
                        <tr key={insumo.insumoId} className="bg-emerald-50/30">
                          <td className="p-4 rounded-2xl text-[10px] font-black text-emerald-600 border border-emerald-100 italic uppercase">
                            {insumo.nombre} ({unidadBase})
                            {insumoFull?.gramaje && insumoFull?.ancho && (
                                <div className="text-[8px] text-emerald-400 normal-case font-medium mt-1">
                                    {insumoFull.gramaje}g/m² | {insumoFull.ancho}m ancho
                                </div>
                            )}
                          </td>
                          {curvaSeleccionada.items.map(t => {
                            const tKey = t.nombre.trim().toUpperCase()
                            const valStr = pdmMetadata[tKey]?.consumos?.[insumo.insumoId] || ''
                            const valNum = parseFloat(valStr) || 0
                            
                            // Ayudante de conversión
                            let subtext = ''
                            if (valNum > 0) {
                                if (unidadBase === 'kg') {
                                    subtext = `${(valNum * 1000).toFixed(0)}g`
                                } else if (unidadBase === 'metro' || unidadBase === 'm') {
                                    // Si es tela de punto (común que se guarde como metro pero sea por peso)
                                    if (insumoFull?.gramaje && insumoFull?.ancho) {
                                        const linearWeight = (insumoFull.gramaje * insumoFull.ancho) / 1000
                                        subtext = `${(valNum * linearWeight * 1000).toFixed(0)}g`
                                    } else {
                                        subtext = `${(valNum * 100).toFixed(0)}cm`
                                    }
                                }
                            }

                            return (
                              <td key={t.id}>
                                <div className="flex flex-col items-center">
                                    <input 
                                    type="number" step="0.001" placeholder="0.000"
                                    value={valStr} 
                                    onChange={e => {
                                        const next = { ...pdmMetadata }; 
                                        if (!next[tKey]) next[tKey] = { refMolderia: '', peso: '', codigoBarra: '', consumos: {} }; 
                                        if (!next[tKey].consumos) next[tKey].consumos = {};
                                        next[tKey].consumos[insumo.insumoId] = e.target.value; 
                                        setPdmMetadata(next)
                                    }} 
                                    className="w-full bg-white border border-emerald-200 rounded-2xl p-4 text-center text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-emerald-200" 
                                    />
                                    {subtext && (
                                        <span className="text-[9px] font-black text-emerald-500 mt-1 uppercase tracking-tighter">
                                            ≈ {subtext}
                                        </span>
                                    )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    <tr className="h-4"></tr>

                    {tipo !== 'COMPRADO' && masterCat.puntosReferencia?.map(punto => (
                      <tr key={punto.id}>
                        <td className="bg-gray-50/50 p-4 rounded-2xl text-sm font-black text-gray-900 border border-gray-50">{punto.nombre}</td>
                        {curvaSeleccionada.items.map(t => (
                          <td key={t.id}>
                            <input type="number" step="0.1" value={matrizMedidas[t.nombre]?.[punto.id] || ''} onChange={e => {
                                const next = { ...matrizMedidas }; if (!next[t.nombre]) next[t.nombre] = {}; next[t.nombre][punto.id] = e.target.value; setMatrizMedidas(next)
                            }} className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-center text-sm font-black shadow-sm outline-none" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100 text-sm font-black text-gray-400 uppercase tracking-widest">
                Selecciona Categoría y Curva para habilitar matriz de cm
              </div>
            )}
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black uppercase text-gray-900 mb-10 tracking-tighter italic flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              Simulador de Costos y Rentabilidad Segmentada
            </h3>

            {/* SEGMENT SELECTOR TABS */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-10 w-fit">
              {[
                { id: 'final', label: 'Final', color: 'bg-emerald-500' },
                { id: 'revendedor', label: 'Revendedor', color: 'bg-amber-500' },
                { id: 'empresa', label: 'Empresa', color: 'bg-blue-500' },
                { id: 'revendido', label: 'Revendido', color: 'bg-purple-500' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSegmentoSimulacion(s.id as any)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${segmentoSimulacion === s.id ? `${s.color} text-white shadow-lg` : 'text-gray-400 hover:text-gray-900'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="bg-[#f3f4f6] rounded-[2rem] p-8 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-500">Cálculo de Costos Estimados</h4>
                  <span className="bg-gray-800 text-white text-xs font-black px-2 py-1 rounded">INDUSTRIAL ({segmentoSimulacion})</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-400 uppercase">Base de Aplicación</span>
                    <span className="text-sm font-black text-gray-900">${costeBaseIndustrial.toLocaleString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">MO ({(getPct('mo_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.mo.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">LOG ({(getPct('logistica_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.logistica.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">ADM ({(getPct('admin_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.admin.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">VTA ({(getPct('ventas_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.ventas.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">L25413 ({(getPct('ley_25413') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.ley.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-gray-100">
                      <span className="block text-xs font-black text-gray-400 uppercase">FIJOS ({(getPct('fijos_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-gray-700">${overheadsAvg.fijos.toLocaleString()}</span>
                    </div>
                  </div>

                  {extraIndustrialCosts.map((c, i) => (
                    <div key={i} className="flex justify-between items-center bg-indigo-50/50 p-2 px-4 rounded-xl border border-indigo-100/50">
                      <span className="text-xs font-black text-indigo-400 uppercase">{c.name} ({ (c.pct*100).toFixed(1) }%)</span>
                      <span className="text-sm font-black text-indigo-700">${c.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between items-center px-4 py-3 bg-white/40 rounded-xl border border-white/60 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insumos + Gastos Operativos</span>
                      <span className="text-sm font-black text-gray-600">${industrialSubTotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-4 py-3 bg-violet-50/50 rounded-xl border border-violet-100">
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                         <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Servicios de Bordaduría</span>
                       </div>
                      <span className="text-sm font-black text-violet-600">${totalBordados.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center px-6 py-5 bg-gray-900 rounded-[2rem] shadow-2xl shadow-gray-200 mt-4 border border-gray-800">
                      <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-1">Costo de Salida</span>
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest italic">Total Industrial</span>
                      </div>
                      <span className="text-2xl font-black text-white tracking-tighter italic">${totalIndustrialCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#fff1f2] rounded-[2rem] p-8 border border-red-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-400">Impuestos y Comisiones</h4>
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded">COMERCIAL ({segmentoSimulacion})</span>
                </div>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-white/50 border border-red-50">
                      <span className="block text-xs font-black text-red-300 uppercase">IVA ({(getPct('iva') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-red-600">${ivaVal.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-red-50">
                      <span className="block text-xs font-black text-red-300 uppercase">IIBB ({(getPct('iibb') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-red-600">${iibbVal.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-white/50 border border-red-50">
                      <span className="block text-xs font-black text-red-300 uppercase">TJR ({(getPct('costo_tarjeta') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-red-600">${tarjetaVal.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-red-50">
                      <span className="block text-xs font-black text-red-300 uppercase">COM ({(getPct('comision_pct') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-red-600">${comisionVal.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/50 border border-red-50">
                      <span className="block text-xs font-black text-red-300 uppercase">L25413 ({(getPct('ley_cheque_vta') * 100).toFixed(1)}%)</span>
                      <span className="text-sm font-black text-red-600">${leyVtaVal.toLocaleString()}</span>
                    </div>
                  </div>

                  {calcExtraTaxes.map((t, i) => (
                    <div key={i} className="flex justify-between items-center bg-red-50/50 p-2 px-4 rounded-xl border border-red-100/50">
                      <span className="text-xs font-black text-red-400 uppercase">{t.name}</span>
                      <span className="text-sm font-black text-red-700">${t.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="bg-red-600 p-4 rounded-2xl flex justify-between items-center mt-6 shadow-lg">
                    <span className="text-sm font-black text-red-200 uppercase">Total Imp/Com</span>
                    <span className="text-xl font-black text-white">${totalTaxes.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
               <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                  <div>
                    <label className="block text-sm font-black uppercase text-indigo-300 mb-4 tracking-widest">Margen Neto Objetivo (%)</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="5" max="60" value={targetMargin} onChange={e => setTargetMargin(parseInt(e.target.value))} className="flex-1 accent-indigo-500" />
                      <span className="text-3xl font-black italic">{targetMargin}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 italic">Cálculo inverso basado en la matriz "{segmentoSimulacion}".</p>
                  </div>
                  
                  <div className="lg:border-x lg:border-white/10 lg:px-12 text-center lg:text-left">
                     <label className="block text-sm font-black uppercase text-emerald-400 mb-4 tracking-widest">Precio Venta Recomendado</label>
                     <div className="text-5xl font-black italic tracking-tighter text-emerald-400 leading-none">
                        ${recommendedPrice > 0 ? recommendedPrice.toLocaleString(undefined, {maximumFractionDigits:0}) : '0'}
                     </div>
                     <div className="mt-4 flex items-center justify-center lg:justify-start gap-2">
                        <span className="text-sm font-black text-gray-400 uppercase">Rentabilidad Neta:</span>
                        <span className="text-sm font-black text-emerald-500">${netProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                     </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Fijar Precio ({segmentoSimulacion})</label>
                    <input 
                      type="number" 
                      value={preciosSegmentos[segmentoSimulacion]} 
                      onChange={e => setPreciosSegmentos(prev => ({ ...prev, [segmentoSimulacion]: e.target.value }))}
                      placeholder="Fijar Precio..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-white"
                    />
                    <div className="mt-4 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] font-black">
                        <span className="text-gray-500 uppercase">Margen Real:</span>
                        <span className={`italic ${netMarginPct >= targetMargin ? 'text-emerald-400' : 'text-red-400'}`}>
                          {netMarginPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black">
                        <span className="text-gray-500 uppercase">Resultado Neto:</span>
                        <span className="text-white">${netProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                    </div>
                  </div>
               </div>

               
            </div>

            {/* TABLA DE RENTABILIDAD REAL POR TALLE */}
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl overflow-hidden mt-10">
              <h3 className="text-sm font-black uppercase text-gray-900 mb-8 tracking-tighter italic flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                Análisis de Rentabilidad Real por Talle
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 p-4 rounded-2xl text-left">Talle</th>
                      <th className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 p-4 rounded-2xl">Costo Ind. Real</th>
                      <th className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 p-4 rounded-2xl">Precio Sug. (fijado)</th>
                      <th className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 p-4 rounded-2xl">Margen Neto Real</th>
                      <th className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 p-4 rounded-2xl">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curvaSeleccionada?.items.map(t => {
                      const costTotalSize = getCostoTalle(t.nombre) || 0
                      const costBaseSize = costTotalSize - totalBordados // Base sin bordado para overheads
                      
                      const overheadsSize = getOverheadsForBase(costBaseSize)
                      const industrialSizeTotal = costBaseSize + overheadsSize.total + totalBordados
                      
                      const currentPriceFix = parseFloat(preciosSegmentos[segmentoSimulacion]) || recommendedPrice
                      const tNetProfit = currentPriceFix - industrialSizeTotal - totalTaxes
                      const tMargin = currentPriceFix > 0 ? (tNetProfit / currentPriceFix) * 100 : 0
                      const isLow = tMargin < targetMargin

                      return (
                        <tr key={t.id}>
                          <td className="bg-indigo-50 text-indigo-700 p-4 rounded-2xl text-sm font-black text-center">{t.nombre}</td>
                          <td className="bg-gray-50 p-4 rounded-2xl text-center text-sm font-bold text-gray-600">${industrialSizeTotal.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="bg-gray-50 p-4 rounded-2xl text-center text-sm font-bold text-gray-900">${currentPriceFix.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className={`p-4 rounded-2xl text-center text-sm font-black ${isLow ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                            {tMargin.toFixed(1)}%
                          </td>
                          <td className="text-center">
                            {isLow ? (
                              <span className="text-red-500 text-[10px] font-black uppercase bg-red-100 px-3 py-1 rounded-full animate-pulse">Margen Bajo</span>
                            ) : (
                              <span className="text-emerald-500 text-[10px] font-black uppercase bg-emerald-100 px-3 py-1 rounded-full">Excelente</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="h-10"></div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl">
             <h3 className="text-sm font-black uppercase text-gray-900 mb-8 tracking-tighter italic flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              Galería de Referencia Técnica
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {IMAGEN_SLOTS.map(et => (
                <div key={et} className="group relative">
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-tighter truncate">{et}</label>
                  <div onClick={() => !imagenes[et] && document.getElementById(`file-${et}`)?.click()} className={`aspect-square rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all cursor-pointer ${imagenes[et] ? 'bg-white border-indigo-100' : 'bg-gray-50/50 border-gray-100'}`}>
                    {subiendoImg === et ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : 
                      imagenes[et] ? (
                        <div className="w-full h-full relative">
                          <img src={imagenes[et]} className="w-full h-full object-cover" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); const n = {...imagenes}; delete n[et]; setImagenes(n) }} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20">×</button>
                        </div>
                      ) : <span className="text-2xl grayscale opacity-30">📸</span>
                    }
                    <input id={`file-${et}`} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSubirArchivo(et, e.target.files[0])} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-6 justify-end items-center pt-10">
            <button type="button" onClick={() => navigate('/productos')} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">Descartar</button>
            <button type="submit" disabled={mutation.isPending || (!id && (!categoriaId || !curvaId))} className="bg-indigo-600 text-white text-sm font-black uppercase tracking-[0.4em] px-12 py-6 rounded-full hover:bg-gray-900 transition-all shadow-2xl disabled:opacity-50">
              {mutation.isPending ? 'Sincronizando...' : id ? 'Actualizar Ficha Técnica' : 'Finalizar Alta Técnica'}
            </button>
          </div>
        </div>
      </form>
      <Toaster position="bottom-right" />
    </div>
  )
}
