import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useOfflineStore } from '../store/offlineStore'
import { toast } from 'sonner'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

// Inyecta el token en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Función auxiliar para obtener un título legible del request offline
function getRequestTitle(config: any): string {
  const url = config.url || ''
  const method = config.method?.toUpperCase() || ''
  let data: any = {}
  try {
    data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
  } catch (e) {
    // Ignorar si no se puede parsear
  }

  if (url.includes('/presupuestos')) {
    if (method === 'POST') {
      return `Emitir Presupuesto (${data.clienteNombre || 'Cliente Directo'})`
    }
    if (url.includes('/estado') && method === 'PATCH') {
      return `Actualizar Estado Presupuesto`
    }
  }
  if (url.includes('/clientes') && method === 'POST') {
    return `Crear Cliente (${data.nombre || ''} ${data.apellido || ''})`
  }
  if (url.includes('/insumos')) {
    if (method === 'POST') return `Crear Insumo (${data.nombre || ''})`
    if (method === 'PATCH') return `Editar Insumo (${data.nombre || ''})`
    if (url.includes('/stock-ajuste') && method === 'POST') return `Ajustar Stock Insumo`
  }
  if (url.includes('/productos')) {
    if (method === 'POST') return `Crear Producto (${data.nombre || ''})`
    if (method === 'PATCH') return `Editar Producto (${data.nombre || ''})`
    if (url.includes('/stock-ajuste') && method === 'POST') return `Ajustar Stock Producto`
  }
  if (url.includes('/proveedores') && method === 'POST') {
    return `Crear Proveedor (${data.nombre || ''})`
  }
  if (url.includes('/produccion') && url.includes('/aprobar') && method === 'POST') {
    return `Aprobar Presupuesto`
  }
  if (url.includes('/compras/ordenes') && method === 'POST') {
    return `Crear Orden de Compra`
  }

  return `${method} ${url}`
}

// Si el token expiró, logout automático; e interceptar cortes de red para guardar en cola offline
api.interceptors.response.use(
  res => res,
  err => {
    const originalRequest = err.config
    
    // Si no hay err.config, no podemos encolar la solicitud
    if (!originalRequest) {
      return Promise.reject(err)
    }

    // Verificar si es un error de red o de timeout (sin respuesta del servidor)
    const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.code === 'ECONNABORTED'
    
    // Métodos de escritura
    const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(originalRequest.method?.toUpperCase() || '')
    
    // Ignorar rutas de login o registro
    const isAuthRequest = originalRequest.url?.includes('/auth/')
    
    // Si es error de red en escritura y no es login: encolar
    if (isNetworkError && isWriteMethod && !isAuthRequest) {
      const title = getRequestTitle(originalRequest)
      let requestData = originalRequest.data
      try {
        if (typeof requestData === 'string') {
          requestData = JSON.parse(requestData)
        }
      } catch (e) {
        // Dejar como está
      }

      useOfflineStore.getState().addRequest({
        url: originalRequest.url || '',
        method: originalRequest.method?.toUpperCase() as any,
        body: requestData,
        title,
        headers: originalRequest.headers
      })

      toast.warning(`Trabajando sin conexión. "${title}" guardado localmente (pendiente de sincronización).`, {
        duration: 6000,
        id: `offline-${originalRequest.url}-${Date.now()}`
      })

      // Retornar resolve con datos ficticios para evitar que la UI se rompa
      return Promise.resolve({
        data: { id: 'temp-' + Math.random().toString(36).substring(2, 9), status: 'QUEUED', message: 'Offline queued' },
        status: 202,
        statusText: 'Accepted (Offline Queued)',
        headers: {},
        config: originalRequest
      })
    }

    // Si el token expiró
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    
    return Promise.reject(err)
  }
)

// ─── INTERFACES INDUSTRIALES ──────────────────────────────────────────────────

export interface Insumo {
  id:              string
  codigoInterno:   string | null
  tipo:            string
  categoria:       string
  nombre:          string
  descripcion:     string | null
  unidad:          string | null
  composicion:     string | null
  gramaje:         number | null
  ancho:           number | null
  color:           string | null
  fotoUrl?:        string | null
  fichaTecnicaUrl?: string | null
  activo:          boolean
  stockMinimo:     number | null
  stockActual:     number | null
  costoActual:     number | null
  ultimaActualizacion: string | null
  proveedorId?:    string | null
  proveedor?:      Proveedor | null
  proveedores?:    InsumoProveedor[] | null
}

