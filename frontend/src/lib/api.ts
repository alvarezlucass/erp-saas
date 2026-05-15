import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

// Inyecta el token en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró, logout automático
api.interceptors.response.use(
  res => res,
  err => {
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
  listar:     (params?: { tipo?: string; categoria?: string; buscar?: string }): Promise<Insumo[]> =>
    api.get<Insumo[]>('/insumos', { params }).then(r => r.data),
  trazabilidad:  (id: string): Promise<{ historial: any[]; usos: any[] }> =>
    api.get(`/insumos/${id}/trazabilidad`).then(r => r.data),
  crear:      (data: any): Promise<Insumo> => api.post('/insumos', data).then(r => r.data),
  editar:     (id: string, data: any): Promise<Insumo> => api.patch(`/insumos/${id}`, data).then(r => r.data),
  eliminar:   (id: string): Promise<any> => api.delete(`/insumos/${id}`).then(r => r.data),
  actualizarPrecio: (id: string, costo: number, motivo?: string): Promise<any> =>
    api.patch(`/insumos/${id}/precio`, { costo, motivo }).then(r => r.data),
  actualizarMasivo: (data: { porcentaje: number; tipo?: string; categoria?: string; motivo?: string }): Promise<{actualizados: number}> => 
    api.post('/insumos/actualizar-masivo', data).then(r => r.data),
}

export const proveedoresApi = {
  listar: (): Promise<Proveedor[]> => api.get<Proveedor[]>('/proveedores').then(r => r.data),
  crear:  (data: Partial<Proveedor>): Promise<Proveedor> => api.post('/proveedores', data).then(r => r.data),
  editar: (id: string, data: Partial<Proveedor>): Promise<Proveedor> => api.patch(`/proveedores/${id}`, data).then(r => r.data),
  baja:   (id: string): Promise<any> => api.delete(`/proveedores/${id}`).then(r => r.data),
}

export const productosApi = {
  listar: (filtros?: { categoriaId?: string; buscar?: string }): Promise<Producto[]> => 
    api.get<Producto[]>('/productos', { params: filtros }).then(r => r.data),
  obtener: (id: string): Promise<Producto> => 
    api.get<Producto>(`/productos/${id}`).then(r => r.data),
  crear: (data: any): Promise<Producto> => 
    api.post<Producto>('/productos', data).then(r => r.data),
  editar: (id: string, data: any): Promise<Producto> => 
    api.patch<Producto>(`/productos/${id}`, data).then(r => r.data),
  eliminar: (id: string, hard?: boolean): Promise<any> => 
    api.delete(`/productos/${id}${hard ? '?hard=true' : ''}`).then(r => r.data),
  subirImagen: (file: File): Promise<{url: string}> => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  actualizarMasivo: (data: { porcentaje: number; categoriaId?: string; institucionId?: string; temporada?: string; motivo?: string }): Promise<{actualizados: number}> => 
    api.post('/productos/actualizar-masivo', data).then(r => r.data),
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
  listar:  (): Promise<Presupuesto[]> => api.get('/presupuestos').then(r => r.data),
  obtener: (id: string): Promise<Presupuesto> => api.get(`/presupuestos/${id}`).then(r => r.data),
  crear:   (data: any): Promise<Presupuesto> => api.post('/presupuestos', data).then(r => r.data),
  estado:  (id: string, estado: string): Promise<any> =>
    api.patch(`/presupuestos/${id}/estado`, { estado }).then(r => r.data),
  cobrar:  (id: string, data: any): Promise<Presupuesto> =>
    api.post(`/presupuestos/${id}/cobrar`, data).then(r => r.data),
}

export const finanzasApi = {
  crearComprobante: (data: any) => api.post('/finanzas/comprobantes', data),
  listarComprobantes: (params?: any) => api.get('/finanzas/comprobantes', { params }).then(r => r.data),
  obtenerCuentaCorriente: (tipo: 'cliente' | 'proveedor', id: string) => api.get(`/finanzas/cuenta-corriente/${tipo}/${id}`).then(r => r.data),
}

export const produccionApi = {
  listarPedidos: () => api.get('/produccion').then(r => r.data),
  aprobarPresupuesto: (id: string) => api.post(`/produccion/aprobar/${id}`),
  obtenerEtapas: (pedidoId: string) => api.get(`/produccion/pedidos/${pedidoId}/etapas`).then(r => r.data),
  actualizarEtapa: (id: string, data: any) => api.patch(`/produccion/etapas/${id}`, data),
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
  listar: (): Promise<Cliente[]> => api.get('/clientes').then(r => r.data),
  crear: (data: Partial<Cliente>): Promise<Cliente> => api.post('/clientes', data).then(r => r.data),
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
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
}

export const usuariosApi = {
  listar: () => api.get('/usuarios').then(r => r.data),
  crear: (data: any) => api.post('/usuarios', data).then(r => r.data),
  editar: (id: string, data: any) => api.patch(`/usuarios/${id}`, data).then(r => r.data),
  actualizar: (id: string, data: any) => api.patch(`/usuarios/${id}`, data).then(r => r.data),
  eliminar: (id: string) => api.delete(`/usuarios/${id}`).then(r => r.data),
  changePassword: (password: string) => api.post('/usuarios/change-password', { password }).then(r => r.data),
  actualizarPreferencias: (preferencias: Record<string, any>) => 
    api.patch('/usuarios/me/preferencias', { preferencias }).then(r => r.data)
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
  updateMe: (data: any) => api.patch('/empresa/me', data).then(r => r.data)
}
