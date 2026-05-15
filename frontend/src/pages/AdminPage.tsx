import { useState, useEffect } from 'react'
import { formatCurrency } from '../lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configuracionApi, empresaApi, api } from '../lib/api'
import { Building2, Save, Image as ImageIcon, Globe, Upload } from 'lucide-react'
import { toast } from 'sonner'

const MOVIMIENTOS_DEMO = [
  { id: '1', fecha: '2025-03-28', concepto: 'Cobro Silos — seña pedido 14', cuenta: 'Caja ahorro',      importe:  500000, tipo: 'COBRO' },
  { id: '2', fecha: '2025-03-25', concepto: 'Pago NORTEXTIL — telas',        cuenta: 'Cta. corriente', importe: -280000, tipo: 'PAGO_PROVEEDOR' },
  { id: '3', fecha: '2025-03-22', concepto: 'Cobro Vicenta — saldo ord. 12', cuenta: 'Caja ahorro',      importe:  230000, tipo: 'COBRO' },
  { id: '4', fecha: '2025-03-20', concepto: 'Sueldos taller — quincena',     cuenta: 'Cta. corriente', importe: -190000, tipo: 'GASTO' },
  { id: '5', fecha: '2025-03-18', concepto: 'Cobro San Ignacio',             cuenta: 'Efectivo',       importe:  145000, tipo: 'COBRO' },
  { id: '6', fecha: '2025-03-15', concepto: 'Insumos bordado',               cuenta: 'Cta. corriente', importe:  -42000, tipo: 'GASTO' },
]

const TIPO_MOV_COLOR: Record<string, string> = {
  COBRO:          'text-teal-600',
  PAGO_PROVEEDOR: 'text-red-500',
  GASTO:          'text-orange-500',
  SENIA:          'text-blue-500',
  TRANSFERENCIA:  'text-purple-500',
}

const TIPOS_MOV = ['COBRO', 'PAGO_PROVEEDOR', 'GASTO', 'SENIA', 'TRANSFERENCIA']
const CUENTAS   = ['Caja ahorro', 'Cta. corriente', 'Efectivo']

