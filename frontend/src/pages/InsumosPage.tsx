import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insumosApi, proveedoresApi, productosApi, tallesApi, configuracionApi, type Insumo } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ProveedorQuickForm } from '../components/ProveedorQuickForm'
import { InsumoTipoQuickForm } from '../components/InsumoTipoQuickForm'
import StockTraceabilityCard from '../components/StockTraceabilityCard'
import { useAuthStore } from '../store/authStore'

const TIPO_COLORS: Record<string, string> = {
  TELA: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  COSTURA: 'bg-blue-50 text-blue-700 border-blue-100',
  ACCESORIO: 'bg-orange-50 text-orange-700 border-orange-100',
  CIERRE: 'bg-purple-50 text-purple-700 border-purple-100',
  CUELLO: 'bg-pink-50 text-pink-700 border-pink-100',
  ESTAMPADO: 'bg-red-50 text-red-700 border-red-100',
  QUEPIS: 'bg-gray-50 text-gray-700 border-gray-200'
}

export function InsumosPage() {
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const isReadOnly = usuario?.rol === 'LECTOR'
  const [filtroTipo, setFiltroTipo] = useState('')
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState<Insumo | null>(null)
  const [evaluando, setEvaluando] = useState<Insumo | null>(null)
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [mostrarQuickProv, setMostrarQuickProv] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [gestorTipos, setGestorTipos] = useState(false)
  const [mostrandoQuickTipo, setMostrandoQuickTipo] = useState(false)
  
  const [form, setForm] = useState({
    codigoInterno: '', tipo: 'TELA', categoria: '', nombre: '', descripcion: '',
    unidad: 'unidad', composicion: '', gramaje: '', ancho: '', color: '',
    stockMinimo: '0', proveedorId: '', costo: '',
    fotoUrl: '', fichaTecnicaUrl: '', talle: '', especificaciones: '',
    tiempoEntrega: '', leadTimeDays: null as number | null
  })

  const [subiendoImg, setSubiendoImg] = useState<string | null>(null)

  // Consultas y Configuración
  const { data: config = {} as any } = useQuery({
    queryKey: ['configuracion-real'],
    queryFn: configuracionApi.get
  })

  const TIPOS = config.tipos_insumo ? JSON.parse(config.tipos_insumo) : ['TELA', 'COSTURA', 'ACCESORIO', 'CIERRE', 'CUELLO', 'ESTAMPADO', 'QUEPIS']

  const mutacionGuardarTipos = useMutation({
    mutationFn: async (nuevosTipos: string[]) => {
      const actual = await configuracionApi.get()
      return configuracionApi.update({
        ...actual,
        tipos_insumo: JSON.stringify(nuevosTipos)
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion-real'] })
  })

  const { data: insumos = [], isLoading } = useQuery({
    queryKey: ['insumos', filtroTipo, buscar],
    queryFn: () => insumosApi.listar({ tipo: filtroTipo || undefined, buscar: buscar || undefined })
  })

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: proveedoresApi.listar
  })

  const { data: curvaTalles = [] } = useQuery({
    queryKey: ['talles'],
    queryFn: tallesApi.listar
  })

  const { data: trazabilidad } = useQuery({
    queryKey: ['insumo', evaluando?.id, 'trazabilidad'],
    queryFn: () => insumosApi.trazabilidad(evaluando!.id!),
    enabled: !!evaluando?.id
  })

  // Mutaciones
  const mutacionGuardar = useMutation({
    mutationFn: (data: any) => data.id ? insumosApi.editar(data.id, data) : insumosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      setMostrarAlta(false)
      setEditando(null)
      resetForm()
    }
  })

  const resetForm = () => {
    setForm({
      codigoInterno: '', tipo: 'TELA', categoria: '', nombre: '', descripcion: '',
      unidad: 'unidad', composicion: '', gramaje: '', ancho: '', color: '',
      stockMinimo: '0', proveedorId: '', costo: '',
      fotoUrl: '', fichaTecnicaUrl: '', talle: '', especificaciones: '',
      tiempoEntrega: '', leadTimeDays: null
    })
  }

  const handleSubirArchivo = async (etiqueta: string, file: File, isEdit: boolean) => {
    try {
      setSubiendoImg(etiqueta)
      const res = await productosApi.subirImagen(file)
      if (isEdit && editando) {
        setEditando({ ...editando, [etiqueta]: res.url } as any)
      } else {
        setForm(prev => ({ ...prev, [etiqueta]: res.url }))
      }
    } catch (err) {
      alert('Error al subir imagen de insumo.')
    } finally {
      setSubiendoImg(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      gramaje: form.gramaje ? parseInt(form.gramaje) : null,
      ancho: form.ancho ? parseFloat(form.ancho) : null,
      stockMinimo: parseFloat(form.stockMinimo),
      costo: parseFloat(form.costo)
    }
    mutacionGuardar.mutate(payload)
  }

  const agregarTipo = () => {
    if (!nuevoTipo) return
    const normalizado = nuevoTipo.toUpperCase().trim()
    if (TIPOS.includes(normalizado)) return
    mutacionGuardarTipos.mutate([...TIPOS, normalizado])
    setNuevoTipo('')
    setGestorTipos(false)
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Gestión de Insumos Industriales</h1>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Materias Primas · Artículos de Reventa · Trazabilidad
          </p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => setMostrarAlta(true)}
            className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-10 py-5 rounded-full hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 active:scale-95 flex items-center gap-3"
          >
            <span>📦</span>
            + Nuevo Insumo Técnico
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-10 items-end">
        <div className="flex-1 relative w-full">
          <input 
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, código interno o proveedor..."
            className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-medium shadow-sm"
          />
          <span className="absolute right-6 top-5 text-gray-300 text-xl">🔍</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar max-w-full">
          <button onClick={() => setFiltroTipo('')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!filtroTipo ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'}`}>Todos</button>
          {TIPOS.map((t: string) => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filtroTipo === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'}`}>{t}</button>
          ))}
          <button 
            onClick={() => setGestorTipos(true)}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase bg-gray-50 text-gray-400 border border-dashed border-gray-200 hover:border-indigo-300 hover:text-indigo-500 transition-all shadow-sm"
            title="Gestionar Categorías"
          >+</button>
        </div>
      </div>

      {gestorTipos && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black uppercase italic mb-4">Nuevo Tipo de Insumo</h3>
            <input 
              autoFocus
              value={nuevoTipo}
              onChange={e => setNuevoTipo(e.target.value)}
              placeholder="Ej: CALZADO, SEGURIDAD..."
              className="w-full border-b-2 border-gray-100 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={agregarTipo} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700">Agregar</button>
              <button onClick={() => setGestorTipos(false)} className="px-6 text-[10px] font-bold uppercase text-gray-400">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 text-sm font-medium italic">Sincronizando inventario técnico...</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400">Código</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400">Nombre</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400">Categoría</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400">Proveedor</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400 text-right">Costo Neto</th>
                <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {insumos.map(i => (
                <tr key={i.id} onClick={() => setEvaluando(i)} className={`cursor-pointer hover:bg-indigo-50/30 transition-colors ${!i.activo ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-4 py-3 align-middle">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border inline-block ${TIPO_COLORS[i.tipo] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {i.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs font-bold text-gray-500">{i.codigoInterno || '—'}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="text-sm font-black text-gray-900">{i.nombre}</div>
                    {i.composicion && <div className="text-[10px] text-gray-400 mt-0.5">{i.composicion}</div>}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs font-bold text-gray-600 uppercase">{i.categoria}</td>
                  <td className="px-4 py-3 align-middle text-xs font-medium text-indigo-600">{i.proveedor?.nombre || '—'}</td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="text-sm font-black text-emerald-600">${i.costoActual?.toLocaleString('es-AR')}</div>
                    <div className="text-[9px] text-gray-400 font-medium">/{i.unidad || 'und'}</div>
                  </td>
                  <td className="px-4 py-3 align-middle text-center" onClick={e => e.stopPropagation()}>
                    {!isReadOnly ? (
                      <div className="flex justify-center gap-3">
                        <button onClick={() => setEditando(i)} className="text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 hover:bg-indigo-50 px-2 py-1 rounded-lg" title="Editar Ficha"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button 
                          onClick={() => { if(window.confirm('¿Desea eliminar este insumo definitivamente?')) insumosApi.eliminar(i.id).then(() => qc.invalidateQueries({queryKey:['insumos']})) }}
                          className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 px-2 py-1 rounded-lg"
                        ><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Solo Vista</span>
                    )}
                  </td>
                </tr>
              ))}
              {insumos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 font-medium italic">
                    No se encontraron insumos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL ALTA */}
      {mostrarAlta && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMostrarAlta(false)} />
          <div className="w-full max-w-xl bg-white h-full shadow-2xl relative animate-in slide-in-from-right duration-300 p-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Nueva Ficha de Insumo</h2><p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Especificaciones Técnicas Industriales</p></div>
              <button onClick={() => setMostrarAlta(false)} className="text-gray-300 hover:text-gray-900 text-2xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">SKU / Código</label><input required value={form.codigoInterno} onChange={e => setForm({...form, codigoInterno: e.target.value})} placeholder="Ej: TEL-PIQ-001" className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" /></div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Tipo de Insumo</label>
                  <div className="flex gap-2 items-center">
                    <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="flex-1 text-xs font-black bg-gray-50 border-none rounded-lg px-2 py-2">
                       {TIPOS.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setMostrandoQuickTipo(true)}
                      className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center font-black hover:bg-indigo-600 hover:text-white transition-all"
                    >+</button>
                  </div>
                </div>
              </div>

              {mostrandoQuickTipo && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                   <div className="w-full max-w-sm">
                      <InsumoTipoQuickForm 
                        tiposActuales={TIPOS}
                        onSuccess={(nuevo: string) => {
                          setForm({...form, tipo: nuevo})
                          setMostrandoQuickTipo(false)
                        }}
                        onCancel={() => setMostrandoQuickTipo(false)}
                      />
                   </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Nombre Comercial</label><input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Piquet AGS Premium" className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Categoría Textil</label><input required value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} placeholder="Ej: Cuello / Tira" className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" /></div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-indigo-500 mb-2 italic tracking-widest">Trazabilidad de Origen</label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <select 
                      required 
                      value={form.proveedorId} 
                      onChange={e => setForm({...form, proveedorId: e.target.value})} 
                      className="w-full text-xs font-bold bg-gray-50 border-none rounded-xl px-3 py-4"
                    >
                      <option value="">Seleccionar Proveedor...</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setMostrarQuickProv(true) }} 
                    className="bg-indigo-600 text-white w-12 h-12 rounded-xl text-xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center"
                  >+</button>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Días Corridos para Planificación</label>
                <input 
                  type="number"
                  value={form.leadTimeDays || ''} 
                  onChange={e => setForm({...form, leadTimeDays: e.target.value ? parseInt(e.target.value) : null} as any)} 
                  placeholder="Ej: 7" 
                  className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Descripción de Entrega</label>
                <input 
                  value={form.tiempoEntrega} 
                  onChange={e => setForm({...form, tiempoEntrega: e.target.value})} 
                  placeholder="Ej: 7 días hábiles, 2 semanas..." 
                  className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Talle / Medida Vinculada</label>
                  <select 
                    value={form.talle} 
                    onChange={e => setForm({...form, talle: e.target.value})} 
                    className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500 bg-transparent"
                  >
                    <option value="">Manual / Sin Talle</option>
                    <optgroup label="Talle Único">
                      <option value="Talle Único">Talle Único (Estándar)</option>
                    </optgroup>
                    {curvaTalles.map(curva => (
                      <optgroup key={curva.id} label={curva.nombre}>
                        {curva.items.map(item => (
                          <option key={item.id} value={`${curva.nombre} - ${item.nombre}`}>
                            {curva.nombre} - {item.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Tipo / Especialidad</label>
                  <input 
                    value={form.especificaciones} 
                    onChange={e => setForm({...form, especificaciones: e.target.value})} 
                    placeholder="Ej: Seguridad, Borceguí..." 
                    className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>
              <div className="bg-gray-50/50 p-8 rounded-[2.5rem] space-y-6 border border-gray-50">
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">GSM (Gramaje)</label><input type="number" value={form.gramaje} onChange={e => setForm({...form, gramaje: e.target.value})} placeholder="220" className="w-full text-xs font-black bg-white rounded-xl px-3 py-3 shadow-sm outline-none" /></div>
                  <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Ancho (m)</label><input type="number" step="0.01" value={form.ancho} onChange={e => setForm({...form, ancho: e.target.value})} placeholder="1.60" className="w-full text-xs font-black bg-white rounded-xl px-3 py-3 shadow-sm outline-none" /></div>
                  <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Color/PANTONE</label><input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="Azul Marino" className="w-full text-xs font-black bg-white rounded-xl px-3 py-3 shadow-sm outline-none" /></div>
                </div>
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Composición Química</label><input value={form.composicion} onChange={e => setForm({...form, composicion: e.target.value})} placeholder="Ej: 65% Algodón / 35% Poliéster" className="w-full text-xs font-black bg-white rounded-xl px-4 py-3 shadow-sm outline-none" /></div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase font-black text-gray-400">Muestra del Material</label>
                    <div 
                      onClick={() => !form.fotoUrl && document.getElementById('file-new-foto')?.click()}
                      className="aspect-video bg-white border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-indigo-200 transition-all"
                    >
                      {subiendoImg === 'fotoUrl' ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> : 
                        form.fotoUrl ? (
                          <div className="w-full h-full relative">
                            <img src={form.fotoUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm({...form, fotoUrl: ''}) }} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs">✕</button>
                          </div>
                        ) : <span className="text-xl grayscale group-hover:grayscale-0 transition-all">📸</span>
                      }
                      <input id="file-new-foto" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubirArchivo('fotoUrl', e.target.files[0], false)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase font-black text-gray-400">Etiqueta / Composición</label>
                    <div 
                      onClick={() => !form.fichaTecnicaUrl && document.getElementById('file-new-ficha')?.click()}
                      className="aspect-video bg-white border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-indigo-200 transition-all"
                    >
                      {subiendoImg === 'fichaTecnicaUrl' ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> : 
                        form.fichaTecnicaUrl ? (
                          <div className="w-full h-full relative">
                            <img src={form.fichaTecnicaUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm({...form, fichaTecnicaUrl: ''}) }} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs">✕</button>
                          </div>
                        ) : <span className="text-xl grayscale group-hover:grayscale-0 transition-all">🏷️</span>
                      }
                      <input id="file-new-ficha" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubirArchivo('fichaTecnicaUrl', e.target.files[0], false)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Unidad Comercial</label><select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} className="w-full text-xs font-black bg-gray-100 border-none rounded-xl px-3 py-3"><option value="metro">Metro lineal</option><option value="unidad">Unidad / Pieza</option><option value="kg">Kilogramo</option><option value="cono">Cono / Carrete</option></select></div>
                <div><label className="block text-emerald-600 text-[10px] uppercase font-black mb-1">Costo Unitario (NETO)</label><div className="relative"><span className="absolute left-3 top-3 text-xs font-black text-emerald-300">$</span><input required type="number" step="0.01" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} className="w-full text-lg font-black bg-emerald-50 text-emerald-700 rounded-xl pl-8 py-2.5 outline-none" /></div></div>
              </div>
              <button type="submit" disabled={mutacionGuardar.isPending} className="w-full bg-gray-900 text-white text-xs font-black uppercase tracking-[0.3em] py-5 rounded-[2rem] hover:bg-indigo-600 transition-all shadow-2xl disabled:opacity-50">{mutacionGuardar.isPending ? 'Validando...' : 'Finalizar y Crear Insumo'}</button>
            </form>

            {mostrarQuickProv && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center p-10 bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-full max-w-sm">
                  <ProveedorQuickForm 
                    onSuccess={(id: string) => { 
                      setForm(prev => ({...prev, proveedorId: id}))
                      setMostrarQuickProv(false) 
                      qc.invalidateQueries({ queryKey: ['proveedores'] })
                    }} 
                    onCancel={() => setMostrarQuickProv(false)} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN */}
      {editando && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <div className="w-full max-w-xl bg-white h-full shadow-2xl relative animate-in slide-in-from-right duration-300 p-10 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Ficha Técnica: {editando.nombre}</h2><p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Mantenimiento de Inventario</p></div>
              <button onClick={() => setEditando(null)} className="text-gray-300 hover:text-gray-900 text-2xl">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); mutacionGuardar.mutate(editando) }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">SKU / Código</label><input value={editando.codigoInterno || ''} onChange={e => setEditando({...editando, codigoInterno: e.target.value})} className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" /></div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Tipo de Insumo</label>
                  <div className="flex gap-2 items-center">
                    <select value={editando.tipo} onChange={e => setEditando({...editando, tipo: e.target.value})} className="flex-1 text-xs font-black bg-gray-50 border-none rounded-lg px-2 py-2">
                       {TIPOS.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setMostrandoQuickTipo(true)}
                      className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center font-black hover:bg-indigo-600 hover:text-white transition-all"
                    >+</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Nombre</label><input required value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" /></div>
                <div>
                   <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Estado de Inventario</label>
                   <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${editando.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{editando.activo ? 'Vigente' : 'Inactivo'}</span>
                    <button type="button" onClick={() => setEditando({...editando, activo: !editando.activo})} className={`w-10 h-5 rounded-full relative transition-colors ${editando.activo ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editando.activo ? 'left-6' : 'left-1'}`} /></button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Talle / Medida Vinculada</label>
                  <select 
                    value={(editando as any).talle || ''} 
                    onChange={e => setEditando({...editando, talle: e.target.value} as any)} 
                    className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500 bg-transparent"
                  >
                    <option value="">Manual / Sin Talle</option>
                    <optgroup label="Talle Único">
                      <option value="Talle Único">Talle Único (Estándar)</option>
                    </optgroup>
                    {curvaTalles.map(curva => (
                      <optgroup key={curva.id} label={curva.nombre}>
                        {curva.items.map(item => (
                          <option key={item.id} value={`${curva.nombre} - ${item.nombre}`}>
                            {curva.nombre} - {item.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Especialidad</label>
                  <input 
                    value={(editando as any).especificaciones || ''} 
                    onChange={e => setEditando({...editando, especificaciones: e.target.value} as any)} 
                    className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-indigo-500 mb-2 italic tracking-widest">Matriz de Abastecimiento</label>
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[8px] uppercase font-bold text-gray-400 mb-1">Cambiar / Agregar Proveedor</label>
                      <select 
                        value={editando.proveedorId || ''} 
                        onChange={e => setEditando({...editando, proveedorId: e.target.value})} 
                        className="w-full text-xs font-bold bg-gray-50 border-none rounded-xl px-3 py-4"
                      >
                        <option value="">Seleccionar Proveedor...</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-gray-400 mb-1">Días Corridos (Planificación)</label>
                      <input 
                        type="number"
                        value={(editando as any).leadTimeDays || ''} 
                        onChange={e => setEditando({...editando, leadTimeDays: e.target.value ? parseInt(e.target.value) : null} as any)} 
                        placeholder="Ej: 7"
                        className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-gray-400 mb-1">Descripción Entrega</label>
                      <input 
                        value={(editando as any).tiempoEntrega || ''} 
                        onChange={e => setEditando({...editando, tiempoEntrega: e.target.value} as any)} 
                        placeholder="Ej: 7 días habiles..."
                        className="w-full text-xs font-bold border-b border-gray-100 py-2 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {/* Lista de Abastecedores Actuales */}
                  {editando.proveedores && editando.proveedores.length > 0 && (
                    <div className="bg-indigo-50/30 rounded-2xl p-4 border border-indigo-100/50 space-y-2">
                       <div className="text-[9px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Fuentes de Suministro Autorizadas</div>
                       {editando.proveedores.map(ip => (
                         <div key={ip.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-50 shadow-sm">
                            <div className="flex items-center gap-2">
                               <span className="text-xs font-black text-gray-700">{ip.proveedor?.nombre}</span>
                               {ip.esPrincipal && <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Principal</span>}
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <div className="text-[9px] text-gray-400 font-bold uppercase italic leading-none">
                                     Ref: {ip.codigoReferencia || 'S/D'}
                                  </div>
                                  {ip.tiempoEntrega && (
                                    <div className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded mt-1 font-bold uppercase tracking-tighter">
                                       🕒 {ip.tiempoEntrega}
                                    </div>
                                  )}
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50/50 p-6 rounded-3xl space-y-4 border border-gray-50">
                 <div className="grid grid-cols-3 gap-4">
                   <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Gramaje</label><input type="number" value={editando.gramaje || ''} onChange={e => setEditando({...editando, gramaje: e.target.value ? parseInt(e.target.value) : null})} className="w-full text-xs font-black bg-white rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" /></div>
                   <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Ancho (m)</label><input type="number" step="0.01" value={editando.ancho || ''} onChange={e => setEditando({...editando, ancho: e.target.value ? parseFloat(e.target.value) : null})} className="w-full text-xs font-black bg-white rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" /></div>
                   <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Color</label><input value={editando.color || ''} onChange={e => setEditando({...editando, color: e.target.value})} className="w-full text-xs font-black bg-white rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" /></div>
                 </div>
                 <div><label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Composición</label><input value={editando.composicion || ''} onChange={e => setEditando({...editando, composicion: e.target.value})} className="w-full text-xs font-black bg-white rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none" /></div>
                 
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] uppercase font-black text-gray-400">Muestra</label>
                      <div onClick={() => !editando.fotoUrl && document.getElementById('file-edit-foto')?.click()} className="aspect-square bg-white border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-indigo-200 transition-all">
                        {subiendoImg === 'fotoUrl' ? <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : 
                          editando.fotoUrl ? (
                            <div className="w-full h-full relative">
                              <img src={editando.fotoUrl} className="w-full h-full object-cover" />
                              <button type="button" onClick={(e) => { e.stopPropagation(); setEditando({...editando, fotoUrl: null}) }} className="absolute top-1 right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[10px]">✕</button>
                            </div>
                          ) : <span className="text-lg grayscale">📸</span>
                        }
                        <input id="file-edit-foto" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubirArchivo('fotoUrl', e.target.files[0], true)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] uppercase font-black text-gray-400">Etiqueta</label>
                      <div onClick={() => !editando.fichaTecnicaUrl && document.getElementById('file-edit-ficha')?.click()} className="aspect-square bg-white border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-indigo-200 transition-all">
                        {subiendoImg === 'fichaTecnicaUrl' ? <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : 
                          editando.fichaTecnicaUrl ? (
                            <div className="w-full h-full relative">
                              <img src={editando.fichaTecnicaUrl} className="w-full h-full object-cover" />
                              <button type="button" onClick={(e) => { e.stopPropagation(); setEditando({...editando, fichaTecnicaUrl: null}) }} className="absolute top-1 right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[10px]">✕</button>
                            </div>
                          ) : <span className="text-lg grayscale">🏷️</span>
                        }
                        <input id="file-edit-ficha" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleSubirArchivo('fichaTecnicaUrl', e.target.files[0], true)} />
                      </div>
                    </div>
                  </div>
              </div>
              <button type="submit" disabled={mutacionGuardar.isPending} className="w-full bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.3em] py-5 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">{mutacionGuardar.isPending ? 'Sincronizando...' : 'Actualizar Ficha Técnica'}</button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL TRAZABILIDAD */}
      {evaluando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEvaluando(null)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">{evaluando.nombre}</h2>
                <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest flex gap-3 mt-1">
                  <span>SKU: {evaluando.codigoInterno || 'N/A'}</span>
                  <span>•</span>
                  <span>{evaluando.categoria}</span>
                  <span>•</span>
                  <span>PROVEEDOR: {evaluando.proveedor?.nombre || 'S/D'}</span>
                  {evaluando.proveedores?.find(p => p.esPrincipal)?.tiempoEntrega && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-400">ENTREGA: {evaluando.proveedores.find(p => p.esPrincipal)?.tiempoEntrega}</span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setEvaluando(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 border border-gray-100 hover:shadow-md transition-all">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
               {!trazabilidad ? (
                  <div className="text-center py-20 text-gray-400 text-sm italic animate-pulse font-medium">Cargando trazabilidad técnica...</div>
               ) : (
                  <div className="flex flex-col gap-10">
                    {/* Ficha de Trazabilidad de Stock (Nueva - Arriba o lateral) */}
                    <div className="w-full">
                       <StockTraceabilityCard insumoId={evaluando.id} title="Historial de Movimientos Auditados" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Columna Historial de Precios */}
                    <div>
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100">💰</div>
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Historial de Costos</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trazabilidad de compras</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                         {trazabilidad.historial.map((h: any, idx: number) => (
                           <div key={h.id} className="flex flex-col p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all relative overflow-hidden group">
                               {idx === 0 && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-widest">Vigente</div>}
                               <div className="flex justify-between items-center mb-2">
                                 <div className="text-2xl font-black text-emerald-600 tracking-tighter">${h.costo.toLocaleString('es-AR')}</div>
                                 <div className="text-xs font-bold text-gray-400">{new Date(h.fechaDesde).toLocaleDateString('es-AR')}</div>
                               </div>
                               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{h.motivo || 'Actualización de Sistema'}</div>
                           </div>
                         ))}
                         {trazabilidad.historial.length === 0 && <div className="text-xs text-gray-400 italic text-center py-10">No hay registros de costos.</div>}
                      </div>
                    </div>

                    {/* Columna Uso en Productos */}
                    <div>
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm border border-indigo-100">🧵</div>
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">BOM (Fichas Técnicas)</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Productos que lo utilizan</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {trazabilidad.usos.map((u: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 transition-colors shadow-sm">
                             <div>
                               <div className="text-sm font-black text-gray-900 uppercase tracking-tight">{u.producto.nombre}</div>
                               <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{u.producto.categoria?.nombre || 'General'}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Consumo</div>
                               <div className="text-xs font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                                 {u.consumo} <span className="text-[10px] font-bold text-gray-500">{evaluando.unidad || 'und'}</span>
                               </div>
                             </div>
                           </div>
                        ))}
                        {trazabilidad.usos.length === 0 && (
                          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                            <span className="text-3xl grayscale opacity-50 block mb-2">📦</span>
                            <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Insumo Huérfano</div>
                            <div className="text-[10px] text-gray-400 mt-1">Este insumo no está asignado a ninguna ficha técnica.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
               )}
            </div>
          </div>
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Auditoría Industrial UniFAI v4.0</p>
          </div>
        </div>
      )}
    </div>
  )
}
