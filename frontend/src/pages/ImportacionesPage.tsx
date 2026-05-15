import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Upload,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Box,
  Tag,
  DollarSign,
  ChevronDown,
  Download,
  Info
} from 'lucide-react'

// ─── Tipos de importación disponibles ────────────────────────────────────────
const TIPOS_IMPORT = [
  {
    id: 'INSUMOS',
    label: 'Insumos y Materiales',
    desc: 'Telas, costuras, accesorios y materias primas con stock inicial.',
    icon: <Box size={20} />,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    columnas: ['tipo', 'categoria', 'nombre', 'unidad', 'stockActual', 'stockMinimo', 'costo', 'codigoBarra']
  },
  {
    id: 'PRODUCTOS',
    label: 'Catálogo de Productos',
    desc: 'Productos terminados o semiarmados con precios por segmento.',
    icon: <Tag size={20} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    columnas: ['nombre', 'categoria', 'tipo', 'codigoBarra', 'codigoProveedor', 'costoProveedor', 'precioFinal', 'precioRevendedor', 'precioEmpresa']
  },
  {
    id: 'PRECIOS',
    label: 'Lista de Precios',
    desc: 'Actualización masiva de precios para productos existentes.',
    icon: <DollarSign size={20} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    columnas: ['codigoBarra', 'nombre', 'precioFinal', 'precioRevendedor', 'precioEmpresa', 'precioRevendido']
  }
]