export interface InsumoProveedor {
  id:               string
  insumoId:         string
  proveedorId:      string
  codigoReferencia: string | null
  costo:            number | null
  tiempoEntrega:    string | null
  leadTimeDays:     number | null
  esPrincipal:      boolean
  proveedor?:       Proveedor
}

export interface Proveedor {
  id:              string
  nombre:          string
  razonSocial:     string | null
  cuit:            string | null
  rubro:           string | null
  contactoNombre:  string | null
  telefono:        string | null
  email:           string | null
  activo:          boolean
  // Campos comerciales y logísticos adicionales
  formaPago?:      string | null
  diasPago?:       number | null
  medioPedido?:    string | null
  dirLegalCalle?:  string | null
  dirLegalNro?:    string | null
  dirLegalCiudad?: string | null
  dirLegalProvincia?: string | null
  dirRealCalle?:   string | null
  dirRealNro?:     string | null
  dirRealCiudad?:  string | null
  dirRealProvincia?: string | null
}

export interface TalleItem {
  id:      string
  nombre:  string
  orden:   number
}

export interface CurvaTalle {
  id:      string
  nombre:  string
  items:   TalleItem[]
}

export interface PuntoMedicion {
  id:      string
  nombre:  string
}

export interface MedidaBase {
  id?:      string
  talle:   string
  puntoId: string
  valorCm: number
}

export interface Categoria {
  id:          string
  nombre:      string
  descripcion: string | null
  dibujoUrl:   string | null
  parentId?:   string | null
  subCategorias?: Categoria[]
  puntosReferencia?: PuntoMedicion[]
  medidasBase?: MedidaBase[]
}

export interface SubCategoria {
  id:          string
  nombre:      string
  categoriaId: string
  empresaId:   string
}

export interface MedidaTalle {
  id?:     string
  talle:   string
  puntoId: string
  valorCm: number
  punto?:  PuntoMedicion
}

export interface ImagenProducto {
  id?:      string
  url:      string
  etiqueta: string
  posicion: number
}

export interface Producto {
  id:           string
  nombre:       string
  activo:       boolean
  creadoEn:     string
  tipo:         'FABRICADO' | 'COMPRADO' | 'SEMI_TERMINADO'
  tipoVenta?:   'UNIDAD' | 'FRACCIONADO'
  temporada?:   string | null
  categoriaId:  string | null
  categoria?:   Categoria | null
  proveedorId:  string | null
  costoCompra:  number | null
  codigoBarra?: string | null
  insumos:      any[]
  talles:       any[]
  medidas?:     MedidaTalle[]
  imagenes?:    ImagenProducto[]
  bordados?:    any[]
  proveedor?:   Proveedor | null
  proveedores?: any[]
  institucionId: string | null
  institucion?: Institucion | null
  precioFinal?: number | null
  precioRevendedor?: number | null
  precioEmpresa?: number | null
  precioRevendido?: number | null
  subCategoriaId?: string | null
  subCategoria?: SubCategoria | null
  preferencias?: Record<string, any>
  metadata?:    any
}

// ─── COMPRAS ───────────────────────────────────────────────────────────────

export interface OrdenCompra {
  id:                  string
  numero:              number
  proveedorId:         string
  proveedor?:          Proveedor
  estado:              'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA_TOTAL' | 'CANCELADA'
  fechaEmision:        string
  fechaEntregaEstimada: string | null
  totalEstimado:       number
  notas:               string | null
  items?:              LineaOrdenCompra[]
  creadoEn:            string
}

export interface LineaOrdenCompra {
  id:                    string
  ordenCompraId:         string
  insumoId?:             string | null
  insumo?:               Insumo
  productoId?:           string | null
  producto?:             Producto
  talle?:                string | null
  cantidadPedida:        number
  cantidadRecibida:      number
  costoUnitarioEstimado: number
  subtotal:              number
}

export interface RecepcionMercaderia {
  id:             string
  proveedorId:    string
  proveedor?:     Proveedor
  ordenCompraId?: string | null
  nroRemito?:     string | null
  fechaRecepcion: string
  notas?:         string | null
  items?:         LineaRecepcion[]
}

