import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export type PopupTone = 'info' | 'success' | 'warning' | 'danger';

export interface PopupFrameProps {
  title?: string;
  subtitle?: string;
  tone?: PopupTone;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  dismissible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Barra inferior con acciones — derecha. */
  footer?: React.ReactNode;
}

const TONE_ICONS: Record<PopupTone, React.ReactNode> = {
  info: <Info size={20} className="text-blue-600" />,
  success: <CheckCircle size={20} className="text-emerald-600" />,
  warning: <AlertTriangle size={20} className="text-amber-600" />,
  danger: <AlertCircle size={20} className="text-rose-600" />,
};

/**
 * Frame visual de un popup imperativo. Se usa internamente desde
 * `PopupContext`. Para componentes controlados, preferir `Modal`.
 */
export const PopupFrame: React.FC<PopupFrameProps> = ({
  title,
  subtitle,
  tone,
  maxWidth = 'lg',
  dismissible = true,
  onClose,
  children,
  footer,
}) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose, dismissible]);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
  }[maxWidth];

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[var(--k-ink-900)]/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => dismissible && onClose()}
    >
      <div
        className={`w-full ${widthClass} max-h-[90vh] overflow-hidden rounded-[8px] shadow-xl bg-white dark:bg-slate-900 border border-[var(--k-line)] dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--k-line)] dark:border-slate-800">
            <div className="flex items-start gap-3 min-w-0">
              {tone && <div className="mt-0.5">{TONE_ICONS[tone]}</div>}
              <div className="min-w-0">
                {title && (
                  <h2 className="text-lg font-black text-[var(--k-ink-900)] dark:text-slate-100 truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-[var(--k-ink-500)] dark:text-slate-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {dismissible && (
              <button
                onClick={onClose}
                className="p-1.5 text-[var(--k-ink-400)] hover:text-[var(--k-ink-900)] dark:hover:text-slate-100 hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 rounded-[2px] transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 p-4 border-t border-[var(--k-line)] dark:border-slate-800 bg-[var(--k-surface)] dark:bg-slate-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

// Re-export Button for consumers that want to build footers easily
export { Button as PopupButton };
