import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi, saasApi } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, User, Mail, Lock, Building2, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Eye, EyeOff, ShieldCheck
} from 'lucide-react'

export function RegisterPage() {

  const { data: planesData = [], isLoading: loadingPlanes } = useQuery({
    queryKey: ['saasPlanes'],
    queryFn: saasApi.getPlanes
  })
  
  const selectedPlanData = planesData.find((p: any) => p.id === selectedPlan) || planesData[1] || planesData[0] || {}

  const [step, setStep] = useState(1)
  const [nombreDueño, setNombreDueño] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [cuit, setCuit] = useState('')

  const [selectedPlan, setSelectedPlan] = useState<string>('PROFESIONAL')
  const [terminosAceptados, setTerminosAceptados] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // Cálculos dinámicos de abono
  const precioListaTotal = selectedPlanData?.precioMensual || 0
  
  // Próximas escalas calculadas para el UI
  const precioEscala70 = Math.round(precioListaTotal * 0.3)
  const precioEscala50 = Math.round(precioListaTotal * 0.5)
  const precioEscala35 = Math.round(precioListaTotal * 0.65)
  const precioEscala20 = Math.round(precioListaTotal * 0.8)
  const precioEscala90 = precioListaTotal

  const validateStep1 = () => {
    if (!nombreDueño.trim()) return 'Ingresa tu nombre'
    if (!email.trim() || !email.includes('@')) return 'Ingresa un email válido'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    return null
  }

  const validateStep2 = () => {
    if (!nombreEmpresa.trim()) return 'Ingresa el nombre de la empresa'
    if (!cuit.trim() || cuit.replace(/\D/g, '').length < 11) return 'Ingresa un CUIT válido (11 dígitos)'
    return null
  }

  const handleNext = () => {
    setError('')
    if (step === 1) {
      const step1Error = validateStep1()
      if (step1Error) {
        setError(step1Error)
        return
      }
      setStep(2)
    } else if (step === 2) {
      const step2Error = validateStep2()
      if (step2Error) {
        setError(step2Error)
        return
      }
      setStep(3)
    }
  }

  const handleBack = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!terminosAceptados) {
      setError('Debes aceptar los Términos y Condiciones')
      return
    }

    setLoading(true)
    try {
      const payload = {
        nombreDueño,
        email,
        password,
        nombreEmpresa,
        cuit: cuit.replace(/\D/g, ''), // Mandar limpio de guiones
        modulos: selectedPlanData?.modulos || ['COMERCIAL'],
        terminosAceptados
      }
      
      const data = await authApi.registrarEmpresa(payload)
      
      if (data.requireEmailVerification) {
        setStep(4) // Move to success step
        return
      }

      setAuth(data.token!, data.usuario)
      navigate('/')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || err.message || 'Error al procesar el alta de la empresa. Verifica los datos e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-4xl relative z-10 my-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-4 backdrop-blur-md">
            <Rocket size={14} className="text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Unifai Onboarding</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Crea tu Cuenta de Empresa</h1>
          <p className="text-gray-400 text-sm font-semibold max-w-md mx-auto">
            Configura tu entorno de trabajo y módulos a medida en pocos pasos.
          </p>
        </div>

        {/* Step Indicator */}
        {step < 4 && (
          <div className="max-w-md mx-auto mb-8 flex items-center justify-between relative px-2">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 -z-10" />
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${
                    step === num 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30 scale-110' 
                      : step > num 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-[#151515] border border-white/10 text-gray-500'
                  }`}
                >
                  {step > num ? <CheckCircle2 size={18} /> : num}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-2 transition-colors ${
                  step === num ? 'text-indigo-400' : 'text-gray-600'
                }`}>
                  {num === 1 ? 'Dueño' : num === 2 ? 'Empresa' : 'Módulos'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Content Box */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="border-b border-white/10 pb-4 mb-6">
                    <h2 className="text-xl font-black text-white">Datos de Cuenta (Administrador)</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-1">
                      Esta cuenta será el administrador principal (Dueño) de la plataforma. Podrás crear otros usuarios luego.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <User size={12} /> Nombre Completo
                      </label>
                      <input 
                        type="text" 
                        value={nombreDueño} 
                        onChange={e => setNombreDueño(e.target.value)} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="Ej. Lucas Álvarez"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <Mail size={12} /> Email Corporativo
                      </label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="ejemplo@empresa.com"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <Lock size={12} /> Contraseña de Acceso
                      </label>
                      <div className="relative group">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-14 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="border-b border-white/10 pb-4 mb-6">
                    <h2 className="text-xl font-black text-white">Datos de tu Empresa</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-1">
                      Identidad corporativa y datos impositivos obligatorios para facturación.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <Building2 size={12} /> Razón Social / Nombre Comercial
                      </label>
                      <input 
                        type="text" 
                        value={nombreEmpresa} 
                        onChange={e => setNombreEmpresa(e.target.value)} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="Nombre de la empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        <FileText size={12} /> CUIT / Identificación Fiscal
                      </label>
                      <input 
                        type="text" 
                        value={cuit} 
                        onChange={e => setCuit(e.target.value)} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
                        placeholder="Ej. 30-12345678-9"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1">
                      <Sparkles size={16} /> Promo de Bienvenida: Primeros 90 días 100% Bonificados
                    </div>
                    <h2 className="text-xl font-black text-white">Selecciona tus Módulos</h2>
                    <p className="text-xs font-semibold text-gray-500">
                      Activa los módulos que requieras. Tu tarifa mensual se recalcula automáticamente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {planesData.map((item: any) => {
                      const key = item.id
                      const active = selectedPlan === key
                      return (
                        <div 
                          key={key}
                          onClick={() => setSelectedPlan(key)}
                          className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex flex-col relative ${
                            active 
                              ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {key === 'PROFESIONAL' && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                              Más elegido
                            </div>
                          )}
                          <div className="mb-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-black text-white text-xl">{item.nombre}</h3>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                active ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20'
                              }`}>
                                {active && <CheckCircle2 size={14} className="fill-white text-indigo-600" />}
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-indigo-400 font-black text-2xl">
                                ${item.precioMensual}
                              </span>
                              <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">USD/mes</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mb-6">Hasta {item.usuariosBase} usuarios · {item.tiempoRespuesta}</p>
                            <div className="space-y-3">
                              {(item.modulos || []).slice(0,5).map((carac: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs font-semibold text-gray-300">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span>{carac}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Escala de Descuentos Progresivos - Gráfico Visual */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" /> Esquema de Promoción Anual
                    </h4>
                    
                    {/* Barra de progreso visual */}
                    <div className="grid grid-cols-7 gap-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                      <div className="bg-emerald-500 h-full col-span-2 relative group">
                        <div className="absolute inset-0 bg-white/25 animate-pulse" />
                      </div> {/* 0-90 (100% OFF) */}
                      <div className="bg-indigo-500 h-full col-span-2" /> {/* 91-180 (50% OFF) */}
                      <div className="bg-indigo-600 h-full" /> {/* 181-225 (40% OFF) */}
                      <div className="bg-indigo-700 h-full" /> {/* 226-270 (30% OFF) */}
                      <div className="bg-indigo-800 h-full" /> {/* 271-315 (20% OFF) */}
                      <div className="bg-indigo-900 h-full" /> {/* 316-360 (10% OFF) */}
                      <div className="bg-gray-800 h-full" /> {/* 361+ (0% OFF) */}
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <p className="text-emerald-400 font-black">Día 1 a 90</p>
                        <p className="text-white font-black">100% OFF</p>
                        <p className="text-[8px] text-emerald-400/80 bg-emerald-400/10 py-0.5 rounded-full">$0 / mes</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-indigo-300 font-black">Día 91 a 180</p>
                        <p className="text-white font-black">70% OFF</p>
                        <p className="text-[8px] text-gray-400">${precioEscala70.toLocaleString('es-AR')} USD</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-indigo-400 font-black">Día 181 a 225</p>
                        <p className="text-white font-black">50% OFF</p>
                        <p className="text-[8px] text-gray-400">${precioEscala50.toLocaleString('es-AR')} USD</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-indigo-500 font-black">Día 226 a 270</p>
                        <p className="text-white font-black">35% OFF</p>
                        <p className="text-[8px] text-gray-400">${precioEscala35.toLocaleString('es-AR')} USD</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-indigo-600 font-black">Día 271 a 315</p>
                        <p className="text-white font-black">20% OFF</p>
                        <p className="text-[8px] text-gray-400">${precioEscala20.toLocaleString('es-AR')} USD</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 font-black">Día 316+</p>
                        <p className="text-white font-black">Precio full</p>
                        <p className="text-[8px] text-gray-400">${precioEscala90.toLocaleString('es-AR')} USD</p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Facturación */}
                  <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                        Resumen del Pedido
                      </span>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                          $0
                        </span>
                        <span className="text-xs text-gray-400 font-bold">/ mes por 90 días</span>
                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full">
                          ¡Ahorras ${precioListaTotal} USD al mes!
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-gray-400">Plan elegido: <span className="text-white font-bold">{selectedPlanData?.nombre}</span></span>
                        <div className="text-right">
                          <span className="text-white/60 font-semibold text-xs line-through mr-2">${precioListaTotal} USD</span>
                          <span className="text-white font-bold text-lg">$0 USD</span><span className="text-white/60 text-[10px]">/mes (90 días)</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto text-left md:text-right space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-xs text-gray-400 font-semibold">
                      <p>Precio de lista total: <span className="text-white font-bold">${precioListaTotal.toLocaleString('es-AR')}</span></p>
                      <p>Descuento aplicado: <span className="text-emerald-400 font-bold">100% de descuento</span></p>
                      <p>Plan seleccionado: <span className="text-white font-bold">{selectedPlanData?.nombre}</span></p>
                    </div>
                  </div>

                  {/* Términos y Condiciones Checkbox */}
                  <div className="flex items-start gap-3 ml-2">
                    <label className="relative flex items-center p-1 rounded-full cursor-pointer mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={terminosAceptados}
                        onChange={e => setTerminosAceptados(e.target.checked)}
                        className="peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                      />
                      <span className="absolute text-white transition-opacity opacity-0 pointer-events-none top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 peer-checked:opacity-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                      Acepto los{' '}
                      <a href="#" className="text-indigo-400 hover:underline">Términos y Condiciones de Uso</a> y la{' '}
                      <a href="#" className="text-indigo-400 hover:underline">Política de Privacidad de Unifai</a>.
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                    <Mail size={40} className="text-emerald-400 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">¡Bienvenido a Venzo ERP!</h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto font-medium mb-8 leading-relaxed">
                    Para continuar debes verificar tu cuenta de correo electrónico. Hemos enviado un mensaje a <span className="text-white font-bold">{email}</span>.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left max-w-sm mx-auto mb-10">
                    <div className="flex gap-3 text-amber-400/90 items-start mb-2">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold">¿No encuentras el correo?</p>
                    </div>
                    <p className="text-[11px] text-gray-500 ml-7 leading-relaxed font-medium">
                      Si no llega a tu bandeja de entrada en los próximos minutos, por favor revisa tu carpeta de <span className="text-gray-300 font-semibold">Spam o Correo no deseado</span>.
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest transition-all"
                  >
                    Ir al Inicio de Sesión <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mt-6 flex items-center gap-3 text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-5 py-4 rounded-2xl uppercase tracking-widest"
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            {step < 4 && (
              <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50"
                  >
                    <ArrowLeft size={14} /> Volver
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    ¿Ya tienes cuenta? Ingresa aquí
                  </Link>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all"
                  >
                    Siguiente <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Procesando alta...' : 'Finalizar Registro'} <CheckCircle2 size={14} />
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        <p className="text-center mt-8 text-[9px] font-black text-gray-700 uppercase tracking-widest">
          Tu información fiscal es resguardada bajo estándares industriales de encriptación.
        </p>

      </div>
    </div>
  )
}