export function AdminPage() {
  const qc = useQueryClient()
  const [movimientos, setMovimientos] = useState(MOVIMIENTOS_DEMO)
  const [filtro, setFiltro] = useState('')

  // Form nuevo movimiento
  const [tipo, setTipo]         = useState('COBRO')
  const [cuenta, setCuenta]     = useState('Caja ahorro')
  const [concepto, setConcepto] = useState('')
  const [importe, setImporte]   = useState('')
  
  // Variables Económicas (Dólar)
  const [dolarInput, setDolarInput] = useState('')

  const { data: rawConfig = {} } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get
  })

  useEffect(() => {
    if (rawConfig.COTIZACION_DOLAR) {
      setDolarInput(rawConfig.COTIZACION_DOLAR)
    }
  }, [rawConfig])

  const cfgMutacion = useMutation({
    mutationFn: (data: any) => configuracionApi.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion'] })
  })

  const handleDolarUpdate = () => {
    if (!dolarInput) return
    cfgMutacion.mutate({ COTIZACION_DOLAR: dolarInput })
  }

  // Perfil Empresa
  const { data: empresa } = useQuery({
    queryKey: ['mi-empresa'],
    queryFn: () => empresaApi.getMe()
  })

  const [nombreFantasia, setNombreFantasia] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (empresa) {
       setNombreFantasia(empresa.nombre)
       setLogoUrl(empresa.logoUrl || '')
    }
  }, [empresa])

  const empresaMut = useMutation({
    mutationFn: (data: any) => empresaApi.updateMe(data),
    onSuccess: () => {
       qc.invalidateQueries({ queryKey: ['mi-empresa'] })
       toast.success('Perfil actualizado correctamente')
    }
  })

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
     
     const formData = new FormData()
     formData.append('image', file)

     try {
       // Usamos el cliente API estandarizado para que inyecte el token correctamente
       const res = await api.post('/upload', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
       })
       
       if (res.data.url) {
         setLogoUrl(res.data.url)
         toast.success('Logo subido. No olvides guardar cambios.')
       }
     } catch (err) {
       console.error('Error subiendo logo:', err)
       toast.error('Error al subir logo')
     }
  }

  const total = movimientos.reduce((acc, m) => acc + m.importe, 0)
  const cobros = movimientos.filter(m => m.importe > 0).reduce((acc, m) => acc + m.importe, 0)
  const egresos = movimientos.filter(m => m.importe < 0).reduce((acc, m) => acc + m.importe, 0)

  function registrar() {
    if (!concepto || !importe) return
    const signo = ['COBRO', 'SENIA'].includes(tipo) ? 1 : -1
    setMovimientos(m => [{
      id: String(Date.now()),
      fecha: new Date().toISOString().split('T')[0],
      concepto, cuenta,
      importe: Math.abs(Number(importe)) * signo,
      tipo,
    }, ...m])
    setConcepto('')
    setImporte('')
  }

  const visibles = filtro
    ? movimientos.filter(m => m.concepto.toLowerCase().includes(filtro.toLowerCase()) || m.cuenta.includes(filtro))
    : movimientos

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">
      <div>
        <h1 className="text-lg font-medium text-gray-900">Administración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestión financiera y perfil corporativo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         {/* Perfil de Empresa */}
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
               <Building2 className="text-indigo-600" size={18}/>
               <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Identidad Corporativa</h2>
            </div>
            
            <div className="flex gap-6 items-start">
               <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
                     {logoUrl ? (
                        <img src={logoUrl} className="w-full h-full object-contain p-2" />
                     ) : (
                        <ImageIcon className="text-gray-300" size={32} />
                     )}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Upload className="text-white" size={20} />
                        <input type="file" onChange={handleUploadLogo} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                  </div>
                  <p className="text-[10px] text-center text-gray-400 font-bold mt-2 uppercase">Logo (PNG/JPG)</p>
               </div>

               <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Nombre de Fantasía</label>
                    <input 
                       value={nombreFantasia}
                       onChange={e => setNombreFantasia(e.target.value)}
                       className="w-full text-sm bg-gray-50 border-none rounded-lg px-3 py-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                       placeholder="Ej: Confecciones El Sol"
                    />
                  </div>
                  <button 
                    onClick={() => empresaMut.mutate({ nombre: nombreFantasia, logoUrl })}
                    disabled={empresaMut.isPending || (nombreFantasia === empresa?.nombre && logoUrl === empresa?.logoUrl)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                  >
                    <Save size={14} />
                    {empresaMut.isPending ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                  </button>
               </div>
            </div>
         </div>

         {/* Variables Económicas */}
         <div className="bg-indigo-900 rounded-xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
           <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 font-bold">$</div>
           <div>
             <div className="text-[10px] font-black tracking-widest uppercase text-indigo-300 mb-0.5">Multimoneda</div>
             <div className="text-sm font-black flex items-center gap-2"><Globe size={14}/> Cotización Reference</div>
           </div>
           <div className="mt-4 flex gap-2">
             <div className="relative flex-1">
               <span className="absolute left-2.5 top-2 text-xs font-bold text-indigo-400">ARS</span>
               <input 
                 value={dolarInput}
                 onChange={e => setDolarInput(e.target.value)}
                 placeholder="1000.00"
                 className="w-full bg-white/10 border border-white/20 rounded-lg text-sm font-mono pl-10 py-1.5 focus:outline-none focus:bg-white/20 transition-all placeholder:text-indigo-400/50"
               />
             </div>
             <button 
               onClick={handleDolarUpdate}
               disabled={cfgMutacion.isPending || dolarInput === rawConfig.COTIZACION_DOLAR}
               className="bg-indigo-500 hover:bg-indigo-400 px-4 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50"
             >
               {cfgMutacion.isPending ? '⏳' : 'ACTUALIZAR'}
             </button>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Widget Variables Económicas */}
        <div className="bg-indigo-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 font-bold">$</div>
          <div>
            <div className="text-[10px] font-black tracking-widest uppercase text-indigo-300 mb-0.5">Multimoneda</div>
            <div className="text-sm font-medium">Cotización Reference</div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-indigo-400">ARS</span>
              <input 
                value={dolarInput}
                onChange={e => setDolarInput(e.target.value)}
                placeholder="1000.00"
                className="w-full bg-white/10 border border-white/20 rounded-lg text-sm font-mono pl-10 py-1.5 focus:outline-none focus:bg-white/20 transition-all placeholder:text-indigo-400/50"
              />
            </div>
            <button 
              onClick={handleDolarUpdate}
              disabled={cfgMutacion.isPending || dolarInput === rawConfig.COTIZACION_DOLAR}
              className="bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {cfgMutacion.isPending ? '⏳' : 'OK'}
            </button>
          </div>
        </div>

        {/* Métricas */}
        {[
          { label: 'Ingresos Brutos',          val: cobros,   color: 'text-teal-600' },
          { label: 'Egresos Período',           val: Math.abs(egresos), color: 'text-red-500' },
          { label: 'Caja Resultante', val: total,    color: total >= 0 ? 'text-teal-600' : 'text-red-500' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{m.label}</div>
            <div className={`text-2xl font-mono tracking-tight ${m.color}`}>
              {total < 0 && m.label === 'Caja Resultante' ? '-' : ''}{formatCurrency(Math.abs(m.val))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Formulario imputación */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm font-medium text-gray-900 mb-4">Registrar movimiento</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tipo de Operación</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-300 transition-colors cursor-pointer">
                  {TIPOS_MOV.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cuenta Imputación</label>
                <select value={cuenta} onChange={e => setCuenta(e.target.value)}
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-300 transition-colors cursor-pointer">
                  {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Descripción / Concepto</label>
                <input value={concepto} onChange={e => setConcepto(e.target.value)}
                  placeholder="Seña pedido..."
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-300 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Importe Exacto (ARS)</label>
                <input type="number" value={importe} onChange={e => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-300 transition-colors font-mono" />
              </div>
              <button
                onClick={registrar}
                disabled={!concepto || !importe}
                className="w-full py-3.5 mt-2 text-[10px] uppercase font-black tracking-widest bg-gray-900 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="text-sm font-medium text-gray-900">Historial Diario</div>
              <input
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                placeholder="🔎 Buscar..."
                className="text-xs border border-gray-100 rounded-lg bg-gray-50 px-3 py-2 w-48 focus:bg-white focus:outline-none focus:border-indigo-300 transition-colors"
              />
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50 sticky top-0">
                    <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Fecha</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Concepto</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Cuenta</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibles.map(m => (
                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-xs font-medium">{m.concepto}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{m.cuenta}</td>
                      <td className={`px-5 py-3.5 text-right font-medium font-mono text-xs ${TIPO_MOV_COLOR[m.tipo]}`}>
                        {m.importe > 0 ? '+' : ''}{formatCurrency(m.importe)}
                      </td>
                    </tr>
                  ))}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-medium">No hay registros</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