export interface Comprobante {
  id: string
  tipo: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'REMITO' | 'RECIBO_X' | 'NOTA_VENTA' | 'NOTA_DEBITO' | 'NOTA_CREDITO'
  numero: string
  fecha: string
  total: number
  metodoPago?: string
  esOficial: boolean
  clienteId?: string
  cliente?: { nombre: string }
  pedidoId?: string
  pedido?: { numero: number }
  notas?: string
}

export interface MovimientoCC {
  id: string
  fecha: string
  tipo: 'DEBE' | 'HABER'
  importe: number
  saldoResultante: number
  descripcion?: string
  comprobante?: Comprobante
}

export interface EtapaPedido {
  id: string
  nombreEtapa: string
  estado: 'PENDIENTE' | 'PROCESO' | 'COMPLETADO' | 'PAUSADO'
  usuarioId?: string
  fechaInicio?: string
  fechaFin?: string
  notas?: string
}

export interface LineaRecepcion {
  id:                string
  recepcionId:       string
  insumoId?:         string | null
  productoTalleId?:  string | null
  cantidadRecibida:  number
  costoUnitarioReal: number
  lineaOrdenCompraId?: string | null
}

// ─── APIS ───────────────────────────────────────────────────────────────────

export const insumosApi = {
  listar: async (params?: { tipo?: string; categoria?: string; buscar?: string }): Promise<Insumo[]> => {
    let query = supabase.from('insumos').select('*').order('creadoEn', { ascending: false });
    if (params?.tipo) query = query.eq('tipo', params.tipo);
    if (params?.categoria) query = query.eq('categoria', params.categoria);
    if (params?.buscar) query = query.ilike('nombre', `%${params.buscar}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as Insumo[];
  },
  trazabilidad: async (id: string): Promise<{ historial: any[]; usos: any[] }> => {
    // Placeholder para reescribir consultas complejas
    const { data } = await supabase.from('MovimientoStock').select('*').eq('insumoId', id);
    return { historial: data || [], usos: [] };
  },
  crear: async (data: any): Promise<Insumo> => {
    const { data: result, error } = await supabase.from('insumos').insert([data]).select().single();
    if (error) throw error;
    return result as Insumo;
  },
  editar: async (id: string, data: any): Promise<Insumo> => {
    const { data: result, error } = await supabase.from('insumos').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result as Insumo;
  },
  eliminar: async (id: string): Promise<any> => {
    const { error } = await supabase.from('insumos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  actualizarPrecio: async (id: string, costo: number, motivo?: string): Promise<any> => {
    const { data: result, error } = await supabase.from('insumos').update({ costoActual: costo }).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },
  actualizarMasivo: async (data: { porcentaje: number; tipo?: string; categoria?: string; motivo?: string }): Promise<{actualizados: number}> => {
    // Para operaciones masivas, es mejor usar Edge Functions de Supabase en vez del cliente JS.
    throw new Error("Migrando a Edge Functions. Temporalmente no disponible.");
  },
}

export const proveedoresApi = {
  listar: async (): Promise<Proveedor[]> => {
    const { data, error } = await supabase.from('proveedores').select('*');
    if (error) throw error;
    return data as Proveedor[];
  },
  crear: async (data: Partial<Proveedor>): Promise<Proveedor> => {
    const { data: result, error } = await supabase.from('proveedores').insert([data]).select().single();
    if (error) throw error;
    return result as Proveedor;
  },
  editar: async (id: string, data: Partial<Proveedor>): Promise<Proveedor> => {
    const { data: result, error } = await supabase.from('proveedores').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result as Proveedor;
  },
  baja: async (id: string): Promise<any> => {
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
}

export const productosApi = {
  listar: async (filtros?: { categoriaId?: string; buscar?: string }): Promise<Producto[]> => {
    let query = supabase.from('productos').select('*, categoria:categorias(*)').order('creadoEn', { ascending: false });
    if (filtros?.categoriaId) query = query.eq('categoriaId', filtros.categoriaId);
    if (filtros?.buscar) query = query.ilike('nombre', `%${filtros.buscar}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as Producto[];
  },
  obtener: async (id: string): Promise<Producto> => {
    const { data, error } = await supabase.from('productos').select('*, categoria:categorias(*), insumos:insumo_producto(*), talles:producto_talle(*)').eq('id', id).single();
    if (error) throw error;
    return data as Producto;
  },
  crear: async (data: any): Promise<Producto> => {
    const { data: result, error } = await supabase.from('productos').insert([data]).select().single();
    if (error) throw error;
    return result as Producto;
  },
  editar: async (id: string, data: any): Promise<Producto> => {
    const { data: result, error } = await supabase.from('productos').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result as Producto;
  },
  eliminar: async (id: string, hard?: boolean): Promise<any> => {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  subirImagen: async (file: File): Promise<{url: string}> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('productos-imagenes').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('productos-imagenes').getPublicUrl(fileName);
    return { url: publicUrl };
  },
  actualizarMasivo: async (data: { porcentaje: number; categoriaId?: string; institucionId?: string; temporada?: string; motivo?: string }): Promise<{actualizados: number}> => {
    throw new Error("Migrando a Edge Functions. Temporalmente no disponible.");
  },
}

export const categoriasApi = {
  listar: (): Promise<Categoria[]> => api.get<Categoria[]>('/categorias').then(r => r.data),
  crear:  (data: any): Promise<Categoria> => api.post('/categorias', data).then(r => r.data),
  editar: (id: string, data: any): Promise<Categoria> => api.patch(`/categorias/${id}`, data).then(r => r.data),
  inactivar: (id: string): Promise<any> => api.patch(`/categorias/${id}`, { activo: false }).then(r => r.data),
  eliminar: (id: string): Promise<any> => api.delete(`/categorias/${id}`).then(r => r.data),
  guardarMedidasBase: (id: string, data: MedidaBase[]): Promise<any> => 
    api.post(`/categorias/${id}/medidas-base`, data).then(r => r.data),
}

export const tallesApi = {
  listar: (): Promise<CurvaTalle[]> => api.get<CurvaTalle[]>('/talles').then(r => r.data),
  crear:  (data: any): Promise<CurvaTalle> => api.post('/talles', data).then(r => r.data),
  editar: (id: string, data: any): Promise<CurvaTalle> => api.patch(`/talles/${id}`, data).then(r => r.data),
  eliminar: (id: string): Promise<any> => api.delete(`/talles/${id}`).then(r => r.data),
}

export const bordadosApi = {
  listar:  () => api.get<Bordado[]>('/bordados').then(r => r.data),
  crear:   (data: any) => api.post<Bordado>('/bordados', data).then(r => r.data),
  editar:  (id: string, data: any) => api.patch<Bordado>(`/bordados/${id}`, data).then(r => r.data),
  eliminar: (id: string) => api.delete(`/bordados/${id}`).then(r => r.data),
}

export interface Bordado {
  id:               string
  nombre:           string
  descripcion:      string | null
  puntadas:         number
  precioPorMillar:  number
  costoPonchado:    number
  marginTerceros:   number
  precioFinal?:      number | null
  precioRevendedor?: number | null
  precioEmpresa?:    number | null
  precioRevendido?:  number | null
  fotoUrl:          string | null
  archivoMatrizUrl: string | null
  activo:           boolean
  creadoEn:         string
  actualizadoEn:    string
}

export interface LineaPresupuesto {
  id:              string
  tipoItem:        'PRODUCTO' | 'SERVICIO_BORDADO'
  productoId?:     string | null
  productoNombre:  string
  talle?:          string | null
  bordado?:        string | null
  estampado?:      string | null
  cantidad:        number
  precioUnitario:  number
  precioBordado:   number
  precioEstampado: number
  subtotal:        number
  entregado:       boolean
}

export interface Presupuesto {
  id:              string
  numero:          number
  clienteId?:      string | null
  institucionId?:  string | null
  clienteNombre?:  string | null
  clienteContacto?: string | null
  clienteTelefono?: string | null
  modoPago:        string
  descuento:       number
  recargo:         number
  senia:           number
  subtotal:        number
  total:           number
  aplicaIva:       boolean
  tipoVencimiento: 'HABILES' | 'CORRIDOS'
  diasVigencia:    number
  fechaVencimiento: string | null
  canal:           'OFFICIAL' | 'GESTION'
  estado:          string
  notas:           string | null
  creadoEn:        string
  pagado:          boolean
  requiereFactura: boolean
  entregadoTodo:   boolean
  cuotas:          number
  recargoPct:      number
  lineas?:         LineaPresupuesto[]
}

export const presupuestosApi = {
  listar: async (): Promise<Presupuesto[]> => {
    const { data, error } = await supabase.from('presupuestos').select('*, lineas:lineas_presupuesto(*)').order('creadoEn', { ascending: false });
    if (error) throw error;
    return data as Presupuesto[];
  },
  obtener: async (id: string): Promise<Presupuesto> => {
    const { data, error } = await supabase.from('presupuestos').select('*, lineas:lineas_presupuesto(*)').eq('id', id).single();
    if (error) throw error;
    return data as Presupuesto;
  },
  crear: async (data: any): Promise<Presupuesto> => {
    const { data: result, error } = await supabase.from('presupuestos').insert([data]).select().single();
    if (error) throw error;
    return result as Presupuesto;
  },
  estado: async (id: string, estado: string): Promise<any> => {
    const { data: result, error } = await supabase.from('presupuestos').update({ estado }).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },
  cobrar: async (id: string, data: any): Promise<Presupuesto> => {
    throw new Error("Migrando a Edge Functions. Temporalmente no disponible.");
  },
}

export const finanzasApi = {
  crearComprobante: (data: any) => api.post('/finanzas/comprobantes', data),
  listarComprobantes: (params?: any) => api.get('/finanzas/comprobantes', { params }).then(r => r.data),
  obtenerCuentaCorriente: (tipo: 'cliente' | 'proveedor', id: string) => api.get(`/finanzas/cuenta-corriente/${tipo}/${id}`).then(r => r.data),
}

export const produccionApi = {
  listar:        () => api.get('/produccion').then(r => r.data),
  listarPedidos: () => api.get('/produccion').then(r => r.data),
  aprobarPresupuesto: (id: string) => api.post(`/produccion/aprobar/${id}`),
  obtenerEtapas: (pedidoId: string) => api.get(`/produccion/pedidos/${pedidoId}/etapas`).then(r => r.data),
  actualizarEtapa: (id: string, data: any) => api.patch(`/produccion/etapas/${id}`, data),
  actualizarEstado: (id: string, estado: string) => api.patch(`/produccion/pedidos/${id}/estado`, { estado }).then(r => r.data),
  actualizarOrden: (id: string, completada: boolean) => api.patch(`/produccion/ordenes/${id}`, { completada }).then(r => r.data),
}

export interface MovimientoStock {
  id:        string
  tipo:      string
  cantidad:  number
  motivo:    string
  creadoEn:  string
  usuarioId: string | null
  usuario?:  { nombre: string; email: string }
  insumoId?: string | null
  insumo?:   Insumo
  pedidoId?: string | null
  productoTalleId?: string | null
}

export const inventarioApi = {
  listarMovimientos: (params?: { insumoId?: string; productoTalleId?: string }): Promise<MovimientoStock[]> => 
    api.get<MovimientoStock[]>('/insumos/movimientos', { params }).then(res => res.data),
  ajustarInsumo: (data: { insumoId: string; tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE'; cantidad: number; motivo: string }) => 
    api.post('/insumos/stock-ajuste', data).then(res => res.data),
  ajustarProducto: (data: { productoTalleId: string; tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE'; cantidad: number; motivo: string }) => 
    api.post('/productos/stock-ajuste', data).then(res => res.data),
}

export interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  razonSocial: string | null
  cuit: string | null
  condicionIva: string
  tipoFactura: string
  activo: boolean
  vencimiento?: string | null
  ultimoCobro?: string | null
  configSuscripcion?: any
  documentos?: any
  saldo: number
}

export const clientesApi = {
  listar: async (): Promise<Cliente[]> => {
    const { data, error } = await supabase.from('clientes').select('*');
    if (error) throw error;
    return data as Cliente[];
  },
  crear: async (data: Partial<Cliente>): Promise<Cliente> => {
    const { data: result, error } = await supabase.from('clientes').insert([data]).select().single();
    if (error) throw error;
    return result as Cliente;
  },
  editar: async (id: string, data: Partial<Cliente>): Promise<Cliente> => {
    const { data: result, error } = await supabase.from('clientes').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result as Cliente;
  },
  eliminar: async (id: string): Promise<any> => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
}

export interface Institucion {
  id: string
  nombre:   string
  tipo:     string
  logoUrl:  string | null
  contacto: string | null
  telefono: string | null
  activo:   boolean
}

export const institucionesApi = {
  listar: (): Promise<Institucion[]> => api.get('/instituciones').then(r => r.data),
  crear: (data: Partial<Institucion>): Promise<Institucion> => api.post('/instituciones', data).then(r => r.data),
  listas: (id: string) => api.get(`/instituciones/${id}/listas`).then(r => r.data),
}

export const subCategoriasApi = {
  listar: (categoriaId?: string): Promise<SubCategoria[]> => 
    api.get<SubCategoria[]>('/sub-categorias', { params: { categoriaId } }).then(r => r.data),
  crear: (data: { nombre: string; categoriaId: string }): Promise<SubCategoria> => 
    api.post<SubCategoria>('/sub-categorias', data).then(r => r.data),
  eliminar: (id: string): Promise<any> => 
    api.delete(`/sub-categorias/${id}`).then(r => r.data),
}

export const configuracionApi = {
  get: (): Promise<Record<string, string>> => api.get('/configuracion').then(r => r.data),
  update: (data: Record<string, string>): Promise<any> => api.post('/configuracion', data).then(r => r.data),
}

export const authApi = {
  login: async (emailOrDni: string, password: string) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailOrDni,
      password,
    })
    if (authError) throw authError

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*, membresias(*, empresa:empresas(*))')
      .eq('id', authData.user.id)
      .single()
    
    if (userError) throw userError

    // Parse data to match expected structure
    const usuario = {
      ...userData,
      empresaId: userData.membresias?.[0]?.empresaId || '',
      rol: userData.membresias?.[0]?.rol || 'OPERADOR',
      permisos: userData.membresias?.[0]?.permisos || [],
      modulos: userData.membresias?.[0]?.empresa?.modulos || [],
      membresias: userData.membresias?.map((m: any) => ({
        empresaId: m.empresaId,
        empresaNombre: m.empresa.nombre,
        rol: m.rol,
        preferencias: m.preferencias,
      }))
    }

    return { token: authData.session.access_token, usuario }
  },
  registrarEmpresa: (data: any) =>
    api.post('/auth/register-empresa', data).then(r => r.data),
}

export const usuariosApi = {
  listar: () => api.get('/usuarios').then(r => r.data),
  crear: (data: any) => api.post('/usuarios', data).then(r => r.data),
  editar: (id: string, data: any) => api.patch(`/usuarios/${id}`, data).then(r => r.data),
  actualizar: (id: string, data: any) => api.patch(`/usuarios/${id}`, data).then(r => r.data),
  eliminar: (id: string) => api.delete(`/usuarios/${id}`).then(r => r.data),
  changePassword: (password: string) => api.post('/usuarios/change-password', { password }).then(r => r.data),
  actualizarPreferencias: (preferencias: Record<string, any>) => 
    api.patch('/usuarios/me/preferencias', { preferencias }).then(r => r.data),
  resetPassword: (id: string, adminPassword: string) => 
    api.post<{ temporaryPassword: string }>(`/usuarios/${id}/reset-password`, { adminPassword }).then(r => r.data),
}

export const comprasApi = {
  listarOrdenes: (params?: { proveedorId?: string; estado?: string }): Promise<OrdenCompra[]> =>
    api.get<OrdenCompra[]>('/compras/ordenes', { params }).then(r => r.data),
  obtenerOrden: (id: string): Promise<OrdenCompra> =>
    api.get<OrdenCompra>(`/compras/ordenes/${id}`).then(r => r.data),
  crearOrden: (data: any): Promise<OrdenCompra> =>
    api.post<OrdenCompra>('/compras/ordenes', data).then(r => r.data),
  registrarRecepcion: (data: any): Promise<RecepcionMercaderia> =>
    api.post<RecepcionMercaderia>('/compras/recepciones', data).then(r => r.data),
}

export const empresaApi = {
  getMe: () => api.get('/empresa/me').then(r => r.data),
  updateMe: (data: any) => api.patch('/empresa/me', data).then(r => r.data),
  getAbono: () => api.get('/empresa/abono').then(r => r.data),
}
