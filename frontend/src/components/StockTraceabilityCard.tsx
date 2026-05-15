import React, { useEffect, useState } from 'react';
import { inventarioApi, MovimientoStock } from '../lib/api';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  insumoId?: string;
  productoId?: string;
  productoTalleId?: string;
  title?: string;
}

const StockTraceabilityCard: React.FC<Props> = ({ insumoId, productoId, productoTalleId, title = "Ficha de Trazabilidad Industrial" }) => {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovimientos = async () => {
      setLoading(true);
      try {
        const data = await inventarioApi.listarMovimientos({ insumoId, productoTalleId });
        setMovimientos(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching traceability:', err);
        setError('No se pudo cargar el historial de movimientos.');
      } finally {
        setLoading(false);
      }
    };

    if (insumoId || productoId || productoTalleId) {
      fetchMovimientos();
    }
  }, [insumoId, productoId, productoTalleId]);

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <History size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Últimos 20 movimientos auditados</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Auditoría activa
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Fecha / Hora</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Operación</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cant.</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Motivo / Origen</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <AlertCircle size={32} strokeWidth={1.5} />
                    <p className="text-sm">No hay movimientos registrados para este ítem.</p>
                  </div>
                </td>
              </tr>
            ) : (
              movimientos.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {format(new Date(mov.creadoEn), 'dd MMM, yyyy', { locale: es })}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {format(new Date(mov.creadoEn), 'HH:mm')}hs
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                      mov.cantidad > 0 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {mov.cantidad > 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      {mov.tipo.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${mov.cantidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate" title={mov.motivo}>
                        {mov.motivo}
                      </span>
                      {mov.pedidoId && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                          <FileText size={8} /> Ref: Pedido
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                        <User size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {mov.usuario?.nombre || 'SISTEMA'}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-none truncate w-24">
                          {mov.usuario?.email || 'Auto-proceso'}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-800">
         <p className="text-[10px] text-slate-400 font-medium">
           Trazabilidad completa asegurada por protocolo de auditoría UniFAI v4.0
         </p>
      </div>
    </div>
  );
};

export default StockTraceabilityCard;
