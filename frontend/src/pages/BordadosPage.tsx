import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bordadosApi, productosApi, configuracionApi, type Bordado } from '../lib/api'
import { Toaster, toast } from 'react-hot-toast'
import { formatCurrency } from '../lib/utils'
import { useAuthStore } from '../store/authStore'

// Default Config Values (Bottom-Up)
const DEFAULT_CONFIG = {
  B_SUELDO_OP_USD: '600',
  B_HORAS_OP_MES: '160',
  B_VALOR_MAQUINA_USD: '15000',
  B_MESES_AMORTIZA: '60',
  B_HORAS_MAQ_MES: '160',
  B_HORAS_TURNO: '8',
  B_PUNTADAS_TURNO: '160000',
  B_COSTO_INSUMO_1K_USD: '0.15',
  B_COSTOS_FIJOS_PCT: '20', // % Mantenimiento y Energía
  B_TARIFA_MIN_USD: '0.00',
  B_PONCHADO_USD: '15.00',
  B_MARGEN_FINAL: '40',
  B_MARGEN_MAYORISTA: '60',
  B_MARGEN_REVENDEDOR: '30',
  COTIZACION_DOLAR: '1500', // General FX
  
  // -- CONFIGURACIÓN INDUSTRIAL BORDADO (COLUMNA B) --
  mo_pct_b: '0',
  admin_pct_b: '0',
  logistica_pct_b: '0',
  iva_b: '0',
  iibb_b: '0',
  costo_tarjeta_b: '0',
  comision_pct_b: '0',
  target_margin_pct_b: '0',

  // -- MÁRGENES POR PERFIL (MOTOR FINANCIERO) --
  target_margin_pct_final: '0.40',
  target_margin_pct_empresa: '0.35',
  target_margin_pct_revendedor: '0.30',
  target_margin_pct_revendido: '0.25'
}

