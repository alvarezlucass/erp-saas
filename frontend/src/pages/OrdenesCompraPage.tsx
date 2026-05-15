import React, { useState, useEffect } from 'react'
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Truck, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  Package,
  Layers
} from 'lucide-react'
import { comprasApi, proveedoresApi, OrdenCompra, Proveedor, insumosApi, productosApi, Insumo, Producto } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function OrdenesCompraPage() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [selectedProveedor, setSelectedProveedor] = useState('')
  
  // New OC state
  const [items, setItems] = useState<any[]>([])
  const [searchInsumo, setSearchInsumo] = useState('')
  const [searchProducto, setSearchProducto] = useState('')
  const [filteredInsumos, setFilteredInsumos] = useState<Insumo[]>([])
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([])
  const [notas, setNotas] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [o, p] = await Promise.all([
        comprasApi.listarOrdenes(),
        proveedoresApi.listar()
      ])
      setOrdenes(o)
      setProveedores(p)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchInsumo.length > 2) {
      insumosApi.listar({ buscar: searchInsumo }).then(setFilteredInsumos)
    } else {
      setFilteredInsumos([])
    }
  }, [searchInsumo])

  useEffect(() => {
    if (searchProducto.length > 2) {
      productosApi.listar({ buscar: searchProducto }).then(setFilteredProductos)
    } else {
      setFilteredProductos([])
    }
  }, [searchProducto])

  const addItem = (type: 'INSUMO' | 'PRODUCTO', data: any) => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      targetId: data.id,
      nombre: data.nombre,
      insumoId: type === 'INSUMO' ? data.id : null,
      productoId: type === 'PRODUCTO' ? data.id : null,
      talle: null,
      cantidadPedida: 1,
      costoUnitarioEstimado: type === 'INSUMO' ? (data.costoActual || 0) : (data.costoCompra || 0),
    }
    setItems([...items, newItem])
    setSearchInsumo('')
    setSearchProducto('')
    setFilteredInsumos([])
    setFilteredProductos([])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleCreateOC = async () => {
    if (!selectedProveedor || items.length === 0) return
    try {
      await comprasApi.crearOrden({
        proveedorId: selectedProveedor,
        fechaEntregaEstimada: fechaEntrega || null,
        notas,
        items: items.map(i => ({
          insumoId: i.insumoId,
          productoId: i.productoId,
          talle: i.talle,
          cantidadPedida: Number(i.cantidadPedida),
          costoUnitarioEstimado: Number(i.costoUnitarioEstimado)
        }))
      })
      setShowModal(false)
      setItems([])
      setSelectedProveedor('')
      setNotas('')
      setFechaEntrega('')
      loadData()
    } catch (error) {
      alert('Error al crear la orden de compra')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR': return 'bg-gray-500/20 text-gray-400'
      case 'ENVIADA': return 'bg-blue-500/20 text-blue-400'
      case 'RECIBIDA_PARCIAL': return 'bg-orange-500/20 text-orange-400'
      case 'RECIBIDA_TOTAL': return 'bg-green-500/20 text-green-400'
      case 'CANCELADA': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-blue-500" />
            ÓRDENES DE COMPRA
          </h1>
          <p className="text-gray-400 mt-2 font-medium uppercase tracking-widest text-sm">
            Gestión industrial de abastecimiento
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          NUEVA ORDEN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pendientes</p>
              <h3 className="text-2xl font-black text-white">{ordenes.filter(o => o.estado === 'ENVIADA').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Parciales</p>
              <h3 className="text-2xl font-black text-white">{ordenes.filter(o => o.estado === 'RECIBIDA_PARCIAL').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Completadas</p>
              <h3 className="text-2xl font-black text-white">{ordenes.filter(o => o.estado === 'RECIBIDA_TOTAL').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-500/10 rounded-xl">
              <Package className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Mes</p>
              <h3 className="text-2xl font-black text-white">{ordenes.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/30">
              <th className="p-6 text-zinc-500 font-bold text-xs uppercase tracking-widest">Nro / Fecha</th>
              <th className="p-6 text-zinc-500 font-bold text-xs uppercase tracking-widest">Proveedor</th>
              <th className="p-6 text-zinc-500 font-bold text-xs uppercase tracking-widest">Estado</th>
              <th className="p-6 text-zinc-500 font-bold text-xs uppercase tracking-widest">Total</th>
              <th className="p-6 text-zinc-500 font-bold text-xs uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {ordenes.map((orden) => (
              <tr key={orden.id} className="hover:bg-zinc-800/20 transition-colors group">
                <td className="p-6">
                  <div className="flex flex-col">
                    <span className="text-white font-black">OC #{orden.numero}</span>
                    <span className="text-zinc-500 text-xs">{format(new Date(orden.creadoEn), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-zinc-600" />
                    <span className="text-zinc-300 font-bold uppercase text-sm tracking-tight">{orden.proveedor?.nombre}</span>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getStatusColor(orden.estado)}`}>
                    {orden.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-6">
                  <span className="text-white font-black tracking-tight">$ {orden.totalEstimado.toLocaleString()}</span>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ordenes.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-zinc-600">
                    <ShoppingBag className="w-16 h-16 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm">No hay órdenes de compra registradas</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva OC */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/30">
              <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                <Plus className="w-8 h-8 text-blue-500" />
                GENERAR ORDEN DE COMPRA
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-2">
                <MoreVertical className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Proveedor</label>
                  <select 
                    value={selectedProveedor}
                    onChange={(e) => setSelectedProveedor(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar Proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha Entrega Estimada</label>
                  <input 
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Buscador Insumos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Agregar Insumo (Materia Prima)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder="Buscar por nombre o tipo..."
                      value={searchInsumo}
                      onChange={(e) => setSearchInsumo(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {filteredInsumos.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-700 mt-2 rounded-xl overflow-hidden shadow-2xl z-10 max-h-48 overflow-y-auto">
                        {filteredInsumos.map(i => (
                          <button 
                            key={i.id}
                            onClick={() => addItem('INSUMO', i)}
                            className="w-full p-4 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between border-b border-zinc-700 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-sm uppercase">{i.nombre}</span>
                              <span className="text-zinc-500 text-[10px]">{i.tipo}</span>
                            </div>
                            <Plus className="w-4 h-4 text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Buscador Productos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Agregar Producto (Terminado/Comprado)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchProducto}
                      onChange={(e) => setSearchProducto(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {filteredProductos.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-700 mt-2 rounded-xl overflow-hidden shadow-2xl z-10 max-h-48 overflow-y-auto">
                        {filteredProductos.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => addItem('PRODUCTO', p)}
                            className="w-full p-4 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between border-b border-zinc-700 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-sm uppercase">{p.nombre}</span>
                              <span className="text-zinc-500 text-[10px]">{p.tipo}</span>
                            </div>
                            <Plus className="w-4 h-4 text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Items */}
              <div className="bg-zinc-950/50 rounded-2xl overflow-hidden border border-zinc-800">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/50">
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase">Ítem</th>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase">Talle</th>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase w-24">Cantidad</th>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase">Costo Est.</th>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase">Subtotal</th>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {item.type === 'INSUMO' ? <Layers className="w-4 h-4 text-zinc-500" /> : <Package className="w-4 h-4 text-zinc-500" />}
                            <span className="text-white font-bold text-sm uppercase tracking-tight">{item.nombre}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {item.type === 'PRODUCTO' ? (
                            <input 
                              type="text"
                              value={item.talle || ''}
                              onChange={(e) => updateItem(item.id, 'talle', e.target.value)}
                              placeholder="Talle"
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-white text-xs"
                            />
                          ) : <span className="text-zinc-600">-</span>}
                        </td>
                        <td className="p-4">
                          <input 
                            type="number"
                            value={item.cantidadPedida}
                            onChange={(e) => updateItem(item.id, 'cantidadPedida', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-white text-xs font-bold"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="number"
                            value={item.costoUnitarioEstimado}
                            onChange={(e) => updateItem(item.id, 'costoUnitarioEstimado', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 text-white text-xs"
                          />
                        </td>
                        <td className="p-4">
                          <span className="text-white font-black text-sm">$ {(item.cantidadPedida * item.costoUnitarioEstimado).toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-400 p-2">
                            <Plus className="w-5 h-5 rotate-45" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-600 uppercase text-[10px] font-black tracking-widest">
                          Agregue ítems a la orden para continuar
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observaciones</label>
                <textarea 
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="Detalles técnicos, condiciones de envío, etc..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Estimado</span>
                <span className="text-2xl font-black text-white">$ {items.reduce((acc, i) => acc + (i.cantidadPedida * i.costoUnitarioEstimado), 0).toLocaleString()}</span>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  disabled={!selectedProveedor || items.length === 0}
                  onClick={handleCreateOC}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  GENERAR ORDEN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
