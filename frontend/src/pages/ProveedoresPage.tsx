import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proveedoresApi, type Proveedor } from '../lib/api'

export function ProveedoresPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Partial<Proveedor> | null>(null)
  const [tabActual, setTabActual] = useState<'legal' | 'domicilios' | 'comercial'>('legal')
  
  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: proveedoresApi.listar
  })

  const guardar = useMutation({
    mutationFn: (data: Partial<Proveedor>) => 
      data.id ? proveedoresApi.editar(data.id, data) : proveedoresApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
      setEditando(null)
    }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight uppercase">Base de Proveedores</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-widest">Gestión de Cadena de Suministro · Amanecer Indumentaria</p>
        </div>
        <button 
          onClick={() => {
            setEditando({ nombre: '', rubro: 'Telas', activo: true, diasPago: 0 })
            setTabActual('legal')
          }}
          className="bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
        >
          + Agregar Socio Comercial
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Listado Principal */}
        <div className="col-span-12 lg:col-span-7">
          {isLoading ? (
            <div className="p-20 text-center text-xs text-gray-400 animate-pulse uppercase tracking-widest">Sincronizando proveedores...</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-50">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Proveedor / Razón Social</th>
                      <th className="px-6 py-4">Rubro</th>
                      <th className="px-6 py-4">Condiciones</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {proveedores.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div>
                              <div className={`text-sm font-bold ${p.activo ? 'text-gray-900' : 'text-gray-400 font-medium italic'}`}>
                                {p.nombre} {!p.activo && '(Inactivo)'}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium">{p.razonSocial || 'Persona Física'} · {p.cuit || 'Sin CUIT'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-tighter border border-indigo-100">
                             {p.rubro}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-[10px] font-bold text-gray-600 uppercase italic">
                             {p.formaPago || 'No definida'}
                             {p.diasPago !== null && <span className="text-gray-400 ml-1">({p.diasPago} días)</span>}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { setEditando(p); setTabActual('legal') }} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-tighter">Ver Ficha</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}
        </div>

        {/* Panel de Edición/Detalle */}
        <div className="col-span-12 lg:col-span-5">
          {editando ? (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl p-8 sticky top-6 overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                  {editando.id ? 'Ficha de Proveedor' : 'Nueva Entidad'}
                </h2>
                <button onClick={() => setEditando(null)} className="text-gray-300 hover:text-gray-600">✕</button>
              </div>

              {/* TABS NAVEGACIÓN */}
              <div className="flex border-b border-gray-100 mb-6 gap-6">
                {[
                  {id: 'legal', label: 'Legal'},
                  {id: 'domicilios', label: 'Direcciones'},
                  {id: 'comercial', label: 'Comercial'}
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setTabActual(tab.id as any)}
                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                      tabActual === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={e => { e.preventDefault(); guardar.mutate(editando) }} className="space-y-6">
                {/* TAB 1: LEGAL */}
                {tabActual === 'legal' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre Fantasía</label>
                      <input required value={editando.nombre} onChange={e=>setEditando({...editando, nombre: e.target.value})} className="w-full text-sm font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Razón Social</label>
                      <input value={editando.razonSocial || ''} onChange={e=>setEditando({...editando, razonSocial: e.target.value})} className="w-full text-sm border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CUIT</label>
                        <input value={editando.cuit || ''} onChange={e=>setEditando({...editando, cuit: e.target.value})} placeholder="30-..." className="w-full text-sm border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-300" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado</label>
                        <div className="flex items-center gap-3 mt-2">
                           <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${editando.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                             {editando.activo ? 'Vigente' : 'Inactivo'}
                           </span>
                           <button 
                             type="button"
                             onClick={() => setEditando({...editando, activo: !editando.activo})}
                             className={`w-10 h-5 rounded-full relative transition-colors ${editando.activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                           >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editando.activo ? 'left-6' : 'left-1'}`} />
                           </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teléfono Directo</label>
                        <input value={editando.telefono || ''} onChange={e=>setEditando({...editando, telefono: e.target.value})} placeholder="+54..." className="w-full text-sm border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-300" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Profesional</label>
                        <input type="email" value={editando.email || ''} onChange={e=>setEditando({...editando, email: e.target.value})} placeholder="contacto@empresa.com" className="w-full text-sm border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-300" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rubro Principal</label>
                      <select value={editando.rubro || ''} onChange={e=>setEditando({...editando, rubro: e.target.value})} className="w-full text-xs font-bold uppercase bg-gray-50 border-none rounded-lg px-2 py-3">
                        <option value="Telas">Telas</option>
                        <option value="Talleres">Talleres</option>
                        <option value="Servicios">Servicios</option>
                        <option value="Mercadería">Mercadería</option>
                        <option value="Insumos">Insumos</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 2: DOMICILIOS */}
                {tabActual === 'domicilios' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* LEGAL */}
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Dirección Legal (Facturación)</h4>
                      <div className="grid grid-cols-4 gap-3">
                         <div className="col-span-3">
                            <input placeholder="Calle" value={editando.dirLegalCalle || ''} onChange={e=>setEditando({...editando, dirLegalCalle: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 bg-transparent focus:outline-none" />
                         </div>
                         <div className="col-span-1">
                            <input placeholder="Nro" value={editando.dirLegalNro || ''} onChange={e=>setEditando({...editando, dirLegalNro: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 bg-transparent focus:outline-none" />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                         <input placeholder="Ciudad" value={editando.dirLegalCiudad || ''} onChange={e=>setEditando({...editando, dirLegalCiudad: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 bg-transparent focus:outline-none" />
                         <input placeholder="Provincia" value={editando.dirLegalProvincia || ''} onChange={e=>setEditando({...editando, dirLegalProvincia: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 bg-transparent focus:outline-none" />
                      </div>
                    </div>

                    {/* REAL */}
                    <div className="p-4 rounded-2xl border border-dashed border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dirección Real (Operativa)</h4>
                        <button type="button" onClick={() => setEditando({...editando, dirRealCalle: editando.dirLegalCalle, dirRealNro: editando.dirLegalNro, dirRealCiudad: editando.dirLegalCiudad, dirRealProvincia: editando.dirLegalProvincia})} className="text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase">Copiar Legal</button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                         <div className="col-span-3">
                            <input placeholder="Calle" value={editando.dirRealCalle || ''} onChange={e=>setEditando({...editando, dirRealCalle: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 focus:outline-none" />
                         </div>
                         <div className="col-span-1">
                            <input placeholder="Nro" value={editando.dirRealNro || ''} onChange={e=>setEditando({...editando, dirRealNro: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 focus:outline-none" />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                         <input placeholder="Ciudad" value={editando.dirRealCiudad || ''} onChange={e=>setEditando({...editando, dirRealCiudad: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 focus:outline-none" />
                         <input placeholder="Provincia" value={editando.dirRealProvincia || ''} onChange={e=>setEditando({...editando, dirRealProvincia: e.target.value})} className="w-full text-xs border-b border-gray-200 py-1 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: COMERCIAL */}
                {tabActual === 'comercial' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Forma de Pago</label>
                        <select value={editando.formaPago || ''} onChange={e=>setEditando({...editando, formaPago: e.target.value})} className="w-full text-xs font-bold uppercase bg-gray-50 border-none rounded-lg px-2 py-3">
                          <option value="Contado">Contado / Cash</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Cuenta Corriente">Cuenta Corriente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Días de Pago</label>
                        <input type="number" value={editando.diasPago || 0} onChange={e=>setEditando({...editando, diasPago: parseInt(e.target.value) || 0})} className="w-full text-sm font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-600" />
                        <p className="text-[10px] text-gray-300 mt-1 italic">Días para pagar facturas o cheques.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Medio de Pedido</label>
                      <input value={editando.medioPedido || ''} onChange={e=>setEditando({...editando, medioPedido: e.target.value})} placeholder="WhatsApp / Email / Portal" className="w-full text-sm border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-300" />
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-50 mt-8">
                  <button type="submit" disabled={guardar.isPending} className="w-full bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl hover:bg-indigo-600 shadow-2xl transition-all disabled:opacity-50">
                    {guardar.isPending ? 'Sincronizando...' : (editando.id ? 'Actualizar Ficha de Socio' : 'Finalizar y Crear')}
                  </button>
                  
                  {editando.id && (
                    <button 
                      type="button" 
                      onClick={() => {
                        if(window.confirm('¿Desea eliminar definitivamente este proveedor? Esta acción no se puede deshacer.')) {
                          proveedoresApi.baja(editando.id!).then(() => {
                            qc.invalidateQueries({ queryKey: ['proveedores'] })
                            setEditando(null)
                          })
                        }
                      }}
                      className="w-full text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest mt-6 transition-colors"
                    >
                      🗑️ Eliminar Socio del Sistema
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-100/50 border border-dashed border-gray-200 rounded-[32px] p-16 text-center">
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Expediente de Proveedor</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">Selecciona una entidad para ver su historial, domicilios logísticos y acuerdos comerciales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