export function BordadosPage() {
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const esAdmin = usuario?.rol === 'SUPER_ADMIN' || usuario?.rol === 'CLIENT_ADMIN'
  
  const [tab, setTab] = useState<'catalogo' | 'ajustes'>('catalogo')

  // Redirección forzada si no es admin e intenta entrar a ajustes
  useEffect(() => {
    if (!esAdmin && tab === 'ajustes') {
      setTab('catalogo')
    }
  }, [esAdmin, tab])

  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [editando, setEditando] = useState<Bordado | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [buscar, setBuscar] = useState('')

  // ─── Consultas a la API ───────────────────────────────────────────────────
  const { data: bordados = [], isLoading: loadingBordados } = useQuery({
    queryKey: ['bordados'],
    queryFn: bordadosApi.listar
  })

  // Filtrado local para el buscador
  const bordadosFiltrados = bordados.filter(b => 
    b.nombre.toLowerCase().includes(buscar.toLowerCase()) || 
    b.descripcion?.toLowerCase().includes(buscar.toLowerCase())
  )

  const { data: rawConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get
  })

  const configObj = { ...DEFAULT_CONFIG, ...rawConfig }
  const fxDolar = parseFloat(configObj.COTIZACION_DOLAR || '1')

  const PERFILES_CLIENTE = [
    { id: 'final', nombre: 'Público', key: 'target_margin_pct_final' },
    { id: 'empresa', nombre: 'Empresa', key: 'target_margin_pct_empresa' },
    { id: 'revendedor', nombre: 'Revendedor', key: 'target_margin_pct_revendedor' },
    { id: 'revendido', nombre: 'Revendido', key: 'target_margin_pct_revendido' },
  ]

  // ─── LÓGICA DEL MOTOR BOTTOM-UP ──────────────────────────────────────────
  const sueldo = parseFloat(configObj.B_SUELDO_OP_USD)
  const horasOp = parseFloat(configObj.B_HORAS_OP_MES)
  const costoHoraHombre = (sueldo / horasOp) || 0

  const maqValor = parseFloat(configObj.B_VALOR_MAQUINA_USD)
  const maqMeses = parseFloat(configObj.B_MESES_AMORTIZA)
  const horasMaq = parseFloat(configObj.B_HORAS_MAQ_MES) || 160
  const costoMesaMaq = (maqValor / maqMeses) || 0
  const costoHoraMaquina = (costoMesaMaq / horasMaq) || 0

  const gastosFijosPct = parseFloat(configObj.B_COSTOS_FIJOS_PCT) / 100
  // El costo hora base incrementado por el % de mantenimiento y energía
  const costoHoraFijo = (costoHoraHombre + costoHoraMaquina) * (1 + gastosFijosPct)

  const horasTurno = parseFloat(configObj.B_HORAS_TURNO) || 8
  const puntadasDia = parseFloat(configObj.B_PUNTADAS_TURNO)
  const puntadasHora = (puntadasDia / horasTurno) || 0
  const multiplicadorHora = puntadasHora > 0 ? (1000 / puntadasHora) : 0

  const costoFijo1000 = costoHoraFijo * multiplicadorHora
  const costoInsumos1000 = parseFloat(configObj.B_COSTO_INSUMO_1K_USD)
  const COSTO_BASE_1000_USD = costoFijo1000 + costoInsumos1000

  // ─── Formulario de Alta de Diseño ─────────────────────────────────────────
  const [form, setForm] = useState({
    nombre: '', descripcion: '', puntadas: '0',
    precioPorMillar: '', costoPonchado: '', marginTerceros: '0',
    fotoUrl: '', archivoMatrizUrl: ''
  })

  // -- COSTEO Y SIMULACIÓN INDUSTRIAL (SYNC WITH PRODUCTOS) --
  const [segmentoSimulacion, setSegmentoSimulacion] = useState<'final' | 'revendedor' | 'empresa' | 'revendido'>('final')
  const [preciosSegmentos, setPreciosSegmentos] = useState<Record<string, string>>({
    final: '', revendedor: '', empresa: '', revendido: ''
  })
  const [targetMargin, setTargetMargin] = useState(40)

  useEffect(() => {
    if (loadingConfig) return // Evitar ejecución durante la carga

    if (editando) {
      setForm({
         nombre: editando.nombre,
         descripcion: editando.descripcion || '',
         puntadas: editando.puntadas.toString(),
         precioPorMillar: editando.precioPorMillar.toString(),
         costoPonchado: editando.costoPonchado.toString(),
         marginTerceros: (editando.marginTerceros || 0).toString(),
         fotoUrl: editando.fotoUrl || '',
         archivoMatrizUrl: editando.archivoMatrizUrl || ''
      })
      setPreciosSegmentos({
        final: (editando as any).precioFinal?.toString() || '',
        revendedor: (editando as any).precioRevendedor?.toString() || '',
        empresa: (editando as any).precioEmpresa?.toString() || '',
        revendido: (editando as any).precioRevendido?.toString() || ''
      })
    } else if (mostrarAlta) {
      // Valores iniciales para ALTA solo si el modal está abierto y no estamos editando
      setForm(prev => ({
        ...prev,
        nombre: '', descripcion: '', puntadas: '0',
        precioPorMillar: COSTO_BASE_1000_USD.toFixed(4),
        costoPonchado: (rawConfig as any)?.B_PONCHADO_USD || DEFAULT_CONFIG.B_PONCHADO_USD,
        marginTerceros: '0',
        fotoUrl: '', archivoMatrizUrl: ''
      }))
      setPreciosSegmentos({ final: '', revendedor: '', empresa: '', revendido: '' })
    }
  }, [editando, mostrarAlta, rawConfig, loadingConfig])

  const mutacion = useMutation({
    mutationFn: (data: any) => data.id ? bordadosApi.editar(data.id, data) : bordadosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bordados'] })
      setMostrarAlta(false)
      setEditando(null)
      toast.success(editando ? 'Diseño actualizado' : 'Diseño guardado')
    },
    onError: (err: any) => {
      console.error(err)
      toast.error('Error al guardar el diseño. Revisa los datos.')
    }
  })

  const mutacionBorrar = useMutation({
    mutationFn: bordadosApi.eliminar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bordados'] }); toast.success('Diseño eliminado') },
  })

  const handleSubir = async (file: File, key: 'fotoUrl' | 'archivoMatrizUrl') => {
    try {
      setSubiendo(key)
      const res = await productosApi.subirImagen(file)
      if (editando) setEditando({ ...editando, [key]: res.url })
      else setForm(prev => ({ ...prev, [key]: res.url }))
    } catch {
      toast.error('Error al subir')
    } finally {
      setSubiendo(null)
    }
  }

  // ─── Funciones de Costo Final ───────────────────────────────────────────
  const tarifaMinimaUSD = parseFloat(configObj.B_TARIFA_MIN_USD || '0')

  const simularCostoUSD = (puntadas: any, tasaMillarUSD: number) => {
    const p = parseFloat(String(puntadas))
    if (isNaN(p) || p <= 0) return 0
    const costoPuntadas = (p / 1000) * tasaMillarUSD
    return Math.max(costoPuntadas, tarifaMinimaUSD)
  }

  // ─── ESTADO: Ajustes Globales ───────────────────────────────────────────
  const [ajustesForm, setAjustesForm] = useState(DEFAULT_CONFIG)

  useEffect(() => {
    if (!loadingConfig) setAjustesForm({ ...DEFAULT_CONFIG, ...rawConfig })
  }, [rawConfig, loadingConfig])

  const ajustesMutacion = useMutation({
    mutationFn: (data: any) => configuracionApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      toast.success('Motor y márgenes actualizados correctamente')
    }
  })

  // Simulación in-vivo dentro de ajustes
  const hHombreA = (parseFloat(ajustesForm.B_SUELDO_OP_USD) / parseFloat(ajustesForm.B_HORAS_OP_MES)) || 0
  const horasMaqA = parseFloat(ajustesForm.B_HORAS_MAQ_MES) || 160
  const hMaqA = ((parseFloat(ajustesForm.B_VALOR_MAQUINA_USD) / parseFloat(ajustesForm.B_MESES_AMORTIZA)) / horasMaqA) || 0
  const pctGF = parseFloat(ajustesForm.B_COSTOS_FIJOS_PCT) / 100
  const hCostoReal = (hHombreA + hMaqA) * (1 + pctGF)
  const hTurno = parseFloat(ajustesForm.B_HORAS_TURNO) || 8
  const pM1A = hCostoReal * (1000 / (parseFloat(ajustesForm.B_PUNTADAS_TURNO) / hTurno))
  const totalM1A = pM1A + parseFloat(ajustesForm.B_COSTO_INSUMO_1K_USD)

  if (loadingBordados || loadingConfig) return <div className="text-center py-20 font-black animate-pulse">Sincronizando...</div>

  return (
    <div className="max-w-7xl mx-auto pb-20 px-6">
      <Toaster position="bottom-right" />

      {/* ── HEADER & TABS ── */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Almacén de Bordados</h1>
          <div className="flex gap-2">
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em] mt-2 bg-indigo-50 w-fit px-3 py-1 rounded-lg italic">
              Ingeniería de Puntadas
            </p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
              🇺🇸 USD 1 = 🇦🇷 ARS {formatCurrency(fxDolar).replace('$', '')}
            </p>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-full md:w-auto">
          <button
            onClick={() => setTab('catalogo')}
            className={`flex-1 md:flex-none uppercase text-[10px] font-black tracking-widest px-6 py-2.5 rounded-lg transition-all ${tab === 'catalogo' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Catálogo
          </button>
          
          {esAdmin && (
            <button
              onClick={() => setTab('ajustes')}
              className={`flex-1 md:flex-none uppercase text-[10px] font-black tracking-widest px-6 py-2.5 rounded-lg transition-all ${tab === 'ajustes' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Motor Financiero
            </button>
          )}
        </div>

        {tab === 'catalogo' && (
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <input 
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
                placeholder="Buscar diseño..."
                className="w-full bg-[#1a1b1e] border border-white/5 rounded-2xl px-6 py-3.5 text-sm font-medium text-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-600 group-hover:border-white/10"
              />
              <span className="absolute right-5 top-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors">🔍</span>
            </div>
            
            <button
              onClick={() => { setEditando(null); setMostrarAlta(true); setForm(prev => ({ ...prev, precioPorMillar: COSTO_BASE_1000_USD.toFixed(4), costoPonchado: configObj.B_PONCHADO_USD, marginTerceros: '0' })) }}
              className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-indigo-500 transition-all shadow-[0_10px_40px_rgba(79,70,229,0.2)] whitespace-nowrap active:scale-95"
            >
              + Cargar Nuevo Diseño
            </button>
          </div>
        )}
      </div>

      {/* ── PANEL DE CATÁLOGO (ESTILO TABLA INDUSTRIAL) ── */}
      {tab === 'catalogo' && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="bg-[#1a1b1e]/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">Diseño / Colección</th>
                    <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">Puntadas (pts)</th>
                    <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">Costo Base (USD)</th>
                    <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">Sugerido Final (ARS)</th>
                    <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500 text-center">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {bordadosFiltrados.map(b => {
                    const cUSD = simularCostoUSD(b.puntadas, b.precioPorMillar)
                    
                    // Cálculo de precio sugerido para el canal "final" (Público)
                    const getSvcPct = (k: string) => parseFloat((configObj as any)[`${k}_b`] || '0')
                    const pureStitchCostUSD = (b.puntadas / 1000) * b.precioPorMillar
                    const mo = pureStitchCostUSD * getSvcPct('mo_pct')
                    const log = pureStitchCostUSD * getSvcPct('logistica_pct')
                    const adm = pureStitchCostUSD * getSvcPct('admin_pct')
                    const costIndARS = (cUSD + mo + log + adm) * fxDolar
                    const taxes = getSvcPct('iva') + getSvcPct('iibb') + getSvcPct('costo_tarjeta') + getSvcPct('comision_pct')
                    const margin = parseFloat((configObj as any).target_margin_pct_final || '0.40')
                    const priceFinalARS = costIndARS / (1 - (taxes + margin))

                    return (
                      <tr key={b.id} className="group hover:bg-white/[0.01] transition-all cursor-default">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-indigo-500/10 group-hover:border-indigo-500/30 transition-all shadow-lg shrink-0">
                              {b.fotoUrl ? (
                                <img src={b.fotoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={b.nombre} />
                              ) : (
                                <span className="text-2xl grayscale opacity-30">🪡</span>
                              )}
                            </div>
                            <div>
                               <div className="text-base font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                                 {b.nombre}
                               </div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 max-w-[200px] truncate">
                                 {b.descripcion || 'Sin descripción técnica'}
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-base font-black text-gray-200 tracking-tighter">
                                {b.puntadas.toLocaleString()}
                              </span>
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Puntadas Totales</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-base font-black text-emerald-400 tracking-widest">
                                USD {formatCurrency(cUSD).replace('$', '')}
                              </span>
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                Tasa: {b.precioPorMillar.toFixed(3)} / mil
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 w-fit group-hover:bg-indigo-500/10 transition-all">
                              <div className="text-[9px] text-indigo-400 font-black uppercase mb-1 tracking-widest">Precio PDM Final</div>
                              <div className="text-xl font-black text-indigo-100 italic leading-none">
                                {formatCurrency(priceFinalARS)}
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => { setEditando(b); setMostrarAlta(true) }} 
                              className="bg-white/5 hover:bg-indigo-600 text-gray-500 hover:text-white p-3 rounded-2xl transition-all border border-white/5 shadow-inner"
                              title="Editar y Cotizar"
                            >
                              ✎
                            </button>
                            {esAdmin && (
                              <button 
                                onClick={() => { if (window.confirm('¿Eliminar diseño permanentemente?')) mutacionBorrar.mutate(b.id) }} 
                                className="bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white p-3 rounded-2xl transition-all border border-white/5 shadow-inner"
                                title="Borrar"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {bordadosFiltrados.length === 0 && (
                <div className="py-32 text-center">
                  <div className="text-4xl mb-4 grayscale opacity-20">📂</div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">No se encontraron diseños bordados</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* ── PANEL DE CONFIGURACIÓN ── */}
      {tab === 'ajustes' && (
        <div className="max-w-4xl bg-white rounded-[3rem] border border-gray-100 shadow-2xl p-10 mx-auto">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Motor de Costeo Bottom-Up</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">Integra tus costos reales en USD para armar un escudo anti-inflacionario.</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Costo Calculado x 1k</div>
              <div className="text-3xl font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                USD {totalM1A.toFixed(4)}
              </div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ajustesMutacion.mutate(ajustesForm) }} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HR */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 relative group">
                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">👨‍🔧 Recursos Humanos</h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Sueldo base sumando cargas sociales">Sueldo Bruto USD / Mes</label>
                    <input type="number" value={ajustesForm.B_SUELDO_OP_USD} onChange={e => setAjustesForm({ ...ajustesForm, B_SUELDO_OP_USD: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Horas que el operador se encuentra trabajando">Horas Productivas al Mes</label>
                    <input type="number" value={ajustesForm.B_HORAS_OP_MES} onChange={e => setAjustesForm({ ...ajustesForm, B_HORAS_OP_MES: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div className="bg-indigo-100/50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center mt-2">
                    <span className="text-[9px] uppercase font-bold text-indigo-600 cursor-help" title="Sueldo ÷ Horas Mensuales">Costo Puro Hora Hombre</span>
                    <span className="text-xs font-black text-indigo-700">USD {hHombreA.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Maquina */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 relative">
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">⚙️ Amortización Máquina</h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="El valor de reposición de tu bordadora">Valor de la Máquina USD</label>
                    <input type="number" value={ajustesForm.B_VALOR_MAQUINA_USD} onChange={e => setAjustesForm({ ...ajustesForm, B_VALOR_MAQUINA_USD: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="En cuántos meses buscas recuperar el dinero de la máquina">Meses Vida Útil (Amortiza)</label>
                      <input type="number" value={ajustesForm.B_MESES_AMORTIZA} onChange={e => setAjustesForm({ ...ajustesForm, B_MESES_AMORTIZA: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Cuántas horas mensuales vas a tener la máquina encendida produciendo">Horas Uso / Mes</label>
                      <input type="number" value={ajustesForm.B_HORAS_MAQ_MES || '160'} onChange={e => setAjustesForm({ ...ajustesForm, B_HORAS_MAQ_MES: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                    </div>
                  </div>
                  <div className="bg-orange-100/50 p-3 rounded-xl border border-orange-100 flex justify-between items-center mt-2">
                    <span className="text-[9px] uppercase font-bold text-orange-600 cursor-help" title="(Valor Máquina ÷ Meses Amortización) ÷ Horas Uso">Costo Puro Hora Máquina</span>
                    <span className="text-xs font-black text-orange-700">USD {hMaqA.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GASTOS FIJOS Y ENERGIA */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 relative mb-6">
              <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">🔌 Gastos Generales (Servicios y Mantenimiento)</h3>
              <div className="text-[10px] text-gray-500 mb-4 pr-10">Las bordadoras consumen alta energía y requieren recambios frecuentes (agujas, lubricación, correas, luz). Incrementamos el costo hora base productivo (Hombre + Máquina) en un porcentaje de Gastos de Fabricación (GF) extra.</div>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Porcentaje sobre Costo Base (%)</label>
                  <div className="relative">
                    <input type="number" value={ajustesForm.B_COSTOS_FIJOS_PCT} onChange={e => setAjustesForm({ ...ajustesForm, B_COSTOS_FIJOS_PCT: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl pl-4 pr-8 py-3 outline-none border-red-100 focus:border-red-300 focus:ring-1 focus:ring-red-200" />
                    <span className="absolute right-4 top-3 text-sm font-black text-gray-400">%</span>
                  </div>
                </div>
                <div className="flex-1 bg-red-100/50 p-3 rounded-xl border border-red-100 flex justify-between items-center mt-5">
                  <span className="text-[9px] uppercase font-bold text-red-600 cursor-help" title="(Costo Hombre + Costo Maquina) * % Mantenimiento">Costo Hora TOTAL con GF</span>
                  <span className="text-xs font-black text-red-700">USD {hCostoReal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Productividad e Insumos */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-4 flex items-center gap-2">🧵 Insumos y Eficiencia</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Cantidad de horas que tiene un turno productivo diario.">Horas del Turno</label>
                    <input type="number" value={ajustesForm.B_HORAS_TURNO} onChange={e => setAjustesForm({ ...ajustesForm, B_HORAS_TURNO: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Cuántas puntadas logras hacer finalizado este turno restando los frenos y cortes.">Puntadas x Turno</label>
                    <input type="number" value={ajustesForm.B_PUNTADAS_TURNO} onChange={e => setAjustesForm({ ...ajustesForm, B_PUNTADAS_TURNO: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Hilo Bobina y Cono, Entretelas, Aceites.">Costo Directo Insumos x 1k (USD)</label>
                  <input type="number" step="0.01" value={ajustesForm.B_COSTO_INSUMO_1K_USD} onChange={e => setAjustesForm({ ...ajustesForm, B_COSTO_INSUMO_1K_USD: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                </div>
              </div>

              {/* Logistica Setup */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">📦 Valores Fijos Adicionales</h3>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="Al enhebrar un bordado de 500ptds el operador pierde minutos que no se cobran en la tasa x millar.">Tarifa Piso USD (Protección Enhebrado)</label>
                  <input type="number" step="0.01" value={ajustesForm.B_TARIFA_MIN_USD} onChange={e => setAjustesForm({ ...ajustesForm, B_TARIFA_MIN_USD: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 cursor-help" title="La matriz DST se cobra 1 vez al iniciar el lote de producción y nunca más.">Costo Fijo Matriz / Ponchado USD</label>
                  <input type="number" step="0.01" value={ajustesForm.B_PONCHADO_USD} onChange={e => setAjustesForm({ ...ajustesForm, B_PONCHADO_USD: e.target.value })} className="w-full text-sm font-black text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none" />
                </div>
              </div>

              {/* NUEVO PANEL: Perfiles de Venta */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-gray-900 rounded-3xl p-6 border border-indigo-900 space-y-4 shadow-xl">
                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">📈 Márgenes de Venta Sugeridos</h3>
                <div className="text-[10px] text-gray-400 mb-4 pr-10">Configura la rentabilidad (%) sobre el costo de producción para tus distintos perfiles de clientes. Estos multiplicadores generan la lista de precios que verás en las simulaciones automáticas.</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-emerald-400 mb-1 tracking-widest">Público (F)</label>
                    <div className="relative">
                      <input type="number" value={(parseFloat(ajustesForm.target_margin_pct_final) * 100) || 0} onChange={e => setAjustesForm({ ...ajustesForm, target_margin_pct_final: (parseFloat(e.target.value)/100).toString() })} className="w-full text-sm font-black text-white bg-indigo-950/50 border border-indigo-500/30 rounded-xl pl-4 pr-8 py-3 outline-none" />
                      <span className="absolute right-4 top-3 text-sm font-bold text-indigo-400/50">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-blue-400 mb-1 tracking-widest">Empresa (E)</label>
                    <div className="relative">
                      <input type="number" value={(parseFloat(ajustesForm.target_margin_pct_empresa) * 100) || 0} onChange={e => setAjustesForm({ ...ajustesForm, target_margin_pct_empresa: (parseFloat(e.target.value)/100).toString() })} className="w-full text-sm font-black text-white bg-indigo-950/50 border border-indigo-500/30 rounded-xl pl-4 pr-8 py-3 outline-none" />
                      <span className="absolute right-4 top-3 text-sm font-bold text-indigo-400/50">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-amber-400 mb-1 tracking-widest">Revendedor (R)</label>
                    <div className="relative">
                      <input type="number" value={(parseFloat(ajustesForm.target_margin_pct_revendedor) * 100) || 0} onChange={e => setAjustesForm({ ...ajustesForm, target_margin_pct_revendedor: (parseFloat(e.target.value)/100).toString() })} className="w-full text-sm font-black text-white bg-indigo-950/50 border border-indigo-500/30 rounded-xl pl-4 pr-8 py-3 outline-none" />
                      <span className="absolute right-4 top-3 text-sm font-bold text-indigo-400/50">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-purple-400 mb-1 tracking-widest">Revendido (V)</label>
                    <div className="relative">
                      <input type="number" value={(parseFloat(ajustesForm.target_margin_pct_revendido) * 100) || 0} onChange={e => setAjustesForm({ ...ajustesForm, target_margin_pct_revendido: (parseFloat(e.target.value)/100).toString() })} className="w-full text-sm font-black text-white bg-indigo-950/50 border border-indigo-500/30 rounded-xl pl-4 pr-8 py-3 outline-none" />
                      <span className="absolute right-4 top-3 text-sm font-bold text-indigo-400/50">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={ajustesMutacion.isPending} className="w-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-emerald-500/20 shadow-xl disabled:opacity-50 mt-4 active:scale-95">
              {ajustesMutacion.isPending ? 'Sincronizando...' : 'Guardar y Sincronizar Motor Financiero'}
            </button>
          </form>
        </div>
      )}

      {/* ── ALTA/EDICIÓN MODAL ── */}
      {mostrarAlta && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={() => { setMostrarAlta(false); setEditando(null) }} />
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative animate-in slide-in-from-right duration-300 flex flex-col">

            <div className="flex justify-between items-center px-10 py-8 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
                  {editando ? `Edición / Cotización` : 'Cotizador de Diseño'}
                </h2>
                <div className="flex gap-2 mt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{editando ? editando.nombre : 'Simulación Multimoneda'}</p>
                </div>
              </div>
              <button onClick={() => { setMostrarAlta(false); setEditando(null) }} className="text-gray-300 hover:text-gray-900 text-xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-all">✕</button>
            </div>

            {editando && (editando.precioPorMillar !== parseFloat(COSTO_BASE_1000_USD.toFixed(4)) || editando.costoPonchado !== parseFloat(configObj.B_PONCHADO_USD)) && (
              <div className="mx-10 mt-6 p-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl shadow-sm">⚖️</div>
                  <div>
                    <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Costos Desactualizados</h4>
                    <p className="text-[9px] font-bold text-amber-600/80 leading-tight pr-4">Este diseño guardó valores antiguos. El motor financiero actual sugiere actualizar la tasa USD y el setup de matriz.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setEditando({ 
                      ...editando, 
                      precioPorMillar: parseFloat(COSTO_BASE_1000_USD.toFixed(4)),
                      costoPonchado: parseFloat(configObj.B_PONCHADO_USD)
                    })
                    toast.success('Valores sincronizados con el mercado')
                  }}
                  className="bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 shrink-0"
                >
                  Actualizar Valores
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const obj = editando || form;

                const payload = {
                  ...obj,
                  puntadas: parseInt(String(obj.puntadas)),
                  precioPorMillar: parseFloat(String(obj.precioPorMillar)),
                  costoPonchado: parseFloat(String(obj.costoPonchado)),
                  marginTerceros: parseFloat(String(obj.marginTerceros || '0')),
                  precioFinal: parseFloat(preciosSegmentos.final) || null,
                  precioRevendedor: parseFloat(preciosSegmentos.revendedor) || null,
                  precioEmpresa: parseFloat(preciosSegmentos.empresa) || null,
                  precioRevendido: parseFloat(preciosSegmentos.revendido) || null,
                }
                mutacion.mutate(payload)
              }}
              className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar"
            >
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-2 ml-1">Nombre o ID del Diseño</label>
                <input
                  required
                  value={editando ? editando.nombre : form.nombre}
                  onChange={e => editando ? setEditando({ ...editando, nombre: e.target.value }) : setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Logo Liceo 2024"
                  className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-indigo-600 mb-2 ml-1 cursor-help" title="Cantidad de puntadas que demora la bordadora en terminar la prenda">Puntadas</label>
                  <input
                    required type="number"
                    value={editando ? editando.puntadas : form.puntadas}
                    onChange={e => editando ? setEditando({ ...editando, puntadas: parseInt(e.target.value) }) : setForm({ ...form, puntadas: e.target.value })}
                    className="w-full text-base font-black bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl px-4 py-3 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-emerald-600 mb-2 ml-1 flex justify-between items-center group cursor-help" title="Costo generado automáticamente por tu Matriz Financiera. Se ingresa en USD.">
                    <span>Tasa Industrial (USD x 1k)</span>
                    {esAdmin && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (editando) setEditando({ ...editando, precioPorMillar: parseFloat(COSTO_BASE_1000_USD.toFixed(4)) })
                          else setForm({ ...form, precioPorMillar: COSTO_BASE_1000_USD.toFixed(4) })
                          toast.success('Sincronizado con Motor')
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-emerald-100 text-emerald-600 p-1 rounded-md hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        ✨ Sincronizar
                      </button>
                    )}
                  </label>
                  <div className="relative group/input">
                    <input
                      required type="number" step="0.0001"
                      readOnly={!esAdmin}
                      value={editando ? editando.precioPorMillar : form.precioPorMillar}
                      onChange={e => editando ? setEditando({ ...editando, precioPorMillar: parseFloat(e.target.value) }) : setForm({ ...form, precioPorMillar: e.target.value })}
                      className={`w-full text-base font-black bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-4 py-3 outline-none ${!esAdmin ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-emerald-200'}`}
                    />
                    <div className="absolute top-full left-1 mt-1 text-[9px] font-bold text-emerald-500 uppercase tracking-tight">
                      {esAdmin ? `≈ $${((editando ? editando.precioPorMillar : parseFloat(form.precioPorMillar)) * fxDolar).toFixed(2)} ARS` : 'Protegido por políticas financieras'}
                    </div>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 cursor-help" title="El Ponchado (matriz DST) se cobra una ÚNICA VEZ por logo, independiente de cuántas prendas bordes.">Setup Ponchado USD</label>
                  <input
                    required type="number" step="0.01"
                    readOnly={!esAdmin}
                    value={editando ? editando.costoPonchado : form.costoPonchado}
                    onChange={e => editando ? setEditando({ ...editando, costoPonchado: parseFloat(e.target.value) }) : setForm({ ...form, costoPonchado: e.target.value })}
                    className={`w-full text-base font-black bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl px-4 py-3 outline-none ${!esAdmin ? 'opacity-60' : ''}`}
                  />
                </div>

                {/* VISUALIZACION DE BASE DE CALCULO */}
                <div className="col-span-3 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Trabajo Real (Pure Stitch Cost)</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-lg font-black text-indigo-700">USD {((parseInt(String(editando?.puntadas ?? form.puntadas)) / 1000) * (parseFloat(String(editando?.precioPorMillar ?? form.precioPorMillar)))).toFixed(4)}</span>
                       <span className="text-xs font-bold text-indigo-400">≈ {formatCurrency(((parseInt(String(editando?.puntadas ?? form.puntadas)) / 1000) * (parseFloat(String(editando?.precioPorMillar ?? form.precioPorMillar)))) * fxDolar)} ARS</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Aplicación de Mínimo</span>
                    <span className={`text-xs font-black uppercase ${((parseInt(String(editando?.puntadas ?? form.puntadas)) / 1000) * (parseFloat(String(editando?.precioPorMillar ?? form.precioPorMillar)))) < tarifaMinimaUSD ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {((parseInt(String(editando?.puntadas ?? form.puntadas)) / 1000) * (parseFloat(String(editando?.precioPorMillar ?? form.precioPorMillar)))) < tarifaMinimaUSD ? 'APLICA TARIFA PISO' : 'SUPERA MÍNIMO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* MATRIZ MULTICLIENTE LIVE */}
              {(() => {
                const cPuntadas = parseInt(String(editando?.puntadas ?? form.puntadas)) || 0
                const cTasa = parseFloat(String(editando?.precioPorMillar ?? form.precioPorMillar)) || 0
                const cPonchado = parseFloat(String(editando?.costoPonchado ?? form.costoPonchado)) || 0
                const costeBaseIndustrialUSD = simularCostoUSD(cPuntadas, cTasa)

                // El Costeo Industrial y los Impuestos de Venta vienen del SERVICIO (Columna B)
                const getServicePct = (k: string) => {
                  const val = (configObj as any)[`${k}_b`]
                  return val !== undefined && val !== null && val !== '' ? parseFloat(val) : 0
                }

                // NUEVA LÓGICA: Overheads sobre Costo Puro de Puntadas
                const pureStitchCostUSD = (cPuntadas / 1000) * cTasa
                const baseChargeUSD = Math.max(pureStitchCostUSD, tarifaMinimaUSD)

                const mo = pureStitchCostUSD * getServicePct('mo_pct')
                const logistica = pureStitchCostUSD * getServicePct('logistica_pct')
                const admin = pureStitchCostUSD * getServicePct('admin_pct')
                const gcomercial = pureStitchCostUSD * getServicePct('ventas_pct')
                const ley25413op = pureStitchCostUSD * getServicePct('ley_25413')
                const fijos = pureStitchCostUSD * getServicePct('fijos_pct')
                
                const totalIndustrialCostUSD = baseChargeUSD + mo + logistica + admin + gcomercial + ley25413op + fijos
                const totalIndustrialCostARS = totalIndustrialCostUSD * fxDolar

                // -- MOTOR COMERCIAL --
                const currentPriceARS = preciosSegmentos[segmentoSimulacion] ? parseFloat(preciosSegmentos[segmentoSimulacion]) : 0
                const ivaPct = getServicePct('iva')
                const iibbPct = getServicePct('iibb')
                const tarjetaPct = getServicePct('costo_tarjeta')
                const comisionPct = getServicePct('comision_pct')
                const leyChequePct = getServicePct('ley_cheque_vta')
                
                const taxSumPct = ivaPct + iibbPct + tarjetaPct + comisionPct + leyChequePct
                
                // El Margen Neto Objetivo viene exclusivamente del SEGMENTO (Motor Financiero)
                const targetMarginActual = parseFloat((configObj as any)[`target_margin_pct_${segmentoSimulacion}`] || '0.35') * 100
                const recommendedPriceARS = totalIndustrialCostARS / (1 - (taxSumPct + targetMarginActual/100))

                const priceToUseARS = currentPriceARS || recommendedPriceARS
                const ivaVal = priceToUseARS * ivaPct
                const iibbVal = priceToUseARS * iibbPct
                const comisionVal = priceToUseARS * comisionPct
                const tarjetaVal = priceToUseARS * tarjetaPct
                const leyChequeVal = priceToUseARS * leyChequePct
                
                const totalTaxesARS = ivaVal + iibbVal + comisionVal + tarjetaVal + leyChequeVal
                
                const netProfitARS = priceToUseARS - totalIndustrialCostARS - totalTaxesARS
                const netMarginPct = priceToUseARS > 0 ? (netProfitARS / priceToUseARS) * 100 : 0

                return (
                  <div className="space-y-8">
                    {/* SEGMENT TABS */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                      {[
                        { id: 'final', label: 'Final', color: 'bg-emerald-500' },
                        { id: 'revendedor', label: 'Revendedor', color: 'bg-amber-500' },
                        { id: 'empresa', label: 'Empresa', color: 'bg-blue-500' },
                        { id: 'revendido', label: 'Revendido', color: 'bg-purple-500' }
                      ].map(s => (
                        <button key={s.id} type="button" onClick={() => setSegmentoSimulacion(s.id as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${segmentoSimulacion === s.id ? `${s.color} text-white shadow-lg` : 'text-gray-400 hover:text-gray-900'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-[0.2em] flex justify-between items-center">
                            <span>Desglose Industrial (ARS)</span>
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px]">Cotización: 1 USD = {fxDolar} ARS</span>
                          </div>
                          <div className="space-y-3">
                             <div className="flex justify-between items-center group bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 mb-4">
                                <span className="text-[10px] font-black text-indigo-500 uppercase">Productividad Puntadas</span>
                                <span className="text-sm font-black text-indigo-700">{formatCurrency(pureStitchCostUSD * fxDolar)}</span>
                             </div>

                             {((tarifaMinimaUSD - pureStitchCostUSD) > 0) && (
                               <div className="flex justify-between items-center group bg-amber-50 p-2 rounded-lg border border-amber-100/50 mb-4">
                                  <span className="text-[10px] font-black text-amber-500 uppercase">Ajuste Tarifa Piso</span>
                                  <span className="text-sm font-black text-amber-700">{formatCurrency((tarifaMinimaUSD - pureStitchCostUSD) * fxDolar)}</span>
                               </div>
                             )}

                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Taller / MO</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(mo * fxDolar)}</span>
                             </div>
                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Logística / Flete</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(logistica * fxDolar)}</span>
                             </div>
                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Administración</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(admin * fxDolar)}</span>
                             </div>
                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Comercial / Ventas</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(gcomercial * fxDolar)}</span>
                             </div>
                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Imp. Ley 25413 (Op)</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(ley25413op * fxDolar)}</span>
                             </div>
                             <div className="flex justify-between items-center group">
                                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">Costos Fijos</span>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(fijos * fxDolar)}</span>
                             </div>
                             <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-600 uppercase italic">Gasto Industrial Total</span>
                                <div className="text-right">
                                  <div className="text-lg font-black text-indigo-600 leading-none">{formatCurrency(totalIndustrialCostARS)}</div>
                                  <div className="text-[10px] font-bold text-gray-300 mt-1">USD {totalIndustrialCostUSD.toFixed(2)}</div>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white rounded-3xl p-8 border border-red-50 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                          <div className="text-[10px] font-black text-red-400 uppercase mb-6 tracking-[0.2em]">Carga Comercial e Impuestos</div>
                          <div className="space-y-3">
                              <div className="flex justify-between items-center group">
                                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider text-red-400">IVA (Débito)</span>
                                 <span className="text-sm font-black text-red-600">{formatCurrency(ivaVal)}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider text-red-400">IIBB (Ing. Brutos)</span>
                                 <span className="text-sm font-black text-red-600">{formatCurrency(iibbVal)}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider text-red-400">Comisión Venta</span>
                                 <span className="text-sm font-black text-red-600">{formatCurrency(comisionVal)}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider text-red-400">Tarjetas / Seg. Fin</span>
                                 <span className="text-sm font-black text-red-600">{formatCurrency(tarjetaVal)}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider text-red-400">Ley Cheque (Venta)</span>
                                 <span className="text-sm font-black text-red-600">{formatCurrency(leyChequeVal)}</span>
                              </div>
                              <div className="pt-4 border-t border-dashed border-red-50 flex justify-between items-center text-red-600">
                                 <span className="text-xs font-bold uppercase italic font-black">Total Deducciones</span>
                                 <span className="text-lg font-black">{formatCurrency(totalTaxesARS)}</span>
                              </div>
                           </div>
                       </div>
                    </div>

                    <div className="bg-gray-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <span className="text-9xl font-black italic">⚡</span>
                      </div>

                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-emerald-400 mb-2 tracking-widest italic">Sugerido (Margen {targetMarginActual.toFixed(0)}%)</label>
                          <div className="text-4xl font-black italic text-emerald-400">{formatCurrency(recommendedPriceARS)}</div>
                          {cPonchado > 0 && <div className="text-[9px] text-gray-500 mt-1">+ USD {cPonchado} Matriz Única</div>}
                        </div>
                        
                        <div>
                           <label className="block text-[10px] uppercase font-black text-gray-400 mb-2">Fijar Precio ({segmentoSimulacion})</label>
                           <input 
                            type="number"
                            value={preciosSegmentos[segmentoSimulacion]}
                            onChange={e => setPreciosSegmentos(prev => ({...prev, [segmentoSimulacion]: e.target.value}))}
                            placeholder="Fijar Pesos..."
                            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-xl font-black outline-none focus:border-indigo-500 transition-all font-mono text-white"
                           />
                           <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase">
                              <span className="text-gray-500 italic">Margen Neto Real:</span>
                              <span className={`px-3 py-1 rounded-full ${netMarginPct >= targetMarginActual ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {netMarginPct.toFixed(1)}%
                              </span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-5 pt-4">
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase font-black text-gray-400 ml-1">Render del Bordado</label>
                  <div onClick={() => !((editando ? editando.fotoUrl : form.fotoUrl)) && document.getElementById('file-bordado-foto')?.click()} className="aspect-video bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center relative transition-all hover:bg-white cursor-pointer overflow-hidden group">
                    {subiendo === 'fotoUrl' ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> :
                      (editando ? editando.fotoUrl : form.fotoUrl) ? (
                        <div className="w-full h-full relative">
                          <img src={editando ? editando.fotoUrl! : form.fotoUrl} className="w-full h-full object-cover" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); editando ? setEditando({ ...editando, fotoUrl: null }) : setForm({ ...form, fotoUrl: '' }) }} className="absolute top-2 right-2 bg-red-500/90 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs hover:scale-110 shadow-lg">✕</button>
                        </div>
                      ) : <span className="text-2xl grayscale opacity-40 group-hover:scale-110 transition-transform">📷</span>
                    }
                    <input id="file-bordado-foto" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubir(e.target.files[0], 'fotoUrl')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase font-black text-gray-400 ml-1">Archivo de Máquina DST</label>
                  <div onClick={() => !((editando ? editando.archivoMatrizUrl : form.archivoMatrizUrl)) && document.getElementById('file-bordado-matriz')?.click()} className="aspect-video bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center relative transition-all hover:bg-white cursor-pointer overflow-hidden group">
                    {subiendo === 'archivoMatrizUrl' ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> :
                      (editando ? editando.archivoMatrizUrl : form.archivoMatrizUrl) ? (
                        <div className="text-center p-4">
                          <div className="text-2xl mb-1">📂</div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); editando ? setEditando({ ...editando, archivoMatrizUrl: null }) : setForm({ ...form, archivoMatrizUrl: '' }) }} className="text-[9px] text-red-500 font-bold uppercase py-1 px-3 bg-red-50 rounded-full hover:bg-red-100 transition-colors">Remover</button>
                        </div>
                      ) : <span className="text-2xl grayscale opacity-40 group-hover:scale-110 transition-transform">⚙️</span>
                    }
                    <input id="file-bordado-matriz" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubir(e.target.files[0], 'archivoMatrizUrl')} />
                  </div>
                </div>
              </div>
            </form>

            <div className="p-8 border-t border-gray-100 bg-white">
              <button type="submit" onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))} disabled={mutacion.isPending} className="w-full bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50">
                {mutacion.isPending ? 'Procesando...' : editando ? 'Actualizar Ficha de Costos' : 'Crear Diseño y Simulación Muestra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
