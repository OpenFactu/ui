import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useScrollLock } from '../hooks/useScrollLock';

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

// Los iconos usan los tokens de estado, no un azul y un verde de Tailwind:
// esto sale en TODOS los diálogos de confirmación, así que un color fijo aquí
// se ve en toda la aplicación por muy tematizada que esté.
const TONE_ICONS: Record<PopupTone, React.ReactNode> = {
  info: <Info size={20} className="text-[var(--k-info)]" />,
  success: <CheckCircle size={20} className="text-[var(--k-success)]" />,
  warning: <AlertTriangle size={20} className="text-[var(--k-warning)]" />,
  danger: <AlertCircle size={20} className="text-[var(--k-danger)]" />,
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
  // Con contador: cerrar un popup abierto sobre otro ya no desbloquea el
  // scroll del que sigue abierto debajo.
  useScrollLock(true);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose, dismissible]);

  // Un diálogo que el lector de pantalla no anuncia como diálogo es, para quien
  // no mira la pantalla, texto que aparece de la nada. `Modal` ya lo hacía bien;
  // esto no, y es lo que usan TODAS las confirmaciones.
  const titleId = React.useId();
  const subtitleId = React.useId();

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
      className="fixed inset-0 z-[var(--k-z-modal,99999)] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--k-ink-900)_45%,transparent)] backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => dismissible && onClose()}
    >
      <div
        // 'alertdialog' y no 'dialog': un popup con tono interrumpe y espera una
        // respuesta, que es justo la diferencia entre los dos papeles.
        role={tone ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`w-full ${widthClass} max-h-[90vh] overflow-hidden rounded-[var(--k-radius-md,8px)] shadow-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)] animate-in zoom-in-95 duration-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border-default,#e2e8f0)]">
            <div className="flex items-start gap-3 min-w-0">
              {tone && <div className="mt-0.5">{TONE_ICONS[tone]}</div>}
              <div className="min-w-0">
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-black text-[var(--fg-default,#0a1628)] truncate"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p id={subtitleId} className="text-sm text-[var(--fg-muted,#52606f)] mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {dismissible && (
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="p-1.5 text-[var(--fg-subtle,#657486)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover)] rounded-[var(--k-radius-xs,2px)] transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted,#f8fafc)]">
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
