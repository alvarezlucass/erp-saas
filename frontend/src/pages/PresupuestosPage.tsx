import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presupuestosApi, institucionesApi, productosApi, clientesApi, produccionApi } from '../lib/api'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const ESTADO_COLOR: Record<string,string> = {
  VIGENTE:'bg-blue-50 text-blue-700', PEDIDO:'bg-teal-50 text-teal-700',
  CERRADO:'bg-gray-50 text-gray-500', CANCELADO:'bg-red-50 text-red-600'
}
const MODOS_PAGO = ['TRANSFERENCIA','EFECTIVO','TARJETA']

interface Linea { tipoItem: 'PRODUCTO' | 'SERVICIO_BORDADO'; productoId?: string; productoNombre: string; talle: string; bordado?: string; cantidad: number; precioUnitario: number; precioBordado: number; precioEstampado: number }

function NuevoPresupuesto({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: instituciones = [] } = useQuery({ queryKey: ['instituciones'], queryFn: () => institucionesApi.listar() })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.listar() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesApi.listar() })
  
  const [clienteId, setClienteId] = useState('')
  const [institucionId, setInstitucionId] = useState('')
  
  const clienteSel = clientes.find((i:any) => i.id === clienteId)
  
  const [modoPago, setModoPago] = useState('TRANSFERENCIA')
  const [senia, setSenia] = useState('')
  const [notas, setNotas] = useState('')
  const [aplicaIva, setAplicaIva] = useState(false)
  const [tipoVencimiento, setTipoVencimiento] = useState<'HABILES'|'CORRIDOS'>('CORRIDOS')
  const [diasVigencia, setDiasVigencia] = useState(15)
  const [canal, setCanal] = useState<'OFFICIAL'|'GESTION'>('GESTION')
  // -- LOGICA DE PLANIFICACIÓN AUTOMÁTICA --
  const [leadTimeMax, setLeadTimeMax] = useState(0)

  // Nuevo Cliente Rapido
  const [showNuevoCli, setShowNuevoCli] = useState(false)
  const [newCli, setNewCli] = useState({ nombre: '', apellido: '', telefono: '', email: '', direccion: '', razonSocial: '', cuit: '', condicionIva: 'CONSUMIDOR_FINAL', tipoFactura: 'C' })

  const crearClienteMut = useMutation({
    mutationFn: clientesApi.crear,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setClienteId(data.id)
      setShowNuevoCli(false)
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

  const [lineas, setLineas] = useState<Linea[]>([{ tipoItem: 'PRODUCTO', productoNombre: '', talle: '', bordado: '', cantidad: 1, precioUnitario: 0, precioBordado: 0, precioEstampado: 0 }])

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
  // ----------------------------------------
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuestos'] }); onClose() }
  })

  // Catálogo Exclusivo
  const prodFiltrados = productos.filter((p:any) => !institucionId || p.institucionId === institucionId || !p.institucionId)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
           <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">Nuevo Presupuesto Híbrido</span>
              <div className="flex gap-2">
                 <select value={institucionId} onChange={e => setInstitucionId(e.target.value)} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none text-gray-500 font-bold">
                    <option value="">+ Catálogo Muestra (Opcional)</option>
                    {instituciones.map((i: any) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                 </select>
              </div>
           </div>
           <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CLIENTE Y VIGENCIA */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-indigo-500 mb-2">Cliente (Facturación)</label>
              <div className="flex gap-2">
                {!showNuevoCli ? (
                  <>
                    <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full text-sm font-bold border border-gray-200 rounded-lg px-3 py-2">
                      <option value="">Seleccione o Cree un cliente...</option>
                      {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido||''} - {c.condicionIva.replace('_',' ')}</option>)}
                    </select>
                    <button onClick={() => setShowNuevoCli(true)} className="px-3 py-2 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg whitespace-nowrap shrink-0">+ Crear</button>
                  </>
                ) : (
                  <div className="w-full space-y-3 border border-indigo-100 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex gap-2">
                      <select value={newCli.condicionIva} onChange={e => setNewCli({ ...newCli, condicionIva: e.target.value, tipoFactura: e.target.value === 'RESPONSABLE_INSCRIPTO' ? 'A' : 'C' })} className="w-1/2 text-xs font-bold border border-gray-200 px-3 py-2 rounded-lg outline-none">
                        <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                        <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                        <option value="EXENTO">Exento</option>
                      </select>
                      <select disabled value={newCli.tipoFactura} className="w-1/2 text-xs bg-gray-50 text-gray-500 border border-gray-200 px-3 py-2 rounded-lg outline-none">
                        <option value="C">Factura C</option>
                        <option value="A">Factura A</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                       <input autoFocus placeholder="Nombre" value={newCli.nombre} onChange={e => setNewCli({ ...newCli, nombre: e.target.value })} className="w-1/2 text-sm border-b border-gray-200 px-2 py-1 outline-none font-medium" />
                       <input placeholder="Apellido" value={newCli.apellido} onChange={e => setNewCli({ ...newCli, apellido: e.target.value })} className="w-1/2 text-sm border-b border-gray-200 px-2 py-1 outline-none" />
                    </div>

                    {(newCli.condicionIva === 'RESPONSABLE_INSCRIPTO' || newCli.condicionIva === 'EXENTO') && (
                      <div className="flex gap-2 pt-2 bg-yellow-50/50 -mx-4 px-4 py-3 border-t border-b border-yellow-100">
                         <input placeholder="Razón Social (*)" value={newCli.razonSocial} onChange={e => setNewCli({ ...newCli, razonSocial: e.target.value })} className="w-2/3 text-sm border border-yellow-200 rounded px-2 py-1 outline-none font-medium" />
                         <input placeholder="CUIT (*)" value={newCli.cuit} onChange={e => setNewCli({ ...newCli, cuit: e.target.value })} className="w-1/3 text-sm border border-yellow-200 rounded px-2 py-1 outline-none" />
                      </div>
                    )}

                    <div className="flex gap-2">
                       <input placeholder="Teléfono" value={newCli.telefono} onChange={e => setNewCli({ ...newCli, telefono: e.target.value })} className="w-1/3 text-xs border-b border-gray-200 px-2 py-1 outline-none text-gray-600" />
                       <input type="email" placeholder="Email" value={newCli.email} onChange={e => setNewCli({ ...newCli, email: e.target.value })} className="w-2/3 text-xs border-b border-gray-200 px-2 py-1 outline-none text-gray-600" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setShowNuevoCli(false)} className="text-xs text-gray-400 font-medium px-3">Cancelar</button>
                      <button onClick={() => crearClienteMut.mutate(newCli)} disabled={!newCli.nombre || (newCli.condicionIva==='RESPONSABLE_INSCRIPTO' && (!newCli.razonSocial || !newCli.cuit))} className="text-xs font-bold bg-indigo-500 text-white px-4 py-2 rounded shadow disabled:opacity-50 transition-all">Guardar Cliente</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-64">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2">Vigencia (Días)</label>
              <div className="flex items-center gap-0">
                <input type="number" min="1" value={diasVigencia} onChange={e => setDiasVigencia(parseInt(e.target.value) || 1)} className="w-16 text-center text-sm font-bold border border-gray-200 rounded-l-lg px-2 py-2 border-r-0" />
                <select value={tipoVencimiento} onChange={e => setTipoVencimiento(e.target.value as any)} className="w-full text-xs font-semibold border border-gray-200 rounded-r-lg px-2 py-2.5 bg-white outline-none">
                  <option value="CORRIDOS">Corridos</option>
                  <option value="HABILES">Hábiles (Lun-Vie)</option>
                </select>
              </div>
            </div>
            
            <div className="w-48">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2">Canal Operativo</label>
              <select value={canal} onChange={e => setCanal(e.target.value as any)} className="w-full text-xs font-bold border border-indigo-100 bg-indigo-50/30 text-indigo-700 rounded-lg px-2 py-2 outline-none">
                 <option value="GESTION">GESTIÓN (Interno)</option>
                 <option value="OFFICIAL">OFICIAL (Facturado)</option>
              </select>
            </div>
            
            <div className="w-48">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2">Impositivo</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={aplicaIva} onChange={e => setAplicaIva(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-xs font-semibold text-gray-700">IVA (21%)</span>
              </div>
            </div>
          </div>

          {/* GRILLA TIPO EXCEL */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-24">Tipo</th>
                  <th className="text-left text-[10px] font-black uppercase text-gray-500 px-3 py-2">Item / Concepto</th>
                  <th className="text-left text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-20">Talle</th>
                  <th className="text-left text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-32">Logo/Bordado</th>
                  <th className="text-right text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-16">Cant.</th>
                  <th className="text-right text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-24">P. Unit. $</th>
                  <th className="text-right text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-24">Bordado $</th>
                  <th className="text-right text-[10px] font-black uppercase text-gray-500 px-3 py-2 w-28">Subtotal</th>
                  <th className="px-2 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {lineas.map((l, i) => {
                  const sub = (l.precioUnitario + l.precioBordado + l.precioEstampado) * l.cantidad
                  const isLast = i === lineas.length - 1
                  return (
                    <tr key={i} ref={isLast ? lastRowRef : null} className="border-b border-gray-50 hover:bg-indigo-50/20 group">
                      <td className="px-2 py-1">
                        <select value={l.tipoItem} onChange={e => {
                          updateLinea(i, 'tipoItem', e.target.value)
                          if (e.target.value === 'SERVICIO_BORDADO') updateLinea(i, 'talle', '')
                        }} className="w-full text-xs font-bold text-gray-600 bg-transparent outline-none">
                          <option value="PRODUCTO">Prenda</option>
                          <option value="SERVICIO_BORDADO">Servicio</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        {l.tipoItem === 'PRODUCTO' ? (
                          <input list={`prod-list`} value={l.productoNombre} onChange={e => updateLinea(i, 'productoNombre', e.target.value)} onKeyDown={(e)=>handleKeyDown(e, i)} placeholder="Buscar / Escribir..." className="w-full text-xs font-bold px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded" />
                        ) : (
                          <input value={l.productoNombre} onChange={e => updateLinea(i, 'productoNombre', e.target.value)} onKeyDown={(e)=>handleKeyDown(e, i)} placeholder="Ej: Bordado toallas Hotel" className="w-full text-xs font-bold px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded text-teal-700" />
                        )}
                      </td>
                      <td className="px-2 py-1"><input disabled={l.tipoItem === 'SERVICIO_BORDADO'} value={l.talle} onChange={e => updateLinea(i, 'talle', e.target.value)} onKeyDown={(e)=>handleKeyDown(e, i)} className="w-full text-xs text-center border-gray-200 px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded disabled:opacity-30 disabled:bg-gray-100" /></td>
                      <td className="px-2 py-1"><input value={l.bordado || ''} onChange={e => updateLinea(i, 'bordado', e.target.value)} onKeyDown={(e)=>handleKeyDown(e, i)} className="w-full text-xs px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded" /></td>
                      <td className="px-2 py-1"><input type="number" min="1" value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', parseInt(e.target.value) || 1)} onKeyDown={(e)=>handleKeyDown(e, i)} className="w-full text-xs font-bold text-right px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded" /></td>
                      <td className="px-2 py-1"><input type="number" value={l.precioUnitario || ''} onChange={e => updateLinea(i, 'precioUnitario', parseFloat(e.target.value) || 0)} onKeyDown={(e)=>handleKeyDown(e, i)} placeholder="0" className="w-full text-xs text-right px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded" /></td>
                      <td className="px-2 py-1"><input type="number" value={l.precioBordado || ''} onChange={e => updateLinea(i, 'precioBordado', parseFloat(e.target.value) || 0)} onKeyDown={(e)=>handleKeyDown(e, i)} placeholder="0" className="w-full text-xs text-right px-2 py-1.5 focus:bg-white bg-transparent outline-none rounded" /></td>
                      <td className="px-3 py-2 text-xs font-black text-gray-900 text-right whitespace-nowrap bg-gray-50/50">{sub > 0 ? fmt(sub) : '—'}</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeLinea(i)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <datalist id="prod-list">
              {prodFiltrados.map((p:any) => <option key={p.id} value={p.nombre} />)}
            </datalist>

            <button onClick={addLinea} className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-[10px] uppercase font-bold text-gray-400 transition-colors">
              ↓ Presiona Flecha Abajo o Click Aquí para agregar línea
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Modo de pago</label>
                <select value={modoPago} onChange={e => setModoPago(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
                  {MODOS_PAGO.map(m => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <span className="text-6xl">🕒</span>
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">Sugerencia Logística</h3>
                 <div className="flex items-end justify-between">
                    <div>
                       <div className="text-xs font-bold text-white/80">Entrega Estimada</div>
                       <div className="text-xl font-black italic">{fechaSugerida.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-bold text-indigo-300 uppercase">Wait Time + Buffer</div>
                       <div className="text-sm font-black">{leadTimeMax + 3} días</div>
                    </div>
                 </div>
                 {leadTimeMax > 0 && (
                   <div className="mt-4 pt-4 border-t border-indigo-500/50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-100">Basado en Cuello de Botella de Insumos</span>
                   </div>
                 )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Notas internas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Condiciones especiales..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-3">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Total Gravado</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {aplicaIva && (
                <div className="flex justify-between text-indigo-400 text-sm animate-pulse">
                  <span>IVA (21%)</span>
                  <span>+ {fmt(iva)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-300 text-xs pt-2 border-t border-gray-800">
                <span>Descontar Seña Manual:</span>
                <input type="number" placeholder="$0" value={senia} onChange={e => setSenia(e.target.value)} className="w-24 bg-gray-800 border-none outline-none text-right rounded p-1" />
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-sm font-bold text-gray-300">TOTAL NETO</span>
                <span className="text-3xl font-black text-emerald-400">{fmt(total - (parseFloat(senia) || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end bg-white rounded-b-xl gap-3">
          <button onClick={onClose} className="text-sm px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={lineas.every(l => !l.productoNombre) || mutation.isPending} className="text-sm px-8 py-2.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-md">
            {mutation.isPending ? 'Emitiendo...' : 'Emitir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PresupuestosPage() {
  const qc = useQueryClient()
  const [nuevo,setNuevo] = useState(false)
  const {data:presupuestos=[],isLoading} = useQuery({
    queryKey:['presupuestos'], queryFn:presupuestosApi.listar
  })

  const mutAprobar = useMutation({
    mutationFn: produccionApi.aprobarPresupuesto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      alert('¡Presupuesto aprobado! El pedido se inició y el stock técnico fue descontado.')
    }
  })

  const totalUnidades = presupuestos.reduce((acc:number,p:any)=>acc+(p.lineas?.reduce((s:number,l:any)=>s+l.cantidad,0)??0),0)
  const totalFacturado = presupuestos.filter((p:any)=>p.estado!=='CANCELADO').reduce((acc:number,p:any)=>acc+Number(p.total),0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-widest italic">Presupuestos Industriales</h1>
          <p className="text-sm text-gray-400 mt-0.5">{presupuestos.length} presupuestos</p>
        </div>
        <button onClick={()=>setNuevo(true)} className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          + Nuevo presupuesto
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {label:'Presupuestos activos', val:presupuestos.filter((p:any)=>p.estado==='VIGENTE').length, sub:'vigentes'},
          {label:'Unidades totales', val:totalUnidades.toLocaleString('es-AR'), sub:'en todos los presupuestos'},
          {label:'Total facturado', val:fmt(totalFacturado), sub:'excluyendo cancelados'},
        ].map(m=>(
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-xl font-medium text-gray-900">{m.val}</div>
            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-400">Cargando presupuestos…</div>
        ) : presupuestos.length===0 ? (
          <div className="p-10 text-center">
            <div className="text-sm text-gray-400 mb-3">Todavía no hay presupuestos</div>
            <button onClick={()=>setNuevo(true)} className="text-sm text-blue-600 hover:text-blue-800">Crear el primero →</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N°</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Fecha</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Unidades</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Modo pago</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.map((p:any)=>{
                const unidades=p.lineas?.reduce((s:number,l:any)=>s+l.cantidad,0)??0
                const cliente=p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido||''}` : p.institucion?.nombre ?? p.clienteNombre ?? '—'
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">#{p.numero}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-900">{cliente}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(p.creadoEn).toLocaleDateString('es-AR')}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 text-right">{unidades}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 text-right">{fmt(Number(p.total))}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{p.modoPago.charAt(0)+p.modoPago.slice(1).toLowerCase()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado]??'bg-gray-50 text-gray-500'}`}>
                        {p.estado.charAt(0)+p.estado.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                       {p.estado === 'VIGENTE' && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('¿Iniciar la producción y descontar stock?')) mutAprobar.mutate(p.id) }} 
                            className="text-[10px] font-black uppercase bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                         >Aprobar</button>
                       )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {nuevo && <NuevoPresupuesto onClose={()=>setNuevo(false)}/>}
    </div>
  )
}
