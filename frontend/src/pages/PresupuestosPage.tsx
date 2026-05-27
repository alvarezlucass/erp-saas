import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presupuestosApi, institucionesApi, productosApi, clientesApi, produccionApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { ClipboardList, Plus, Settings, DollarSign, Trash2, Clock, Info, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

const ESTADO_COLOR: Record<string, string> = {
  VIGENTE: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  PEDIDO: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  CERRADO: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  CANCELADO: 'bg-red-500/10 text-red-400 border border-red-500/20'
}
const MODOS_PAGO = ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA']

interface Linea { 
  tipoItem: 'PRODUCTO' | 'SERVICIO_BORDADO'
  productoId?: string
  productoNombre: string
  talle: string
  bordado?: string
  cantidad: number
  precioUnitario: number
  precioBordado: number
  precioEstampado: number 
}

function NuevoPresupuesto({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: instituciones = [] } = useQuery({ queryKey: ['instituciones'], queryFn: () => institucionesApi.listar() })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.listar() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesApi.listar() })
  
  const [clienteId, setClienteId] = useState('')
  const [institucionId, setInstitucionId] = useState('')
  
  const clienteSel = clientes.find((i: any) => i.id === clienteId)
  
  const [modoPago, setModoPago] = useState('TRANSFERENCIA')
  const [senia, setSenia] = useState('')
  const [notas, setNotas] = useState('')
  const [aplicaIva, setAplicaIva] = useState(false)
  const [tipoVencimiento, setTipoVencimiento] = useState<'HABILES' | 'CORRIDOS'>('CORRIDOS')
  const [diasVigencia, setDiasVigencia] = useState(15)
  const [canal, setCanal] = useState<'OFFICIAL' | 'GESTION'>('GESTION')
  const [leadTimeMax, setLeadTimeMax] = useState(0)

  // Nuevo Cliente Rapido
  const [showNuevoCli, setShowNuevoCli] = useState(false)
  const [newCli, setNewCli] = useState({ 
    nombre: '', 
    apellido: '', 
    telefono: '', 
    email: '', 
    direccion: '', 
    razonSocial: '', 
    cuit: '', 
    condicionIva: 'CONSUMIDOR_FINAL', 
    tipoFactura: 'B' 
  })

  const crearClienteMut = useMutation({
    mutationFn: clientesApi.crear,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setClienteId(data.id)
      setShowNuevoCli(false)
      toast.success('Cliente creado y seleccionado con éxito.')
    }
  })

  // Autofill IVA cuando selecciona
  useEffect(() => {
    if (clienteSel) {
      setAplicaIva(clienteSel.tipoFactura === 'A')
    } else {
      setAplicaIva(false)
    }
  }, [clienteSel])

  // Cargar líneas iniciales desde localStorage o por defecto
  const [lineas, setLineas] = useState<Linea[]>(() => {
    const draftStr = localStorage.getItem('unifai-draft-budget')
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr)
        if (draft.lineas && draft.lineas.length > 0) {
          return draft.lineas
        }
      } catch (e) {
        console.error("Error al leer borrador de presupuesto", e)
      }
    }
    return [{ tipoItem: 'PRODUCTO', productoNombre: '', talle: '', bordado: '', cantidad: 1, precioUnitario: 0, precioBordado: 0, precioEstampado: 0 }]
  })

  useEffect(() => {
    // Calcular el lead time máximo de todos los productos en las líneas
    let maxLT = 0
    lineas.forEach(l => {
      if (l.tipoItem === 'PRODUCTO' && l.productoNombre) {
        const prod = productos.find((p: any) => p.nombre === l.productoNombre)
        if (prod && prod.insumos) {
          prod.insumos.forEach((pInsumo: any) => {
             const lt = pInsumo.insumo.proveedores?.[0]?.leadTimeDays || 0
             if (lt > maxLT) maxLT = lt
          })
        }
      }
    })
    setLeadTimeMax(maxLT)
  }, [lineas, productos])

  const fechaSugerida = new Date()
  fechaSugerida.setDate(fechaSugerida.getDate() + leadTimeMax + 3) // +3 días de buffer de producción
  
  const lastRowRef = useRef<HTMLTableRowElement>(null)

  const addLinea = () => {
    setLineas(l => [...l, { tipoItem: 'PRODUCTO', productoNombre: '', talle: '', bordado: '', cantidad: 1, precioUnitario: 0, precioBordado: 0, precioEstampado: 0 }])
    setTimeout(() => {
      if (lastRowRef.current) {
        const input = lastRowRef.current.querySelector('input')
        if (input) input.focus()
      }
    }, 50)
  }
  
  const removeLinea = (i: number) => setLineas(l => l.filter((_, idx) => idx !== i))
  
  const updateLinea = (i: number, field: string, value: any) => setLineas(l => l.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if ((e.key === 'ArrowDown' || e.key === 'Enter') && index === lineas.length - 1) {
      e.preventDefault()
      addLinea()
    }
  }

  const subtotal = lineas.reduce((acc, l) => (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad + acc, 0)
  const iva = aplicaIva ? subtotal * 0.21 : 0
  const total = subtotal + iva

  const mutation = useMutation({
    mutationFn: () => presupuestosApi.crear({
      clienteId: clienteId || undefined,
      institucionId: institucionId || undefined,
      modoPago, senia: parseFloat(senia) || 0, notas: notas || undefined,
      aplicaIva, tipoVencimiento, diasVigencia,
      canal,
      lineas: lineas.filter(l => l.productoNombre && l.precioUnitario >= 0).map(l => ({
        tipoItem: l.tipoItem,
        productoNombre: l.productoNombre, talle: l.talle || undefined, bordado: l.bordado || undefined,
        cantidad: l.cantidad, precioUnitario: l.precioUnitario, precioBordado: l.precioBordado, precioEstampado: l.precioEstampado
      }))
    }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      localStorage.removeItem('unifai-draft-budget')
      toast.success('Presupuesto emitido y borrador limpiado con éxito.')
      onClose()
    }
  })

  // Catálogo Exclusivo
  const prodFiltrados = productos.filter((p: any) => !institucionId || p.institucionId === institucionId || !p.institucionId)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1b1e] border border-white/5 w-full max-w-6xl shadow-2xl rounded-[2.5rem] max-h-[92vh] flex flex-col overflow-hidden text-left animate-in zoom-in duration-200">
         {/* CABECERA */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/20">
           <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/10">
                <ClipboardList className="text-white" size={20} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">Nuevo Presupuesto Híbrido</h2>
                 <p className="text-xs text-gray-400 font-medium mt-0.5">Crea presupuestos agregando prendas de producción o servicios</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <select 
                value={institucionId} 
                onChange={e => setInstitucionId(e.target.value)} 
                className="text-sm bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-gray-300 font-semibold hover:border-white/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                 <option value="" className="bg-[#1a1b1e]">+ Catálogo Muestra (Opcional)</option>
                 {instituciones.map((i: any) => <option key={i.id} value={i.id} className="bg-[#1a1b1e]">{i.nombre}</option>)}
              </select>
              <button onClick={onClose} className="bg-white/5 text-gray-400 hover:text-white w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:bg-red-500/20">✕</button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* CLIENTE Y CONFIGURACIÓN GENERAL */}
          <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-semibold text-indigo-400">Cliente (Facturación)</label>
              <div className="flex gap-3">
                {!showNuevoCli ? (
                  <>
                    <select 
                      value={clienteId} 
                      onChange={e => setClienteId(e.target.value)} 
                      className="w-full text-sm font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#1a1b1e]">Seleccione o cree un cliente...</option>
                      {clientes.filter((c: any) => c.activo).map((c: any) => (
                        <option key={c.id} value={c.id} className="bg-[#1a1b1e]">
                          {c.nombre} {c.apellido || ''} - {c.condicionIva.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setShowNuevoCli(true)} 
                      className="px-5 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-sm font-bold rounded-xl whitespace-nowrap shrink-0 border border-indigo-500/20 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
                    >
                      <UserPlus size={14} />
                      Crear
                    </button>
                  </>
                ) : (
                  <div className="w-full space-y-4 border border-indigo-500/20 p-5 rounded-2xl bg-[#1e2025] shadow-xl animate-in fade-in duration-200 text-left">
                    <div className="flex gap-4">
                      <select 
                        value={newCli.condicionIva} 
                        onChange={e => {
                          const cond = e.target.value
                          const fact = cond === 'RESPONSABLE_INSCRIPTO' ? 'A' : 'B'
                          setNewCli({ ...newCli, condicionIva: cond, tipoFactura: fact })
                        }} 
                        className="w-1/2 text-sm font-semibold bg-black/40 border border-white/10 text-white px-3 py-2.5 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="CONSUMIDOR_FINAL" className="bg-[#1a1b1e]">Consumidor Final</option>
                        <option value="RESPONSABLE_INSCRIPTO" className="bg-[#1a1b1e]">Responsable Inscripto</option>
                        <option value="MONOTRIBUTO" className="bg-[#1a1b1e]">Monotributo</option>
                        <option value="EXENTO" className="bg-[#1a1b1e]">Exento</option>
                      </select>
                      <select disabled value={newCli.tipoFactura} className="w-1/2 text-sm bg-black/20 text-gray-400 border border-white/5 px-3 py-2.5 rounded-xl outline-none">
                        <option value="B">Factura B</option>
                        <option value="A">Factura A</option>
                        <option value="C">Factura C</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-4">
                       <input autoFocus placeholder="Nombre" value={newCli.nombre} onChange={e => setNewCli({ ...newCli, nombre: e.target.value })} className="w-1/2 text-sm bg-transparent border-b border-white/10 px-2 py-2 outline-none font-semibold text-white focus:border-indigo-500 placeholder:text-gray-600" />
                       <input placeholder="Apellido" value={newCli.apellido} onChange={e => setNewCli({ ...newCli, apellido: e.target.value })} className="w-1/2 text-sm bg-transparent border-b border-white/10 px-2 py-2 outline-none font-semibold text-white focus:border-indigo-500 placeholder:text-gray-600" />
                    </div>

                    <div className="flex gap-4">
                       <input 
                         placeholder={newCli.condicionIva === 'RESPONSABLE_INSCRIPTO' || newCli.condicionIva === 'EXENTO' ? "Razón Social (*)" : "Razón Social"} 
                         value={newCli.razonSocial} 
                         onChange={e => setNewCli({ ...newCli, razonSocial: e.target.value })} 
                         className="w-2/3 text-sm bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 placeholder:text-gray-600 font-semibold" 
                       />
                       <input 
                         placeholder={newCli.condicionIva === 'RESPONSABLE_INSCRIPTO' || newCli.condicionIva === 'EXENTO' ? "CUIT (*)" : "CUIT"} 
                         value={newCli.cuit} 
                         onChange={e => setNewCli({ ...newCli, cuit: e.target.value })} 
                         className="w-1/3 text-sm bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 placeholder:text-gray-600 font-semibold" 
                       />
                    </div>

                    <div className="flex gap-4">
                       <input placeholder="Teléfono" value={newCli.telefono} onChange={e => setNewCli({ ...newCli, telefono: e.target.value })} className="w-1/3 text-sm bg-transparent border-b border-white/10 px-2 py-1 outline-none text-gray-300 focus:border-indigo-500 placeholder:text-gray-600" />
                       <input type="email" placeholder="Email" value={newCli.email} onChange={e => setNewCli({ ...newCli, email: e.target.value })} className="w-2/3 text-sm bg-transparent border-b border-white/10 px-2 py-1 outline-none text-gray-300 focus:border-indigo-500 placeholder:text-gray-600" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setShowNuevoCli(false)} className="text-sm text-gray-500 hover:text-gray-300 font-semibold px-3">Cancelar</button>
                      <button 
                        onClick={() => crearClienteMut.mutate(newCli)} 
                        disabled={!newCli.nombre || ((newCli.condicionIva === 'RESPONSABLE_INSCRIPTO' || newCli.condicionIva === 'EXENTO') && (!newCli.razonSocial || !newCli.cuit))} 
                        className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow disabled:opacity-50 transition-all uppercase tracking-wider"
                      >
                        Guardar Cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-64 space-y-2">
              <label className="block text-sm font-semibold text-gray-400">Vigencia (Días)</label>
              <div className="flex items-center gap-0">
                <input 
                  type="number" min="1" 
                  value={diasVigencia} 
                  onChange={e => setDiasVigencia(parseInt(e.target.value) || 1)} 
                  className="w-20 bg-black/40 text-center text-sm font-semibold border border-white/10 rounded-l-xl px-3 py-3 outline-none focus:border-indigo-500 text-white" 
                />
                <select 
                  value={tipoVencimiento} 
                  onChange={e => setTipoVencimiento(e.target.value as any)} 
                  className="w-full text-sm font-semibold border border-white/10 border-l-0 rounded-r-xl px-3 py-3 bg-black/40 text-gray-300 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="CORRIDOS" className="bg-[#1a1b1e]">Corridos</option>
                  <option value="HABILES" className="bg-[#1a1b1e]">Hábiles (Lun-Vie)</option>
                </select>
              </div>
            </div>
            
            <div className="w-full lg:w-48 space-y-2">
              <label className="block text-sm font-semibold text-gray-400">Canal Operativo</label>
              <select 
                value={canal} 
                onChange={e => setCanal(e.target.value as any)} 
                className="w-full text-sm font-semibold border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 rounded-xl px-3 py-3 outline-none focus:border-indigo-500 hover:border-indigo-500/40 transition-all cursor-pointer"
              >
                 <option value="GESTION" className="bg-[#1a1b1e]">GESTIÓN (Interno)</option>
                 <option value="OFFICIAL" className="bg-[#1a1b1e]">OFICIAL (Facturado)</option>
              </select>
            </div>
            
            <div className="w-full lg:w-36 space-y-2">
              <label className="block text-sm font-semibold text-gray-400">Impositivo</label>
              <label className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-black/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={aplicaIva} 
                  onChange={e => setAplicaIva(e.target.checked)} 
                  className="w-4 h-4 text-indigo-600 bg-black border-white/20 focus:ring-indigo-500 focus:ring-offset-0 rounded cursor-pointer" 
                />
                <span className="text-sm font-semibold text-gray-300">IVA (21%)</span>
              </label>
            </div>
          </div>

          {/* GRILLA DE ITEMS (EXCEL-STYLE) */}
          <div className="border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl bg-black/20">
            <table className="w-full text-left">
              <thead className="bg-black/30 border-b border-white/5">
                <tr className="text-sm font-semibold text-gray-400">
                  <th className="px-4 py-3.5 w-36 font-semibold">Tipo</th>
                  <th className="px-4 py-3.5 font-semibold">Item / Concepto</th>
                  <th className="px-4 py-3.5 w-28 font-semibold">Talle</th>
                  <th className="px-4 py-3.5 w-48 font-semibold">Logo/Bordado</th>
                  <th className="px-4 py-3.5 w-24 text-right font-semibold">Cant.</th>
                  <th className="px-4 py-3.5 w-32 text-right font-semibold">P. Unit. $</th>
                  <th className="px-4 py-3.5 w-32 text-right font-semibold">Bordado $</th>
                  <th className="px-4 py-3.5 w-36 text-right font-semibold">Subtotal</th>
                  <th className="px-3 py-3.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {lineas.map((l, i) => {
                  const sub = (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad
                  const isLast = i === lineas.length - 1
                  return (
                    <tr key={i} ref={isLast ? lastRowRef : null} className="group hover:bg-white/[0.01] transition-all">
                      <td className="px-3 py-3.5">
                        <select 
                          value={l.tipoItem} 
                          onChange={e => {
                            updateLinea(i, 'tipoItem', e.target.value)
                            if (e.target.value === 'SERVICIO_BORDADO') updateLinea(i, 'talle', '')
                          }} 
                          className="w-full text-sm font-semibold text-gray-200 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-indigo-500"
                        >
                          <option value="PRODUCTO" className="bg-[#1a1b1e] text-white">Prenda</option>
                          <option value="SERVICIO_BORDADO" className="bg-[#1a1b1e] text-white">Servicio</option>
                        </select>
                      </td>
                      <td className="px-3 py-3.5">
                        {l.tipoItem === 'PRODUCTO' ? (
                          <input 
                            list={`prod-list`} 
                            value={l.productoNombre} 
                            onChange={e => updateLinea(i, 'productoNombre', e.target.value)} 
                            onKeyDown={(e)=>handleKeyDown(e, i)} 
                            placeholder="Buscar o escribir prenda..." 
                            className="w-full text-sm font-semibold px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                          />
                        ) : (
                          <input 
                            value={l.productoNombre} 
                            onChange={e => updateLinea(i, 'productoNombre', e.target.value)} 
                            onKeyDown={(e)=>handleKeyDown(e, i)} 
                            placeholder="Ej: Bordado toallas Hotel" 
                            className="w-full text-sm font-semibold px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-teal-400 outline-none focus:border-indigo-500 placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                          />
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <input 
                          disabled={l.tipoItem === 'SERVICIO_BORDADO'} 
                          value={l.talle} 
                          onChange={e => updateLinea(i, 'talle', e.target.value)} 
                          onKeyDown={(e)=>handleKeyDown(e, i)} 
                          placeholder="M" 
                          className="w-full text-sm font-semibold text-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 disabled:opacity-20 text-white placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <input 
                          value={l.bordado || ''} 
                          onChange={e => updateLinea(i, 'bordado', e.target.value)} 
                          onKeyDown={(e)=>handleKeyDown(e, i)} 
                          placeholder="Opcional..." 
                          className="w-full text-sm font-semibold bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-white placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <input 
                          type="number" min="1" 
                          value={l.cantidad} 
                          onChange={e => updateLinea(i, 'cantidad', parseInt(e.target.value) || 1)} 
                          onKeyDown={(e)=>handleKeyDown(e, i)} 
                          className="w-full text-sm font-semibold text-right bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-white focus:bg-black/60 transition-all" 
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <input 
                          type="number" 
                          value={l.precioUnitario || ''} 
                          onChange={e => updateLinea(i, 'precioUnitario', parseFloat(e.target.value) || 0)} 
                          onKeyDown={(e)=>handleKeyDown(e, i)} 
                          placeholder="0" 
                          className="w-full text-sm font-semibold text-right bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-white placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <input 
                          type="number" 
                          value={l.precioBordado || ''} 
                          onChange={e => updateLinea(i, 'precioBordado', parseFloat(e.target.value) || 0)} 
                          onKeyDown={(e)=>handleKeyDown(e, i)} 
                          placeholder="0" 
                          className="w-full text-sm font-semibold text-right bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-white placeholder:text-gray-600 focus:bg-black/60 transition-all" 
                        />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-right text-gray-200 bg-white/[0.01]">
                        {sub > 0 ? formatCurrency(sub) : '—'}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button onClick={() => removeLinea(i)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 p-1.5 rounded-lg">✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <datalist id="prod-list">
              {prodFiltrados.map((p: any) => <option key={p.id} value={p.nombre} />)}
            </datalist>

            <div className="flex divide-x divide-white/5 bg-black/40 border-t border-white/5">
              <button 
                onClick={addLinea} 
                className="flex-1 py-4 hover:bg-white/5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                ↓ Presiona Enter en la última fila o Haz click aquí para añadir línea
              </button>
              {lineas.length > 0 && lineas.some(l => l.productoNombre) && (
                <button 
                  onClick={() => {
                    if (confirm('¿Vaciar todos los items del borrador del presupuesto actual?')) {
                      setLineas([{ tipoItem: 'PRODUCTO', productoNombre: '', talle: '', bordado: '', cantidad: 1, precioUnitario: 0, precioBordado: 0, precioEstampado: 0 }]);
                      localStorage.removeItem('unifai-draft-budget');
                      toast.info('Borrador vaciado.');
                    }
                  }}
                  className="px-6 py-4 hover:bg-red-500/10 text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Vaciar borrador
                </button>
              )}
            </div>
          </div>

          {/* TOTALES Y PLANIFICACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Modo de pago</label>
                <select 
                  value={modoPago} 
                  onChange={e => setModoPago(e.target.value)} 
                  className="w-full text-sm font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {MODOS_PAGO.map(m => <option key={m} value={m} className="bg-[#1a1b1e]">{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              
              <div className="bg-indigo-600/20 border border-indigo-500/20 rounded-[2rem] p-6 text-white relative overflow-hidden group shadow-lg">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Clock className="text-white" size={48} />
                 </div>
                 <h3 className="text-sm font-bold text-indigo-300 mb-2">Sugerencia Logística Industrial</h3>
                 <div className="flex items-end justify-between">
                    <div>
                       <div className="text-sm font-medium text-white/80">Entrega Estimada</div>
                       <div className="text-2xl font-bold text-white mt-1">{fechaSugerida.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-semibold text-indigo-300">Wait Time + Buffer</div>
                       <div className="text-base font-bold text-indigo-200 mt-1">{leadTimeMax + 3} días</div>
                    </div>
                 </div>
                 {leadTimeMax > 0 && (
                   <div className="mt-4 pt-4 border-t border-indigo-500/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      <span className="text-xs font-semibold text-emerald-400">Basado en Cuello de Botella de Insumos</span>
                   </div>
                 )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Notas internas</label>
                <textarea 
                  value={notas} 
                  onChange={e => setNotas(e.target.value)} 
                  rows={2} 
                  placeholder="Condiciones especiales..." 
                  className="w-full text-sm font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 placeholder:text-gray-600" 
                />
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-[2rem] p-6 text-white space-y-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-400 text-sm font-semibold">
                  <span>Total Gravado</span>
                  <span className="font-mono text-base text-gray-200">{formatCurrency(subtotal)}</span>
                </div>
                {aplicaIva && (
                  <div className="flex justify-between text-indigo-400 text-sm font-semibold">
                    <span>IVA (21%)</span>
                    <span className="font-mono text-base text-indigo-300">+ {formatCurrency(iva)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-400 text-sm font-semibold pt-3 border-t border-white/5">
                  <span>Descontar Seña Manual:</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={senia} 
                      onChange={e => setSenia(e.target.value)} 
                      className="w-28 bg-black/50 border border-white/10 outline-none text-right rounded-xl pl-6 pr-3 py-2 text-sm font-mono font-semibold text-white focus:border-indigo-500" 
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-white/5">
                <span className="text-sm font-bold text-gray-400">Total Neto</span>
                <span className="text-4xl font-bold text-emerald-400 tracking-tight">{formatCurrency(total - (parseFloat(senia) || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PIE DE DIÁLOGO */}
        <div className="border-t border-white/5 px-8 py-5 flex items-center justify-end bg-black/20 rounded-b-[2.5rem] gap-3">
          <button onClick={onClose} className="text-sm px-6 py-3 font-semibold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button 
            onClick={() => mutation.mutate()} 
            disabled={lineas.every(l => !l.productoNombre) || mutation.isPending} 
            className="text-sm px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {mutation.isPending ? 'Emitiendo...' : 'Emitir Presupuesto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PresupuestosPage() {
  const qc = useQueryClient()
  const [nuevo, setNuevo] = useState(false)
  const [draftBudget, setDraftBudget] = useState<any | null>(null)

  const { data: presupuestos = [], isLoading } = useQuery({
    queryKey: ['presupuestos'], 
    queryFn: presupuestosApi.listar
  })

  // Escuchar parámetros de búsqueda para auto-abrir modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('open') === 'true') {
      setNuevo(true)
    }
  }, [])

  // Cargar borrador de localStorage
  useEffect(() => {
    const draftStr = localStorage.getItem('unifai-draft-budget')
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr)
        if (draft.lineas && draft.lineas.length > 0) {
          setDraftBudget(draft)
        } else {
          setDraftBudget(null)
        }
      } catch (e) {
        console.error(e)
      }
    } else {
      setDraftBudget(null)
    }
  }, [nuevo])

  const mutAprobar = useMutation({
    mutationFn: produccionApi.aprobarPresupuesto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      toast.success('¡Presupuesto aprobado! El pedido se inició y el stock técnico fue descontado.')
    }
  })

  const totalUnidades = presupuestos.reduce((acc: number, p: any) => acc + (p.lineas?.reduce((s: number, l: any) => s + l.cantidad, 0) ?? 0), 0)
  const totalFacturado = presupuestos.filter((p: any) => p.estado !== 'CANCELADO').reduce((acc: number, p: any) => acc + Number(p.total), 0)

  const handleClose = () => {
    setNuevo(false)
    const params = new URLSearchParams(window.location.search)
    if (params.get('open') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  return (
    <div className="w-full px-4 md:px-12 py-6 space-y-6">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
               <ClipboardList className="text-white" size={24} />
             </div>
             Presupuestos Industriales
          </h1>
          <p className="text-gray-400 font-semibold text-sm mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Gestión Comercial • {presupuestos.length} Documentos Sincronizados
          </p>
        </div>
        <button 
          onClick={() => setNuevo(true)} 
          className="px-5 py-3 text-sm font-semibold bg-indigo-600 border border-indigo-500 text-white rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95"
        >
          <Plus size={14} />
          Nuevo presupuesto
        </button>
      </header>

      {/* BANNER DE BORRADOR ACTIVO */}
      {draftBudget && draftBudget.lineas && draftBudget.lineas.length > 0 && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <h3 className="text-sm font-bold text-indigo-400">Presupuesto Abierto en Borrador</h3>
            </div>
            <p className="text-xs text-gray-300 font-medium">
              Tienes un borrador activo con <strong className="text-indigo-300">{draftBudget.lineas.length}</strong> artículos. Puedes continuar cotizándolo o vaciarlo para empezar de cero.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {draftBudget.lineas.map((l: any, idx: number) => (
                <span key={idx} className="text-xs font-semibold bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg text-gray-400">
                  {l.productoNombre} ({l.talle}) x{l.cantidad}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 shrink-0 w-full md:w-auto">
            <button 
              onClick={() => {
                if (confirm('¿Vaciar todos los artículos del borrador abierto?')) {
                  localStorage.removeItem('unifai-draft-budget')
                  setDraftBudget(null)
                  toast.info('Borrador descartado.')
                }
              }}
              className="flex-1 md:flex-none px-5 py-3 text-xs font-semibold bg-transparent border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 rounded-xl transition-all active:scale-95"
            >
              Descartar
            </button>
            <button 
              onClick={() => setNuevo(true)}
              className="flex-1 md:flex-none px-6 py-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              Continuar Cotización →
            </button>
          </div>
        </div>
      )}

      {/* METRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Presupuestos activos', val: presupuestos.filter((p: any) => p.estado === 'VIGENTE').length, sub: 'vigentes', icon: ClipboardList, color: 'text-indigo-400' },
          { label: 'Unidades totales', val: totalUnidades.toLocaleString('es-AR'), sub: 'en todos los presupuestos', icon: Settings, color: 'text-blue-400' },
          { label: 'Total facturado', val: formatCurrency(totalFacturado), sub: 'excluyendo cancelados', icon: DollarSign, color: 'text-emerald-400' },
        ].map(m => (
          <div key={m.label} className="bg-[#1a1b1e]/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-6 flex items-center justify-between shadow-2xl relative overflow-hidden group">
            <div className="space-y-1.5 text-left">
              <div className="text-sm font-semibold text-gray-400">{m.label}</div>
              <div className="text-3xl font-bold text-white tracking-tighter">{m.val}</div>
              <div className="text-xs text-gray-500 font-medium">{m.sub}</div>
            </div>
            <div className={`p-4 bg-white/5 rounded-2xl ${m.color}`}>
              <m.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="overflow-x-auto bg-[#1a1b1e]/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] shadow-2xl relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-400 animate-pulse">Cargando presupuestos…</p>
          </div>
        ) : presupuestos.length === 0 ? (
          <div className="bg-[#1a1b1e]/40 rounded-[3rem] p-20 text-center border border-dashed border-white/5 shadow-2xl">
             <ClipboardList className="mx-auto text-gray-600 mb-6" size={64} />
             <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Todavía no hay presupuestos</h3>
             <p className="text-sm font-medium text-gray-500 mb-6">Inicia tu primera cotización o carga uno nuevo</p>
             <button onClick={() => setNuevo(true)} className="px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-md">Crear el primero →</button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/20">
              <tr>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400">N°</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400">Cliente</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400">Fecha</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right">Unidades</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right">Total</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400">Modo pago</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400">Estado</th>
                <th className="px-8 py-5 text-sm font-semibold text-gray-400 text-right w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {presupuestos.map((p: any) => {
                const unidades = p.lineas?.reduce((s: number, l: any) => s + l.cantidad, 0) ?? 0
                const cliente = p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido || ''}` : p.institucion?.nombre ?? p.clienteNombre ?? '—'
                return (
                  <tr key={p.id} className="group hover:bg-white/[0.01] transition-all border-b border-white/[0.02]">
                    <td className="px-8 py-5 text-sm font-mono font-bold text-gray-300">#{p.numero}</td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-100">{cliente}</td>
                    <td className="px-8 py-5 text-xs font-semibold text-gray-500">{new Date(p.creadoEn).toLocaleDateString('es-AR')}</td>
                    <td className="px-8 py-5 text-sm text-gray-300 text-right font-medium">{unidades}</td>
                    <td className="px-8 py-5 text-sm font-bold text-emerald-400 text-right">{formatCurrency(Number(p.total))}</td>
                    <td className="px-8 py-5 text-sm text-gray-400 font-medium">{p.modoPago.charAt(0) + p.modoPago.slice(1).toLowerCase()}</td>
                    <td className="px-8 py-5">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${ESTADO_COLOR[p.estado] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'} shadow-sm`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {p.estado === 'VIGENTE' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation()
                            if (confirm('¿Iniciar la producción y descontar stock?')) {
                              mutAprobar.mutate(p.id) 
                            }
                          }} 
                          className="text-xs font-semibold bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-500 transition-all shadow-md active:scale-95"
                        >
                          Aprobar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {nuevo && <NuevoPresupuesto onClose={handleClose} />}
    </div>
  )
}
