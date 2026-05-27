import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuariosApi, api } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Check, 
  Crown, 
  Eye, 
  X,
  AlertCircle,
  TrendingUp,
  Zap,
  KeyRound,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { CONFIG_MODULOS } from '../constants/modules'

const LIMITES_PLANES: Record<string, number> = {
  FREE: 2,
  BASIC: 5,
  PRO: 10,
  ENTERPRISE: 999999
}

// ─── Permisos agrupados por área (Alineados con el Menú Lateral) ────────────────
const COLOR_CLASSES: Record<string, { textColor: string, bgColor: string, borderColor: string }> = {
  emerald: { textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  indigo: { textColor: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  teal: { textColor: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  violet: { textColor: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  amber: { textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  rose: { textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  pink: { textColor: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  blue: { textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  gray: { textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
}

const PERMISO_GRUPO_MAP: Record<string, { label: string, textColor: string, bgColor: string }> = {}

// Mapear sub-módulos nuevos
CONFIG_MODULOS.forEach(g => {
  const colorKey = g.id === 'VENTAS' ? 'emerald' : 
                   g.id === 'COMPRAS' ? 'indigo' :
                   g.id === 'TALLER' ? 'teal' :
                   g.id === 'BORDADOS' ? 'violet' :
                   g.id === 'ADMINISTRACION' ? 'amber' :
                   g.id === 'REPORTES' ? 'rose' :
                   g.id === 'RRHH' ? 'pink' :
                   g.id === 'SISTEMAS' ? 'indigo' :
                   g.id === 'COMERCIAL' ? 'blue' : 'gray'
  const classes = COLOR_CLASSES[colorKey] || COLOR_CLASSES.gray

  g.submodules.forEach(s => {
    PERMISO_GRUPO_MAP[s.id] = {
      label: `${g.label}: ${s.label}`,
      textColor: classes.textColor,
      bgColor: classes.bgColor
    }
  })
})

// Mapear permisos legacy para retrocompatibilidad
const LEGACY_MAP: Record<string, { label: string, color: string }> = {
  VENTAS: { label: 'Ventas y Mostrador (Legacy)', color: 'emerald' },
  CAJA: { label: 'Caja y Cobros (Legacy)', color: 'emerald' },
  PRODUCCION: { label: 'Pedidos y Órdenes (Legacy)', color: 'emerald' },
  STOCK_INVENTORY: { label: 'Proveedores y OC (Legacy)', color: 'indigo' },
  STOCK_EDIT: { label: 'Insumos y Costos (Legacy)', color: 'teal' },
  STOCK_VIEW: { label: 'Stock y Catálogo (Legacy)', color: 'teal' },
  PRODUCCION_TALLER: { label: 'Etapas Producción (Legacy)', color: 'teal' },
  PRODUCCION_SPECIAL: { label: 'Bordados (Legacy)', color: 'violet' },
  FINANZAS_BASIC: { label: 'Cuentas Corrientes (Legacy)', color: 'amber' },
  FINANZAS_ADV: { label: 'Finanzas Avanzadas (Legacy)', color: 'amber' },
  VENTAS_CLIENTES: { label: 'Clientes y Revendedores (Legacy)', color: 'blue' },
  REPORTES_VIEW: { label: 'Reportes (Legacy)', color: 'rose' },
  ADMIN: { label: 'Administración Total (Legacy)', color: 'indigo' }
}

Object.entries(LEGACY_MAP).forEach(([id, info]) => {
  const classes = COLOR_CLASSES[info.color] || COLOR_CLASSES.gray
  PERMISO_GRUPO_MAP[id] = {
    label: info.label,
    textColor: classes.textColor,
    bgColor: classes.bgColor
  }
})

const TODOS_LOS_PERMISOS = CONFIG_MODULOS.flatMap(g => g.submodules.map(s => ({
  id: s.id,
  label: `${g.label} - ${s.label}`
})))

const ROL_LABELS: Record<string, string> = {
  CLIENT_ADMIN: 'Administrador',
  OPERADOR: 'Operativo',
  LECTOR: 'Solo Lectura',
}

function PermisoBadge({ permisoId }: { permisoId: string }) {
  const info = PERMISO_GRUPO_MAP[permisoId]
  if (!info) return <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md uppercase">{permisoId}</span>
  return (
    <span className={`text-[10px] font-black ${info.textColor} ${info.bgColor} px-3 py-1.5 rounded-xl uppercase tracking-tighter`}>
      {info.label}
    </span>
  )
}

function UserCard({ u, onEdit, onDelete, onResetPassword, currentUserId }: any) {
  const [showPermisos, setShowPermisos] = useState(false)
  const isOwner = u.rol === 'CLIENT_ADMIN'
  const isSelf = u.id === currentUserId

  return (
    <motion.div
      layout
      key={u.id}
      className={`bg-white rounded-[2.5rem] p-8 border transition-all group hover:shadow-2xl ${isOwner ? 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/10' : 'border-gray-100 shadow-sm'}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl ${isOwner ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-gray-100 text-gray-700'}`}>
            {isOwner ? <Crown size={32} /> : u.nombre.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-black text-gray-900 leading-none truncate mb-1">
              {u.nombre}
              {isSelf && <span className="ml-2 text-[10px] font-black text-emerald-500 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">TÚ</span>}
            </h3>
            <p className="text-sm text-gray-400 font-medium truncate max-w-[200px]">{u.email || '(Sin email)'}</p>
            {u.identificadorNacional && (
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-1.5">
                DNI: {u.identificadorNacional}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isOwner && (
            <>
              <button 
                onClick={() => onResetPassword(u)} 
                title="Blanquear Clave"
                className="p-2.5 text-gray-400 hover:text-amber-500 bg-gray-50 hover:bg-amber-50 rounded-xl transition-all hover:scale-110"
              >
                <KeyRound size={18} />
              </button>
              <button onClick={() => onEdit(u)} className="p-2.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all hover:scale-110">
                <Shield size={18} />
              </button>
              <button onClick={() => onDelete(u.id)} className="p-2.5 text-gray-400 hover:text-rose-500 bg-gray-50 hover:bg-rose-50 rounded-xl transition-all hover:scale-110">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6 ${isOwner ? 'bg-indigo-600 shadow-lg shadow-indigo-200 text-white' : 'bg-gray-100 text-gray-600'}`}>
        <Shield size={12} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{ROL_LABELS[u.rol] || u.rol}</span>
      </div>

      <div>
        <button
          onClick={() => setShowPermisos(!showPermisos)}
          className="flex items-center gap-1 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <Eye size={12} />
          {u.permisos?.length || 0} Atribuciones de Acceso
          <span className={`transition-transform duration-300 ${showPermisos ? 'rotate-180' : ''}`}>▾</span>
        </button>

        <AnimatePresence>
          {showPermisos && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="flex flex-wrap gap-1">
                 {(isOwner ? TODOS_LOS_PERMISOS.map(p => p.id) : (u.permisos || [])).map((pid: string) => (
                   <PermisoBadge key={pid} permisoId={pid} />
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function UsuariosPage() {
  const qc = useQueryClient()
  const { usuario: currentUser } = useAuthStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userSel, setUserSel] = useState<any>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [identificadorNacional, setIdentificadorNacional] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('OPERADOR')
  const [tarifaVenta, setTarifaVenta] = useState('PRECIO_FINAL')
  const [permisos, setPermisos] = useState<string[]>(['VENTAS_PRECIOS'])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  
  const [buscar, setBuscar] = useState('')

  // Estados para blanqueo de clave
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState<any>(null)
  const [adminPasswordVerify, setAdminPasswordVerify] = useState('')
  const [isResetSuccessModalOpen, setIsResetSuccessModalOpen] = useState(false)
  const [generatedTempPassword, setGeneratedTempPassword] = useState('')
  const [isResetPending, setIsResetPending] = useState(false)

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.listar
  })

  const usuariosFiltrados = usuarios.filter((u: any) => 
     u.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(buscar.toLowerCase()) ||
     (u.identificadorNacional || '').toLowerCase().includes(buscar.toLowerCase())
  )

  const { data: empresa, isLoading: loadingEmpresa } = useQuery({
    queryKey: ['empresa', 'info'],
    queryFn: () => api.get(`/empresa/me?t=${Date.now()}`).then(res => res.data),
    retry: false
  })

  const mutation = useMutation({
    mutationFn: (data: any) => userSel ? usuariosApi.actualizar(userSel.id, data) : usuariosApi.crear(data),
    onSuccess: (resData: any) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success(userSel ? 'Usuario actualizado' : 'Usuario creado exitosamente')
      closeModal()
      if (!userSel && resData?.temporaryPassword) {
        setGeneratedTempPassword(resData.temporaryPassword)
        setIsResetSuccessModalOpen(true)
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Error al procesar usuario')
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => usuariosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuario eliminado')
    }
  })

  const openModal = (user: any = null) => {
    if (user) {
      setUserSel(user)
      setNombre(user.nombre)
      setEmail(user.email || '')
      setIdentificadorNacional(user.identificadorNacional || '')
      setRol(user.rol === 'CLIENT_ADMIN' ? 'OPERADOR' : user.rol)
      setTarifaVenta(user.tarifaVenta || 'PRECIO_FINAL')
      const activePerms = user.permisos || []
      setPermisos(activePerms)
      setPassword('')
      
      // Auto-expand groups that have active submodules
      const autoExpanded = CONFIG_MODULOS.filter(g =>
        g.submodules.some(s => activePerms.includes(s.id) || activePerms.includes(s.legacyCode))
      ).map(g => g.id)
      setExpandedGroups(autoExpanded)
    } else {
      setUserSel(null)
      setNombre('')
      setEmail('')
      setIdentificadorNacional('')
      setPassword('')
      setRol('OPERADOR')
      setTarifaVenta('PRECIO_FINAL')
      setPermisos(['VENTAS_PRECIOS'])
      setExpandedGroups(['VENTAS'])
    }
    setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setUserSel(null); setExpandedGroups([]) }
  const togglePermiso = (id: string) => setPermisos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  
  const countActivos = usuarios.length
  const planSlug = empresa?.plan || 'BASIC'
  const limiteBase = LIMITES_PLANES[planSlug] || 5
  const extraTotal = empresa?.usuariosExtra || 0
  const limiteTotal = limiteBase + extraTotal
  
  const usoBase = Math.min(countActivos, limiteBase)
  const usoExtra = Math.max(0, countActivos - limiteBase)
  
  const pctBase = (usoBase / limiteBase) * 100
  const pctExtra = extraTotal > 0 ? (usoExtra / extraTotal) * 100 : 0
  
  const isLimitReached = countActivos >= limiteTotal && !userSel

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-black text-white tracking-tighter italic leading-none flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.4)]">
              <Users className="text-white" size={40} />
            </div>
            Gestión de Equipo
          </h1>
          <div className="flex items-center gap-6">
             <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.3em]">
               {countActivos} personas registradas
             </p>
             <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                <Crown size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Plan Corporativo {planSlug}</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative group w-full md:w-80">
              <input 
                 value={buscar}
                 onChange={e => setBuscar(e.target.value)}
                 placeholder="Lupa: buscar colaborador..."
                 className="w-full bg-[#1a1b1e] border border-white/5 rounded-3xl px-8 py-5 text-base text-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-gray-600 group-hover:border-white/10"
              />
              <span className="absolute right-7 top-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors">🔍</span>
           </div>

           <button
             onClick={() => openModal()}
             disabled={isLimitReached}
             className="w-full md:w-auto h-full bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
           >
             <UserPlus size={20} />
             NUEVO USUARIO
           </button>
        </div>
      </header>

      {/* ── SECCIÓN DE CAPACIDAD ── */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
         <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" />
            <span className="text-lg font-black text-gray-900 uppercase tracking-widest">Capacidad de Usuarios</span>
         </div>
         
         <div className="space-y-10">
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                     <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl uppercase tracking-[0.2em]">CUPOS ACTIVOS</span>
                     <span className="text-base font-black text-gray-900 leading-none italic">Contrato Principal de {limiteBase} usuarios</span>
                  </div>
                  <span className="text-xl font-black text-indigo-600 leading-none">
                     {usoBase} / {limiteBase}
                  </span>
               </div>
               <div className="w-full h-8 bg-gray-50 rounded-[1.5rem] overflow-hidden border border-gray-100 p-1.5 shadow-inner">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${pctBase}%` }}
                     className="h-full rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all duration-1000" 
                  />
               </div>
            </div>

            {extraTotal > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-4 pt-8 border-t border-gray-50"
               >
                  <div className="flex justify-between items-end">
                     <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl uppercase tracking-[0.2em]">SLOTS ADICIONALES</span>
                        <span className="text-base font-black text-gray-900 leading-none italic">+{extraTotal} espacios en demanda</span>
                     </div>
                     <span className="text-xl font-black text-amber-600 leading-none">
                        {usoExtra} / {extraTotal}
                     </span>
                  </div>
                  <div className="w-full h-8 bg-amber-50/50 rounded-[1.5rem] overflow-hidden border border-amber-100 p-1.5 shadow-inner">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pctExtra}%` }}
                        className="h-full rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20 transition-all duration-1000" 
                     />
                  </div>
               </motion.div>
            )}
         </div>

         {isLimitReached && (
            <div className="mt-8 flex items-center justify-between bg-amber-50 p-6 rounded-[2rem] border border-amber-100 italic">
               <div className="flex gap-4 items-center text-amber-900">
                  <AlertCircle size={20} />
                  <p className="text-[10px] font-black uppercase tracking-tight">Capacidad máxima alcanzada según tu suscripción actual.</p>
               </div>
               <button className="bg-white text-amber-600 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  Contactar Soporte
               </button>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuariosFiltrados.map((u: any) => (
          <UserCard 
            key={u.id} 
            u={u} 
            onEdit={openModal} 
            onDelete={deleteMut.mutate} 
            onResetPassword={(user: any) => {
              setResetUser(user)
              setAdminPasswordVerify('')
              setIsResetModalOpen(true)
            }}
            currentUserId={currentUser?.id} 
          />
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-8 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
               <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                  <h2 className="text-xl font-black text-gray-900">{userSel ? 'Editar Colaborador' : 'Agregar al Equipo'}</h2>
                  <button onClick={closeModal} className="p-2"><X size={20}/></button>
               </div>
               <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ nombre, email, identificadorNacional, password: password || undefined, rol, tarifaVenta, permisos }) }} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nombre</label>
                        <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">DNI / Identificador</label>
                        <input required value={identificadorNacional} onChange={e => setIdentificadorNacional(e.target.value)} placeholder="DNI obligatorio" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email (Opcional)</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner" />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nueva Contraseña {userSel && '(Dejar en blanco para no cambiar)'}</label>
                     <div className="relative">
                        <input 
                           type={showPassword ? "text" : "password"} 
                           value={password} onChange={e => setPassword(e.target.value)} 
                           placeholder={userSel ? "••••••••" : "Min. 6 caracteres"} 
                           className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 pr-14 text-sm font-bold shadow-inner outline-none focus:ring-4 focus:ring-indigo-50" 
                        />
                        <button
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                           {showPassword ? <Eye size={18} /> : <Zap size={18} />}
                        </button>
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tarifa Autorizada (Pto. de Venta)</label>
                     <select value={tarifaVenta} onChange={e => setTarifaVenta(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="PRECIO_FINAL">Mostrador (Precio Final)</option>
                        <option value="PRECIO_REVENDEDOR">Revendedor (Calle)</option>
                        <option value="PRECIO_EMPRESA">Mayorista / Institución</option>
                        <option value="PRECIO_REVENDIDO">Excepcional (Revendido / Otros)</option>
                        <option value="TODAS">Acceso Total (Solo Info)</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Jerarquía / Rol en Sistema</label>
                     <div className="flex gap-2">
                        <button type="button" onClick={() => setRol('CLIENT_ADMIN')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rol === 'CLIENT_ADMIN' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Administrador</button>
                        <button type="button" onClick={() => setRol('OPERADOR')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rol === 'OPERADOR' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Operativo</button>
                        <button type="button" onClick={() => setRol('LECTOR')} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rol === 'LECTOR' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Solo Lectura</button>
                     </div>
                  </div>

                  {rol !== 'CLIENT_ADMIN' && (
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block border-b border-gray-50 pb-2">Módulos Funcionales Autorizados</label>
                        <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2 py-1">
                           {CONFIG_MODULOS.map(group => {
                              const subIds = group.submodules.map(s => s.id)
                              
                              const isSubmoduleSelected = (subId: string, legacyCode: string) => {
                                return permisos.includes(subId) || permisos.includes(legacyCode)
                              }

                              const allSelected = group.submodules.every(s => isSubmoduleSelected(s.id, s.legacyCode))
                              const noneSelected = group.submodules.every(s => !isSubmoduleSelected(s.id, s.legacyCode))
                              const isIndeterminate = !allSelected && !noneSelected
                              const isExpanded = expandedGroups.includes(group.id)

                              const toggleGroup = () => {
                                if (allSelected) {
                                  const legacyCodes = group.submodules.map(s => s.legacyCode)
                                  setPermisos(prev => prev.filter(id => !subIds.includes(id) && !legacyCodes.includes(id)))
                                } else {
                                  setPermisos(prev => [...new Set([...prev, ...subIds])])
                                }
                              }

                              const toggleExpand = () => {
                                setExpandedGroups(prev =>
                                  prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                                )
                              }

                              return (
                                 <div key={group.id} className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                                    {/* Cabecera del grupo */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50/50">
                                       <div className="flex items-center gap-3">
                                          <input 
                                             type="checkbox"
                                             checked={allSelected}
                                             ref={el => {
                                                if (el) el.indeterminate = isIndeterminate
                                             }}
                                             onChange={toggleGroup}
                                             className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                          />
                                          <span className="text-xs font-black text-gray-800 uppercase tracking-tight">{group.label}</span>
                                          <span className="text-[9px] font-bold text-gray-400">
                                             ({group.submodules.filter(s => isSubmoduleSelected(s.id, s.legacyCode)).length} de {group.submodules.length})
                                          </span>
                                       </div>
                                       <button
                                          type="button"
                                          onClick={toggleExpand}
                                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                       >
                                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                       </button>
                                    </div>

                                    {/* Sub-módulos */}
                                    {isExpanded && (
                                       <div className="p-4 border-t border-gray-100 bg-white space-y-3 pl-9">
                                          {group.submodules.map(sub => {
                                             const isChecked = isSubmoduleSelected(sub.id, sub.legacyCode)
                                             const toggleSub = () => {
                                                if (isChecked) {
                                                   setPermisos(prev => prev.filter(id => id !== sub.id && id !== sub.legacyCode))
                                                } else {
                                                   setPermisos(prev => [...prev, sub.id])
                                                }
                                             }
                                             return (
                                                <label key={sub.id} className="flex items-center gap-3 cursor-pointer group text-left">
                                                   <input 
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      onChange={toggleSub}
                                                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                   />
                                                   <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                                                      {sub.label}
                                                   </span>
                                                </label>
                                             )
                                          })}
                                       </div>
                                    )}
                                 </div>
                              )
                           })}
                        </div>
                     </div>
                  )}
                  <button type="submit" disabled={mutation.isPending} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                     {mutation.isPending ? 'GUARDANDO...' : 'CONFIRMAR'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
        {/* MODAL DE CONFIRMACIÓN DE RESET DE CLAVE */}
        {isResetModalOpen && resetUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResetModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-600 mx-auto border border-amber-200">
                  <KeyRound size={28} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Blanquear Clave</h3>
                <p className="text-sm text-gray-400 font-medium">
                  Se generará una contraseña temporal para <strong>{resetUser.nombre}</strong> (DNI: {resetUser.identificadorNacional}).
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                setIsResetPending(true)
                try {
                  const res = await usuariosApi.resetPassword(resetUser.id, adminPasswordVerify)
                  setIsResetModalOpen(false)
                  setGeneratedTempPassword(res.temporaryPassword)
                  setIsResetSuccessModalOpen(true)
                } catch (err: any) {
                  toast.error(err.response?.data?.error || 'Error al blanquear clave')
                } finally {
                  setIsResetPending(false)
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tu Contraseña de Administrador</label>
                  <input 
                    required 
                    type="password" 
                    value={adminPasswordVerify} 
                    onChange={e => setAdminPasswordVerify(e.target.value)} 
                    placeholder="Confirma tu identidad" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold shadow-inner outline-none focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsResetModalOpen(false)} 
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isResetPending}
                    className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-100 transition-all disabled:opacity-50"
                  >
                    {isResetPending ? 'PROCESANDO...' : 'CONFIRMAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL DE ÉXITO DE RESET DE CLAVE / TEMPORARY PASSWORD */}
        {isResetSuccessModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResetSuccessModalOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 p-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                <Check size={28} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">Clave Restablecida</h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Entrega esta clave temporal de acceso al usuario. Deberá cambiarla obligatoriamente en su primer login.
              </p>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 flex flex-col items-center gap-3 relative group">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Clave Temporal</span>
                <span className="text-3xl font-black text-indigo-900 font-mono tracking-wider select-all">{generatedTempPassword}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedTempPassword)
                    toast.success('Clave copiada al portapapeles')
                  }}
                  className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-white px-4 py-2 rounded-xl border border-indigo-200 shadow-sm active:scale-95 transition-all"
                >
                  COPIAR CLAVE
                </button>
              </div>

              <button 
                onClick={() => setIsResetSuccessModalOpen(false)} 
                className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 transition-all"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
