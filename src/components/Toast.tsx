import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onClose: (id: string) => void;
}

/**
 * Componente Toast individual para notificaciones.
 * Diseñado con estética limpia y moderna.
 */
export const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', onClose }) => {
  const icons = {
    success: <CheckCircle className="text-[#16A34A]" size={18} />,
    error: <AlertCircle className="text-[#DC2626]" size={18} />,
    info: <Info className="text-[#2563EB]" size={18} />,
    warning: <AlertTriangle className="text-[#D97706]" size={18} />,
  };

  const borderClasses = {
    success: 'border-[#BBF7D0] dark:border-emerald-500/30 bg-white dark:bg-slate-900',
    error: 'border-[#FECACA] dark:border-rose-500/30 bg-white dark:bg-slate-900',
    info: 'border-[#BFDBFE] dark:border-blue-500/30 bg-white dark:bg-slate-900',
    warning: 'border-[#FDE68A] dark:border-amber-500/30 bg-white dark:bg-slate-900',
  };

  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[4px] border p-3 shadow-lg transition-all animate-in slide-in-from-right-8 fade-in-0 duration-300',
        borderClasses[type],
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-[2px] bg-[var(--k-surface)] dark:bg-slate-800 flex items-center justify-center border border-[var(--k-line)] dark:border-slate-700">
        {icons[type]}
      </div>
      <div className="flex-1 text-[13px] font-medium text-[var(--k-ink-900)] dark:text-slate-100 leading-tight">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 rounded-[2px] p-1.5 text-[var(--k-ink-400)] hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 hover:text-[var(--k-ink-900)] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
