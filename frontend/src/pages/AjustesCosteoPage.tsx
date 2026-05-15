import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configuracionApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Package } from 'lucide-react'

const SEGMENTOS = [
  { id: 'final', label: 'Final', color: 'bg-emerald-500', icon: 'F' },
  { id: 'revendedor', label: 'Revendedor', color: 'bg-amber-500', icon: 'R' },
  { id: 'empresa', label: 'Empresa', color: 'bg-blue-500', icon: 'E' },
  { id: 'revendido', label: 'Revendido', color: 'bg-purple-500', icon: 'V' },
  { id: 'b', label: 'Bordado', color: 'bg-gray-900', icon: 'B' }
]

const MatrixRow = ({ 
  baseKey, 
  label, 
  form, 
  handleChange, 
  colorClass = "gray" 
}: { 
  baseKey: string, 
  label: string, 
  form: Record<string, string>,
  handleChange: (clave: string, valor: string) => void,
  colorClass?: "gray" | "red" | "indigo" 
}) => {
  const isRed = colorClass === "red"
  const isIndigo = colorClass === "indigo"
  
  return (
    <div className="py-6 border-b border-gray-50 last:border-0 group transition-all hover:bg-gray-50/50 px-4 -mx-4 rounded-2xl">
      <label className={`block text-xs font-black transition-colors uppercase tracking-widest mb-4 ${isRed ? 'text-red-400' : isIndigo ? 'text-indigo-400' : 'text-gray-400'}`}>
        {label}
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {SEGMENTOS.map(s => {
          const clave = `${baseKey}_${s.id}`
          const rawVal = form[clave] || '0'
          const val = parseFloat(rawVal) * 100
          
          return (
            <div key={s.id} className="relative group/cell">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isRed ? 'bg-red-50/50 border-red-50 focus-within:border-red-300' : isIndigo ? 'bg-indigo-50/50 border-indigo-50 focus-within:border-indigo-300' : 'bg-gray-50 border-gray-100 focus-within:border-gray-300'}`}>
                <span className={`text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white shadow-sm ${s.color}`}>{s.icon}</span>
                <input 
                  type="number" step="0.1" 
                  value={Number(val.toFixed(4)).toString()} 
                  onChange={e => {
                    const textValue = e.target.value;
                    if (textValue === '' || textValue === '-') {
                      handleChange(clave, '0');
                      return;
                    }
                    handleChange(clave, (parseFloat(textValue) / 100).toString());
                  }}
                  className={`w-full text-right text-sm font-black bg-transparent outline-none font-mono ${isRed ? 'text-red-700' : isIndigo ? 'text-indigo-700' : 'text-gray-900'}`}
                />
                <span className="text-[10px] font-bold text-gray-300">%</span>
              </div>
              <div className="absolute -top-2 left-8 bg-white px-1 text-[8px] font-black uppercase text-gray-300 tracking-tighter opacity-0 group-hover/cell:opacity-100 transition-opacity">
                {s.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AjustesCosteoPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: config = {}, isLoading } = useQuery({ 
    queryKey: ['configuracion'], 
    queryFn: configuracionApi.get 
  })

  const [form, setForm] = useState<Record<string, string>>({})
  const [perfil, setPerfil] = useState<'industrial' | 'retail'>('industrial')

  useEffect(() => {
    if (config) setForm(config)
  }, [config])

  const mutation = useMutation({
    mutationFn: (data: Record<string, string>) => configuracionApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      alert('Matriz de precios actualizada con éxito.')
    }
  })

  const handleChange = (clave: string, valor: string) => {
    setForm(prev => ({ ...prev, [clave]: valor }))
  }

  if (isLoading) return <div className="flex items-center justify-center h-full text-indigo-500 font-black uppercase text-sm animate-pulse">Sincronizando Matriz...</div>

  // Helper para obtener la clave correcta según el perfil
  const getK = (key: string) => perfil === 'retail' ? `retail_${key}` : key

  return (
    <div className="max-w-7xl mx-auto pb-32 px-6">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all border border-gray-100">←</button>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Matriz de Costeo</h1>
            <p className="text-[12px] text-indigo-500 font-black uppercase tracking-[0.4em] mt-3 bg-indigo-50 w-fit px-3 py-1 rounded-lg italic">Configuración Dual: Industrial & Retail</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right mr-4 hidden sm:block">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Perfil Activo</div>
              <div className={`text-xs font-black uppercase leading-none ${perfil === 'industrial' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                MODO {perfil.toUpperCase()}
              </div>
           </div>
           <button 
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="bg-gray-900 text-white text-sm font-black uppercase tracking-[0.3em] px-12 py-5 rounded-[1.5rem] hover:bg-indigo-600 transition-all shadow-2xl disabled:opacity-50 hover:-translate-y-1 active:translate-y-0"
          >
            {mutation.isPending ? 'Sincronizando...' : 'Guardar Matriz'}
          </button>
        </div>
      </div>

      {/* SELECTOR DE PERFIL (TABS) */}
      <div className="flex bg-[#1a1b1e] p-2 rounded-[2rem] border border-white/5 mb-10 shadow-2xl w-fit">
        <button 
          onClick={() => setPerfil('industrial')}
          className={`px-12 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${perfil === 'industrial' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <TrendingUp size={16} /> Perfil Industrial
        </button>
        <button 
          onClick={() => setPerfil('retail')}
          className={`px-12 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${perfil === 'retail' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Package size={16} /> Perfil Retail
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 mb-12 flex flex-wrap gap-12 border border-gray-100 shadow-xl items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-indigo-500 opacity-20" />
        <div className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] border-r border-gray-100 pr-12 hidden md:block italic">Perfiles de Simulación</div>
        <div className="flex gap-10">
          {SEGMENTOS.map(s => (
            <div key={s.id} className="flex items-center gap-4">
              <span className={`w-6 h-6 rounded-lg shadow-sm ${s.color} flex items-center justify-center text-white text-[10px] font-black`}>{s.icon}</span>
              <div>
                <div className="text-sm font-black uppercase text-gray-900 leading-none">{s.label}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Configuración específica</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] p-8 mb-12 flex flex-wrap gap-12 border border-emerald-100 shadow-xl items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-20" />
        <div className="text-xs font-black uppercase text-emerald-600 tracking-[0.2em] border-r border-emerald-100 pr-12 hidden md:block italic">Margen Neto Objetivo ({perfil === 'industrial' ? 'INDUSTRIAL' : 'RETAIL'})</div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
          {SEGMENTOS.filter(s => s.id !== 'b').map(s => {
            const clave = getK(`target_margin_pct_${s.id}`)
            const val = parseFloat(form[clave] || '0.35') * 100
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm transition-all ${perfil === 'retail' ? 'bg-emerald-50/30 border-emerald-50' : 'bg-indigo-50/30 border-indigo-50'}`}>
                <span className={`w-6 h-6 rounded-lg shadow-sm ${s.color} flex items-center justify-center text-white text-[10px] font-black`}>{s.icon}</span>
                <div className="flex-1">
                  <div className={`text-[8px] font-black uppercase mb-0.5 ${perfil === 'retail' ? 'text-emerald-600' : 'text-indigo-600'}`}>{s.label}</div>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" step="1" 
                      value={val.toFixed(0)} 
                      onChange={e => handleChange(clave, (parseFloat(e.target.value)/100).toString())}
                      className={`w-full text-lg font-black bg-transparent outline-none font-mono ${perfil === 'retail' ? 'text-emerald-700' : 'text-indigo-700'}`}
                    />
                    <span className={`text-xs font-black ${perfil === 'retail' ? 'text-emerald-400' : 'text-indigo-400'}`}>%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>


      {/* --- SEGURIDAD POS --- */}
      <div className="bg-white rounded-[2.5rem] p-8 mb-12 flex flex-wrap gap-12 border border-red-100 shadow-xl items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 opacity-20" />
        <div className="text-xs font-black uppercase text-red-600 tracking-[0.2em] border-r border-red-100 pr-12 hidden md:block italic">Seguridad POS</div>
        <div className="flex-1 flex items-center gap-10">
          <div className="flex-1 max-w-sm">
             <div className="text-[10px] font-black uppercase text-red-400 mb-1">Umbral de Alerta de Cancelación (ARS)</div>
             <p className="text-[9px] text-gray-400 font-bold mb-3 uppercase tracking-tight">Monto a partir del cual una cancelación genera alerta crítica.</p>
             <div className="flex items-center gap-3 bg-red-50/50 px-4 py-3 rounded-2xl border border-red-50">
               <span className="text-sm font-black text-red-400">$</span>
               <input 
                type="number" 
                value={form['pos_monto_alerta_cancelacion'] || '0'} 
                onChange={e => handleChange('pos_monto_alerta_cancelacion', e.target.value)}
                className="w-full text-lg font-black text-red-700 bg-transparent outline-none font-mono"
               />
             </div>
          </div>
          <div className="bg-red-50 p-6 rounded-3xl flex-1 max-w-sm border border-red-100/50">
             <h5 className="text-[10px] font-black text-red-600 uppercase mb-2">Audit Risk Management</h5>
             <p className="text-[9px] text-red-400 font-bold leading-relaxed uppercase">
               Toda cancelación superior a este monto quedará resaltada en el reporte forense para control de dueños.
             </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl relative overflow-hidden">
          <div className={`flex items-center gap-4 mb-10 pb-6 border-b transition-all ${perfil === 'retail' ? 'border-emerald-50' : 'border-gray-50'}`}>
            <div className={`w-3 h-3 rounded-full ${perfil === 'retail' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight italic">
              {perfil === 'industrial' ? 'Estructura de Costos Industriales' : 'Estructura de Costos de Reposición (Retail)'} (% sobre Base)
            </h3>
          </div>
          
          <div className="space-y-2">
            <MatrixRow 
              baseKey={getK('mo_pct')} 
              label={perfil === 'industrial' ? "Mano de Obra (Taller/Producción)" : "Gasto de Reposición (Handling/Packaging)"} 
              form={form} handleChange={handleChange} colorClass={perfil === 'retail' ? 'indigo' : 'gray'} 
            />
            <MatrixRow baseKey={getK('logistica_pct')} label="Logística y Distribución" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('admin_pct')} label="Administración Operativa" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('ventas_pct')} label="Gastos de Canal / Comercial" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('ley_25413')} label="Imp. Ley 25413 (Operativa Compra)" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('fijos_pct')} label="Costos Fijos Asignados" form={form} handleChange={handleChange} />
          </div>

          <div className="mt-16 pt-10 border-t border-gray-50">
            <h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-widest mb-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              Slots Personalizados (Otros Costos Variables)
            </h4>
            <div className="space-y-12">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl p-6 bg-indigo-50/20 border border-indigo-50/50">
                  <input 
                    placeholder={`Nombre del Costo Variable ${i}...`}
                    value={form[`extra_cost_${i}_name`] || ''}
                    onChange={e => handleChange(`extra_cost_${i}_name`, e.target.value)}
                    className="w-full bg-transparent border-b border-indigo-100 py-3 text-lg font-black uppercase text-indigo-900 outline-none focus:border-indigo-400 placeholder:text-indigo-200 mb-6 italic"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {SEGMENTOS.map(s => {
                      const clave = `extra_cost_${i}_pct_${s.id}`
                      return (
                        <div key={s.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-indigo-50 shadow-sm">
                          <span className={`text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white ${s.color}`}>{s.icon}</span>
                          <input 
                            type="number" step="0.1" 
                            value={parseFloat(form[clave] || '0') * 100}
                            onChange={e => handleChange(clave, (parseFloat(e.target.value)/100).toString())}
                            className="w-full text-right text-sm font-black text-indigo-600 bg-transparent outline-none font-mono"
                          />
                          <span className="text-[10px] font-black text-indigo-300">%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-red-50 shadow-2xl relative overflow-hidden">
           <div className="flex items-center gap-4 mb-10 pb-6 border-b border-red-50">
            <div className="w-3 h-3 bg-red-400 rounded-full" />
            <h3 className="text-lg font-black uppercase text-red-700 tracking-tight italic">Carga Impositiva y Comisiones (% sobre Venta)</h3>
          </div>

          <div className="space-y-2">
            <MatrixRow baseKey={getK('iva')} label="IVA (Débito Fiscal)" colorClass="red" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('iibb')} label="Ingresos Brutos (IIBB)" colorClass="red" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('costo_tarjeta')} label="Costo Tarjeta / Servicios Financieros" colorClass="red" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('comision_pct')} label="Comisiones a Terceros" colorClass="red" form={form} handleChange={handleChange} />
            <MatrixRow baseKey={getK('ley_cheque_vta')} label="Imp. Ley 25413 (Operativa Venta)" colorClass="red" form={form} handleChange={handleChange} />
          </div>

          <div className="mt-16 pt-10 border-t border-red-50">
            <h4 className="text-[11px] font-black uppercase text-red-500 tracking-widest mb-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              Otros Impuestos o Retenciones Diferenciadas
            </h4>
            <div className="space-y-12">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl p-6 bg-red-50/20 border border-red-50">
                   <input 
                    placeholder={`Nombre del Impuesto Comercial ${i}...`}
                    value={form[`extra_tax_${i}_name`] || ''}
                    onChange={e => handleChange(`extra_tax_${i}_name`, e.target.value)}
                    className="w-full bg-transparent border-b border-red-100 py-3 text-lg font-black uppercase text-red-900 outline-none focus:border-red-400 placeholder:text-red-200 mb-6 italic"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {SEGMENTOS.map(s => {
                      const clave = `extra_tax_${i}_pct_${s.id}`
                      return (
                        <div key={s.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-red-50 shadow-sm">
                          <span className={`text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white ${s.color}`}>{s.icon}</span>
                          <input 
                            type="number" step="0.1" 
                            value={parseFloat(form[clave] || '0') * 100}
                            onChange={e => handleChange(clave, (parseFloat(e.target.value)/100).toString())}
                            className="w-full text-right text-sm font-black text-red-600 bg-transparent outline-none font-mono"
                          />
                          <span className="text-[10px] font-black text-red-300">%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
