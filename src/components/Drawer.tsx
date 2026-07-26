import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  /** sm 320px · md 420px · lg 560px · full. En móvil siempre ancho completo. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  title?: React.ReactNode;
  footer?: React.ReactNode;
  /** Backdrop + Escape cierran. Default true. */
  dismissible?: boolean;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'sm:w-[320px]',
  md: 'sm:w-[420px]',
  lg: 'sm:w-[560px]',
  full: 'sm:w-full',
};

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  side = 'right',
  size = 'md',
  title,
  footer,
  dismissible = true,
  children,
  className,
}) => {
  const { mounted, visible } = useAnimatedPresence({ open, duration: 300 });

  React.useEffect(() => {
    if (!open) return;
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
  }, [open, dismissible, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        className={cn(
          'absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => dismissible && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-y-0 flex flex-col w-full bg-[var(--bg-card,#ffffff)] shadow-2xl transition-transform duration-300 ease-out',
          sizeClasses[size],
          side === 'right'
            ? cn('right-0 sm:border-l border-[var(--border-default,#e2e8f0)]', !visible && 'translate-x-full')
            : cn('left-0 sm:border-r border-[var(--border-default,#e2e8f0)]', !visible && '-translate-x-full'),
          visible && 'translate-x-0',
          className,
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {(title || dismissible) && (
          <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-[var(--border-default,#e2e8f0)] shrink-0">
            <div className="text-[15px] font-bold text-[var(--fg-default,#0a1628)] truncate">
              {title}
            </div>
            {dismissible && (
              <button
                onClick={onClose}
                aria-label="Cerrar panel"
                className="p-1.5 text-[var(--fg-subtle,#94a3b8)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 rounded-[var(--k-radius-xs,2px)] transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 p-3 border-t border-[var(--border-default,#e2e8f0)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
