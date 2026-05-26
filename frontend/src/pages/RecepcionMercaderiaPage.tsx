import React, { useState, useEffect } from 'react'
import { 
  Truck, 
  Plus, 
  Search, 
  FileCheck, 
  Package, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
  Trash2,
  Scan,
  Download
} from 'lucide-react'
import { comprasApi, proveedoresApi, insumosApi, productosApi, OrdenCompra, Proveedor, Insumo, Producto } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function RecepcionMercaderiaPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [ordenesAbiertas, setOrdenesAbiertas] = useState<OrdenCompra[]>([])
  const [selectedProveedor, setSelectedProveedor] = useState('')
  const [selectedOC, setSelectedOC] = useState('')
  
  const [remito, setRemito] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [searchInsumo, setSearchInsumo] = useState('')
  const [filteredInsumos, setFilteredInsumos] = useState<Insumo[]>([])

  useEffect(() => {
    proveedoresApi.listar().then(setProveedores)
  }, [])

  useEffect(() => {
    if (selectedProveedor) {
      comprasApi.listarOrdenes({ proveedorId: selectedProveedor, estado: 'ENVIADA' }).then(setOrdenesAbiertas)
    } else {
      setOrdenesAbiertas([])
      setSelectedOC('')
    }
  }, [selectedProveedor])

  const handleSelectOC = async (ocId: string) => {
    setSelectedOC(ocId)
    if (!ocId) {
      setItems([])
      return
    }
    try {
      const oc = await comprasApi.obtenerOrden(ocId)
      const mappedItems = oc.items?.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        lineaOrdenCompraId: item.id,
        nombre: item.insumo?.nombre || item.producto?.nombre,
        insumoId: item.insumoId,
        productoId: item.productoId,
        talle: item.talle,
        cantidadPedida: item.cantidadPedida,
        cantidadPendiente: item.cantidadPedida - item.cantidadRecibida,
        cantidadRecibida: item.cantidadPedida - item.cantidadRecibida, // Default to receiving everything pending
        costoUnitarioReal: item.costoUnitarioEstimado,
        type: item.insumoId ? 'INSUMO' : 'PRODUCTO'
      })) || []
      setItems(mappedItems)
    } catch (error) {
      console.error(error)
    }
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleRegister = async () => {
    if (!selectedProveedor || items.length === 0) return
    setLoading(true)
    try {
      // For products, we need to map to ProductoTalleId. 
      // This is a bit tricky if the OC only has ProductoId. 
      // In a real industrial system, the OC should probably specify the talle.
      // For now, I'll assume we find the ProductoTalleId based on ProductoId + Talle.
      
      const payloadItems = await Promise.all(items.map(async (i) => {
        let productoTalleId = null
        if (i.productoId && i.talle) {
          // Find the specific talle ID
          const prod = await productosApi.obtener(i.productoId)
          const talleObj = prod.talles.find((t: any) => t.talle === i.talle)
          productoTalleId = talleObj?.id
        }
        
        return {
          lineaOrdenCompraId: i.lineaOrdenCompraId,
          insumoId: i.insumoId,
          productoTalleId,
          cantidadRecibida: Number(i.cantidadRecibida),
          costoUnitarioReal: Number(i.costoUnitarioReal)
        }
      }))

      await comprasApi.registrarRecepcion({
        proveedorId: selectedProveedor,
        ordenCompraId: selectedOC || null,
        nroRemito: remito,
        notas,
        items: payloadItems
      })
      
      alert('Recepción registrada con éxito. Stock actualizado.')
      resetForm()
    } catch (error) {
      alert('Error al registrar la recepción')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedProveedor('')
    setSelectedOC('')
    setRemito('')
    setNotas('')
    setItems([])
  }

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <Truck className="w-10 h-10 text-orange-500" />
            RECEPCIÓN DE MERCADERÍA
          </h1>
          <p className="text-gray-400 mt-2 font-medium uppercase tracking-widest text-sm">
            Conciliación de carga y actualización de inventario
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Scan className="w-5 h-5" />
            ESCANEAR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Origen */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              <Info className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Datos de Origen</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Proveedor</label>
                <select 
                  value={selectedProveedor}
                  onChange={(e) => setSelectedProveedor(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Orden de Compra (Opcional)</label>
                <select 
                  value={selectedOC}
                  onChange={(e) => handleSelectOC(e.target.value)}
                  disabled={!selectedProveedor}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all font-bold"
                >
                  <option value="">Ingreso Directo (Sin OC)</option>
                  {ordenesAbiertas.map(oc => (
                    <option key={oc.id} value={oc.id}>OC #{oc.numero} - {format(new Date(oc.creadoEn), 'dd/MM/yyyy')}</option>
                  ))}
                </select>
                {selectedOC && (
                  <p className="text-orange-500 text-[10px] font-bold uppercase mt-1 animate-pulse flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Modo Macheo Activado
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nro. de Remito / Factura</label>
                <input 
                  type="text"
                  placeholder="Ej: 0001-00001234"
                  value={remito}
                  onChange={(e) => setRemito(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold tracking-widest"
                />
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observaciones de Recepción</label>
                <textarea 
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles sobre el estado de la carga, bultos, etc..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Detalle de Ítems */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-xl shadow-xl overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-8 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase">Detalle de Mercadería</h2>
                <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest">
                  {selectedOC ? 'Comparativa vs Orden de Compra' : 'Carga de mercadería directa'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Recibido</span>
                <p className="text-2xl font-black text-white">{items.reduce((acc, i) => acc + Number(i.cantidadRecibida), 0)} UN.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50">
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ítem</th>
                    {selectedOC && <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-24">Pedido</th>}
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-32">Recibido</th>
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-40">Costo Real (Un.)</th>
                    <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Macheo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.type === 'INSUMO' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                            {item.type === 'INSUMO' ? <Layers className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-purple-500" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-black text-sm uppercase tracking-tight">{item.nombre}</span>
                            <span className="text-zinc-500 text-[10px] font-bold">{item.talle ? `TALLE: ${item.talle}` : item.type}</span>
                          </div>
                        </div>
                      </td>
                      {selectedOC && (
                        <td className="p-6">
                          <span className="text-zinc-400 font-bold">{item.cantidadPedida}</span>
                        </td>
                      )}
                      <td className="p-6">
                        <input 
                          type="number"
                          value={item.cantidadRecibida}
                          onChange={(e) => updateItem(item.id, 'cantidadRecibida', e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white font-black text-center focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </td>
                      <td className="p-6">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                          <input 
                            type="number"
                            value={item.costoUnitarioReal}
                            onChange={(e) => updateItem(item.id, 'costoUnitarioReal', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 pl-7 text-white font-black focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </td>
                      <td className="p-6">
                        {selectedOC && (
                          <div className="flex items-center gap-2">
                            {Number(item.cantidadRecibida) === Number(item.cantidadPendiente) ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : Number(item.cantidadRecibida) > Number(item.cantidadPendiente) ? (
                              <span title="Excedente detectado"><AlertCircle className="w-5 h-5 text-red-500" /></span>
                            ) : (
                              <span title="Pendiente parcial"><Clock className="w-5 h-5 text-orange-500" /></span>
                            )}
                          </div>
                        )}
                        {!selectedOC && (
                          <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-zinc-600 hover:text-red-500 p-2">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-zinc-700">
                          <Download className="w-16 h-16 opacity-20" />
                          <p className="font-black uppercase tracking-widest text-sm">Esperando carga de mercadería...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
              <button 
                onClick={resetForm}
                className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:text-white transition-colors"
              >
                LIMPIAR TODO
              </button>
              <button 
                disabled={!selectedProveedor || items.length === 0 || loading}
                onClick={handleRegister}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-orange-500/20 flex items-center gap-3 uppercase tracking-tighter"
              >
                {loading ? 'Procesando...' : (
                  <>
                    <FileCheck className="w-6 h-6" />
                    Confirmar Recepción
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
