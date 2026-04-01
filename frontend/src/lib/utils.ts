export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export function pctColor(actual: number, anterior: number): string {
  if (!anterior) return 'text-gray-400'
  return actual >= anterior ? 'text-red-500' : 'text-green-600'
}

export function calcPct(actual: number, anterior: number): string {
  if (!anterior) return ''
  const pct = ((actual - anterior) / anterior) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    VIGENTE:   'bg-blue-50 text-blue-700',
    PEDIDO:    'bg-teal-50 text-teal-700',
    CERRADO:   'bg-gray-100 text-gray-500',
    CANCELADO: 'bg-red-50 text-red-600',
    CORTE:     'bg-amber-50 text-amber-700',
    BORDADO:   'bg-purple-50 text-purple-700',
    COSTURA:   'bg-blue-50 text-blue-700',
    TERMINADO: 'bg-teal-50 text-teal-700',
    ENTREGADO: 'bg-gray-100 text-gray-500',
  }
  return map[estado] ?? 'bg-gray-100 text-gray-500'
}