// ─── Status badge ─────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PENDIENTE:  { label: 'Pendiente de revisión', icon: <Clock size={11} />,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
    REVISADO:   { label: 'En revisión',            icon: <AlertCircle size={11} />,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
    EJECUTADO:  { label: 'Cargado al sistema',     icon: <CheckCircle2 size={11} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    ERROR:      { label: 'Error en carga',         icon: <XCircle size={11} />,      color: 'text-rose-600 bg-rose-50 border-rose-200' },
  }
  const cfg = map[estado] || map['PENDIENTE']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ImportacionesPage() {
  const qc = useQueryClient()
  const [tipoSel, setTipoSel] = useState('INSUMOS')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showColumnas, setShowColumnas] = useState(false)

  const tipoInfo = TIPOS_IMPORT.find(t => t.id === tipoSel)!

  const { data: misArchivos = [], isLoading } = useQuery({
    queryKey: ['mis-importaciones'],
    queryFn: () => api.get('/importaciones/mis-archivos').then(r => r.data)
  })

  const uploadMut = useMutation({
    mutationFn: () => {
      if (!archivo) throw new Error('Seleccioná un archivo primero')
      const form = new FormData()
      form.append('archivo', archivo)
      form.append('tipo', tipoSel)
      return api.post('/importaciones/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-importaciones'] })
      toast.success('✅ Archivo recibido. Te avisaremos cuando esté cargado.')
      setArchivo(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al subir el archivo')
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSet(file)
  }

  const validateAndSet = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('Solo se aceptan archivos .xlsx, .xls o .csv')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10MB')
      return
    }
    setArchivo(file)
  }

  const handleDownloadTemplate = () => {
    const header = tipoInfo.columnas.join(',')
    const example = tipoInfo.columnas.map(c => `Ejemplo_${c}`).join(',')
    const csvContent = header + '\n' + example
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Plantilla_${tipoInfo.id}_Unifai.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">

      {/* ── Header ── */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Upload className="text-white" size={20} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Carga de Datos</h1>
        </div>
        <p className="text-sm text-gray-400 font-bold ml-[52px]">
          Subí tus planillas de Excel o CSV. El equipo de Unifai las revisará y las cargará al sistema en forma segura.
        </p>
      </header>

      {/* ── Info Banner ── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 flex gap-4 items-start">
        <Info size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-black text-indigo-800">¿Cómo funciona?</p>
          <p className="text-[11px] text-indigo-600 leading-relaxed font-medium">
            Tu planilla <b>no se carga automáticamente</b>. Queda en revisión técnica para asegurarnos de que los datos queden perfectos. El proceso demora entre 24 y 48 horas hábiles. Te notificaremos cuando esté listo.
          </p>
        </div>
      </div>

      {/* ── Selector de Tipo ── */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          ¿Qué tipo de datos vas a subir?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIPOS_IMPORT.map(t => (
            <div
              key={t.id}
              onClick={() => setTipoSel(t.id)}
              className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
                tipoSel === t.id ? `${t.bg} ${t.border}` : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`mb-3 ${tipoSel === t.id ? t.color : 'text-gray-300'}`}>{t.icon}</div>
              <p className={`text-xs font-black mb-1 ${tipoSel === t.id ? 'text-gray-900' : 'text-gray-500'}`}>{t.label}</p>
              <p className={`text-[10px] leading-relaxed ${tipoSel === t.id ? 'text-gray-600' : 'text-gray-400'}`}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Columnas requeridas ── */}
      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
        <button
          onClick={() => setShowColumnas(!showColumnas)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={16} className="text-gray-400" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
              Columnas requeridas para: {tipoInfo.label}
            </span>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showColumnas ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showColumnas && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 space-y-3">
                <p className="text-[10px] text-gray-400 font-bold">
                  La primera fila de tu planilla debe tener exactamente estos encabezados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tipoInfo.columnas.map(col => (
                    <span key={col} className={`text-[10px] font-black ${tipoInfo.color} ${tipoInfo.bg} px-3 py-1 rounded-lg border ${tipoInfo.border} font-mono`}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 font-bold italic">
                  * Las columnas adicionales (como notas o códigos internos) serán revisadas y mapeadas manualmente por el equipo.
                </p>
                <button type="button" onClick={handleDownloadTemplate} className="mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-5 py-2.5 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                   <Download size={14} />
                   Descargar Modelo CSV (.csv)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zona de Upload ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : archivo
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
        }`}
      >
        {archivo ? (
          <div className="space-y-3">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <FileSpreadsheet size={28} className="text-emerald-600" />
            </div>
            <p className="font-black text-emerald-700 text-sm">{archivo.name}</p>
            <p className="text-[10px] text-emerald-500 font-bold">{(archivo.size / 1024).toFixed(0)} KB</p>
            <button
              onClick={() => setArchivo(null)}
              className="text-[10px] font-black text-rose-400 hover:text-rose-600 underline"
            >
              Cambiar archivo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
              <Upload size={28} className="text-gray-400" />
            </div>
            <div>
              <p className="font-black text-gray-700 text-sm mb-1">Arrastrá tu planilla aquí</p>
              <p className="text-[10px] text-gray-400 font-bold">o hacé clic para buscarla</p>
            </div>
            <p className="text-[9px] text-gray-300 font-bold">Formatos aceptados: .xlsx · .xls · .csv · Max. 10MB</p>
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && validateAndSet(e.target.files[0])}
              />
              <span className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                Seleccionar Archivo
              </span>
            </label>
          </div>
        )}
      </div>

      {/* ── Botón Upload ── */}
      {archivo && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => uploadMut.mutate()}
          disabled={uploadMut.isPending}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
        >
          {uploadMut.isPending ? 'Enviando archivo...' : `Enviar Planilla de ${tipoInfo.label}`}
        </motion.button>
      )}

      {/* ── Historial de Archivos ── */}
      {misArchivos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            Historial de Archivos Enviados
          </h2>
          <div className="space-y-3">
            {misArchivos.map((imp: any) => (
              <div key={imp.id} className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                    <FileSpreadsheet size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 mb-0.5">{imp.nombre}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">
                      {imp.tipo} · {new Date(imp.creadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoBadge estado={imp.estado} />
                  {imp.notas && imp.estado === 'EJECUTADO' && (
                    <p className="text-[9px] text-emerald-600 font-bold max-w-[200px] text-right">{imp.notas}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
