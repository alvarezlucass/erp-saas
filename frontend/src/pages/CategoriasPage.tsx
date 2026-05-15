import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasApi, tallesApi, type Categoria } from '../lib/api'
import { Toaster, toast } from 'react-hot-toast'

// ─── Mini-form para crear curva inline ───────────────────────────────────────
function NuevaCurvaInline({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [items, setItems] = useState('')

  const mut = useMutation({
    mutationFn: (data: any) => tallesApi.crear(data),
    onSuccess: (curva) => {
      qc.invalidateQueries({ queryKey: ['curvas'] })
      toast.success(`Curva "${curva.nombre}" creada`)
      onCreated(curva.id)
      setOpen(false)
      setNombre('')
      setItems('')
    },
    onError: () => toast.error('No se pudo crear la curva')
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all whitespace-nowrap"
      >
        + Nueva
      </button>
    )
  }

  return (
    <div className="mt-3 bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 space-y-3">
      <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Nueva curva de talles</p>
      <input
        autoFocus
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Ej: Niños 2-16"
        className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <input
        value={items}
        onChange={e => setItems(e.target.value)}
        placeholder="2, 4, 6, 8, 10, 12, 14, 16"
        className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!nombre || !items || mut.isPending}
          onClick={() => mut.mutate({ nombre, items: items.split(',').map(i => i.trim()).filter(Boolean) })}
          className="flex-1 bg-indigo-600 text-white text-[9px] font-black uppercase py-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40"
        >
          {mut.isPending ? 'Creando...' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[9px] font-black text-gray-400 uppercase px-3"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Grilla de medidas tipo hoja de datos ─────────────────────────────────────
function GrillaMedidas({
  editId,
  categorias,
  curvas,
  matrizBase,
  setMatrizBase,
  selectedCurvaId,
  setSelectedCurvaId,
  onSave,
  isSaving,
}: {
  editId: string
  categorias: Categoria[]
  curvas: any[]
  matrizBase: Record<string, Record<string, string>>
  setMatrizBase: (m: Record<string, Record<string, string>>) => void
  selectedCurvaId: string
  setSelectedCurvaId: (id: string) => void
  onSave: () => void
  isSaving: boolean
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const cat = categorias.find(c => c.id === editId)
  const parentCat = cat?.parentId ? categorias.find(p => p.id === cat.parentId) : null
  const puntosRef = (cat?.puntosReferencia?.length ? cat.puntosReferencia : parentCat?.puntosReferencia) || []
  const curvaSeleccionada = curvas.find(c => c.id === selectedCurvaId)

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    puntoIdx: number,
    talleIdx: number,
    totalPuntos: number,
    totalTalles: number
  ) => {
    let nextPunto = puntoIdx
    let nextTalle = talleIdx
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      e.preventDefault()
      nextTalle = (talleIdx + 1) % totalTalles
      if (nextTalle === 0) nextPunto = (puntoIdx + 1) % totalPuntos
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nextTalle = talleIdx - 1
      if (nextTalle < 0) { nextTalle = totalTalles - 1; nextPunto = (puntoIdx - 1 + totalPuntos) % totalPuntos }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      nextPunto = (puntoIdx + 1) % totalPuntos
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nextPunto = (puntoIdx - 1 + totalPuntos) % totalPuntos
    }
    const key = `${nextPunto}-${nextTalle}`
    inputRefs.current[key]?.focus()
  }, [])

  return (
    <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
      {/* Header de la grilla */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
          <div>
            <p className="text-xs font-black uppercase text-gray-900 tracking-tight">
              Especificaciones de Medidas — <span className="text-indigo-600">{cat?.nombre}</span>
            </p>
            <p className="text-[9px] text-gray-400 font-medium mt-0.5">
              {puntosRef.length} puntos de medición · navigate con Tab / Flechas
            </p>
          </div>
        </div>

        {/* Selector de curva + crear inline */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1.5 tracking-widest">
              Curva de referencia
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedCurvaId}
                onChange={e => setSelectedCurvaId(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Seleccionar curva...</option>
                {curvas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <NuevaCurvaInline onCreated={id => setSelectedCurvaId(id)} />
            </div>
            {/* mini form para nueva curva se renderiza debajo */}
          </div>
        </div>
      </div>

      {puntosRef.length === 0 && (
        <div className="px-8 py-12 text-center">
          <p className="text-sm font-black uppercase text-gray-200 tracking-widest">
            Este template no tiene puntos de medición definidos
          </p>
          <p className="text-xs text-gray-300 mt-2">Editá el template y agregá los puntos de medición primero</p>
        </div>
      )}

      {puntosRef.length > 0 && !curvaSeleccionada && (
        <div className="px-8 py-12 text-center">
          <p className="text-sm font-black uppercase text-gray-200 tracking-widest">
            Seleccioná una curva para cargar las medidas
          </p>
        </div>
      )}

      {puntosRef.length > 0 && curvaSeleccionada && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-r border-gray-100 min-w-[160px]">
                    Punto de Medición
                  </th>
                  {curvaSeleccionada.items.map((t: any) => (
                    <th
                      key={t.id}
                      className="px-4 py-4 text-center text-[11px] font-black uppercase text-white bg-indigo-600 border-b border-indigo-500 min-w-[80px]"
                    >
                      {t.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {puntosRef.map((punto: any, pi: number) => (
                  <tr
                    key={punto.id}
                    className={pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                  >
                    <td className="sticky left-0 z-10 px-6 py-3 text-[11px] font-black text-gray-700 border-r border-gray-100 bg-inherit whitespace-nowrap">
                      {punto.nombre}
                    </td>
                    {curvaSeleccionada.items.map((t: any, ti: number) => {
                      const cellKey = `${pi}-${ti}`
                      const val = matrizBase[t.nombre]?.[punto.id] || ''
                      return (
                        <td key={t.id} className="px-2 py-1.5">
                          <input
                            ref={el => { inputRefs.current[cellKey] = el }}
                            type="number"
                            step="0.1"
                            min="0"
                            value={val}
                            onChange={e => {
                              const next = { ...matrizBase }
                              if (!next[t.nombre]) next[t.nombre] = {}
                              next[t.nombre] = { ...next[t.nombre], [punto.id]: e.target.value }
                              setMatrizBase(next)
                            }}
                            onKeyDown={e => handleKeyDown(
                              e, pi, ti,
                              puntosRef.length,
                              curvaSeleccionada.items.length
                            )}
                            placeholder="—"
                            className={`
                              w-full text-center text-[11px] font-bold rounded-lg py-2 px-1 outline-none border
                              transition-all
                              ${val
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-800 focus:ring-2 focus:ring-indigo-300'
                                : 'bg-white border-gray-100 text-gray-400 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100'
                              }
                            `}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-5 flex items-center justify-between border-t border-gray-50 bg-gray-50/30">
            <p className="text-[9px] text-gray-400 font-medium italic">
              Los valores ingresados se guardan como referencia maestra del template
            </p>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md disabled:opacity-40 active:scale-95"
            >
              {isSaving ? 'Guardando...' : '✓ Guardar Especificaciones'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function CategoriasPage() {
  const qc = useQueryClient()

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.listar
  })
  const { data: curvas = [] } = useQuery({ queryKey: ['curvas'], queryFn: tallesApi.listar })

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [puntos, setPuntos] = useState<string>('')
  const [editId, setEditId] = useState<string | null>(null)

  // Grilla state
  const [selectedCurvaId, setSelectedCurvaId] = useState('')
  const [matrizBase, setMatrizBase] = useState<Record<string, Record<string, string>>>({})
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [mostrandoQuickPadre, setMostrandoQuickPadre] = useState(false)
  const [nuevoPadreNombre, setNuevoPadreNombre] = useState('')
  const [nuevoPadrePuntos, setNuevoPadrePuntos] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) => editId ? categoriasApi.editar(editId, data) : categoriasApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      resetForm()
      toast.success(editId ? 'Template actualizado' : 'Template creado')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al guardar')
  })

  const inactivarMut = useMutation({
    mutationFn: (id: string) => categoriasApi.inactivar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Template inactivado') },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al inactivar')
  })

  const eliminarMut = useMutation({
    mutationFn: (id: string) => categoriasApi.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Eliminado correctamente') },
    onError: (err: any) => toast.error(err.response?.data?.error || 'No se puede eliminar: hay productos vinculados')
  })

  const saveMatrixMutation = useMutation({
    mutationFn: (data: any[]) => categoriasApi.guardarMedidasBase(editId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Especificaciones guardadas')
    },
    onError: () => toast.error('Error al guardar las especificaciones')
  })

  const resetForm = () => {
    setNombre(''); setDescripcion(''); setParentId(null)
    setPuntos(''); setEditId(null); setMatrizBase({})
    setPanelAbierto(false)
  }

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      nombre,
      descripcion,
      parentId,
      puntos: puntos.split(',').map(p => p.trim()).filter(p => p)
    })
  }

  const handleSaveMatrix = () => {
    if (!editId) return
    const payload: any[] = []
    Object.entries(matrizBase).forEach(([talle, pts]) => {
      Object.entries(pts).forEach(([puntoId, valor]) => {
        if (valor) payload.push({ talle, puntoId, valorCm: parseFloat(valor) })
      })
    })
    saveMatrixMutation.mutate(payload)
  }

  const abrirEdicion = (cat: Categoria) => {
    setEditId(cat.id)
    setNombre(cat.nombre)
    setDescripcion(cat.descripcion || '')
    setParentId(cat.parentId || null)
    setPuntos(cat.puntosReferencia?.map(p => p.nombre).join(', ') || '')
    const m: any = {}
    cat.medidasBase?.forEach((mb: any) => {
      if (!m[mb.talle]) m[mb.talle] = {}
      m[mb.talle][mb.puntoId] = mb.valorCm.toString()
    })
    setMatrizBase(m)
    setPanelAbierto(true)
    // Scroll suave al panel
    setTimeout(() => document.getElementById('panel-edicion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleCrearPadreRapido = async () => {
    if (!nuevoPadreNombre) return
    try {
      const nueva = await categoriasApi.crear({
        nombre: nuevoPadreNombre,
        puntos: nuevoPadrePuntos.split(',').map(p => p.trim()).filter(p => p)
      })
      qc.invalidateQueries({ queryKey: ['categorias'] })
      setParentId(nueva.id)
      setMostrandoQuickPadre(false)
      setNuevoPadreNombre('')
      setNuevoPadrePuntos('')
      toast.success(`Dependencia "${nueva.nombre}" creada y vinculada`)
    } catch (err) {
      toast.error('Error al crear la dependencia')
    }
  }

  if (isLoading) return (
    <div className="p-10 text-center font-black uppercase text-indigo-500 animate-pulse tracking-widest">
      Sincronizando PDM maestro...
    </div>
  )

  const masterCategories = categorias.filter(c => !c.parentId)

  return (
    <div className="max-w-7xl mx-auto pb-32 px-6">
      <Toaster position="bottom-right" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Gestión de Talles
          </h1>
          <p className="text-[11px] text-indigo-500 font-black uppercase tracking-[0.4em] mt-3 bg-indigo-50 w-fit px-3 py-1 rounded-lg italic">
            Definición Industrial · Modelos y Variantes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── FORMULARIO lateral ── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-lg sticky top-8">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-7 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              {editId ? 'Editando Template' : 'Nuevo Template Maestro'}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-5">
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1.5 ml-1">
                  Nombre del Modelo / Estilo
                </label>
                <input
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Chomba Piquet"
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1.5 ml-1">
                  Dependencia (estilo hijo de)
                </label>
                <div className="flex gap-2">
                  <select
                    value={parentId || ''}
                    onChange={e => setParentId(e.target.value || null)}
                    className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Modelo Principal (Master)</option>
                    {masterCategories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setMostrandoQuickPadre(!mostrandoQuickPadre)}
                    className={`px-4 rounded-2xl transition-all font-black text-lg ${mostrandoQuickPadre ? 'bg-red-50 text-red-500' : 'bg-indigo-600 text-white shadow-lg'}`}
                  >
                    {mostrandoQuickPadre ? '✕' : '+'}
                  </button>
                </div>

                {mostrandoQuickPadre && (
                  <div className="mt-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest italic">Nueva Dependencia Maestra</p>
                    <input 
                      value={nuevoPadreNombre}
                      onChange={e => setNuevoPadreNombre(e.target.value)}
                      placeholder="Nombre (ej: CALZADO, ACCESORIO)"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <input 
                      value={nuevoPadrePuntos}
                      onChange={e => setNuevoPadrePuntos(e.target.value)}
                      placeholder="Puntos de medición (sep. por coma)"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button 
                      type="button"
                      onClick={handleCrearPadreRapido}
                      className="w-full bg-indigo-600 text-white text-[10px] font-black uppercase py-3 rounded-xl hover:bg-indigo-700 shadow-md"
                    >
                      Registrar y Vincular
                    </button>
                  </div>
                )}
              </div>

              {!parentId && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 mb-1.5 ml-1">
                    Puntos de Medición (separados por coma)
                  </label>
                  <textarea
                    value={puntos}
                    onChange={e => setPuntos(e.target.value)}
                    placeholder="Sisa, Largo Total, Manga, Hombros..."
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-100 min-h-[90px]"
                  />
                  <p className="text-[9px] text-gray-400 mt-1.5 italic">
                    Los estilos hijos heredarán estos puntos automáticamente.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {editId && (
                  <button type="button" onClick={resetForm} className="flex-1 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Guardando...' : editId ? 'Actualizar Template' : 'Crear Template'}
                </button>
              </div>
            </form>

            {/* Botón para abrir/cerrar grilla de medidas cuando hay editId */}
            {editId && (
              <button
                type="button"
                onClick={() => setPanelAbierto(v => !v)}
                className="w-full mt-5 flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group"
              >
                <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">
                  📐 Cargar Especificaciones de Medidas
                </span>
                <span className="text-indigo-400 text-xs group-hover:text-indigo-600 transition-colors">
                  {panelAbierto ? '▲' : '▼'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── LISTADO + GRILLA ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Grilla de medidas (aparece cuando hay editId y panelAbierto) */}
          {editId && panelAbierto && (
            <div id="panel-edicion">
              <GrillaMedidas
                editId={editId}
                categorias={categorias}
                curvas={curvas}
                matrizBase={matrizBase}
                setMatrizBase={setMatrizBase}
                selectedCurvaId={selectedCurvaId}
                setSelectedCurvaId={setSelectedCurvaId}
                onSave={handleSaveMatrix}
                isSaving={saveMatrixMutation.isPending}
              />
            </div>
          )}

          {/* Tarjetas Master */}
          {masterCategories.map(master => (
            <div
              key={master.id}
              className={`bg-white rounded-2xl border transition-all ${
                editId === master.id
                  ? 'border-indigo-300 shadow-lg shadow-indigo-50'
                  : 'border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md'
              }`}
            >
              {/* Header del master */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter italic">
                    Master
                  </span>
                  <h2 className="text-base font-black text-gray-900 uppercase tracking-tight italic truncate">
                    {master.nombre}
                  </h2>
                </div>

                {/* Acciones del master */}
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button
                    title="Editar template"
                    onClick={() => editId === master.id ? resetForm() : abrirEdicion(master)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all ${
                      editId === master.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    ✎
                  </button>
                  <button
                    title="Inactivar template"
                    onClick={() => {
                      if (window.confirm(`¿Inactivar "${master.nombre}"? Dejará de aparecer en el sistema pero no se eliminará.`))
                        inactivarMut.mutate(master.id)
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-all"
                  >
                    ⊘
                  </button>
                  <button
                    title="Eliminar template"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${master.nombre}"? Esta acción no se puede deshacer.`))
                        eliminarMut.mutate(master.id)
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Puntos de medición */}
              {(master.puntosReferencia?.length ?? 0) > 0 && (
                <div className="px-6 py-3 flex flex-wrap gap-1.5 border-b border-gray-50">
                  {master.puntosReferencia?.map((p, i) => (
                    <span key={i} className="bg-gray-100 text-[9px] font-black uppercase text-gray-500 px-2 py-0.5 rounded-lg">
                      {p.nombre}
                    </span>
                  ))}
                </div>
              )}

              {/* Variantes de estilo */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categorias.filter(c => c.parentId === master.id).map(variant => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between bg-gray-50/60 rounded-xl px-4 py-3 border border-gray-100 group/v hover:border-indigo-100 hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                        <span className="text-xs font-black uppercase text-gray-700 tracking-tight italic truncate">
                          {variant.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/v:opacity-100 transition-opacity shrink-0 ml-2">
                        <button
                          onClick={() => editId === variant.id ? resetForm() : abrirEdicion(variant)}
                          className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la variante "${variant.nombre}"?`))
                              eliminarMut.mutate(variant.id)
                          }}
                          className="text-[9px] font-black text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => { resetForm(); setParentId(master.id) }}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-gray-100 text-[10px] font-black uppercase text-gray-300 hover:border-indigo-200 hover:text-indigo-400 transition-all"
                  >
                    + Agregar variante
                  </button>
                </div>
              </div>
            </div>
          ))}

          {masterCategories.length === 0 && (
            <div className="bg-white rounded-3xl p-24 border-2 border-dashed border-gray-100 text-center">
              <div className="text-4xl mb-5 grayscale opacity-20">📐</div>
              <p className="text-sm font-black uppercase text-gray-300 tracking-widest">
                No hay templates definidos en el PDM
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
