import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { useEscapeStack } from '../internal/escapeStack';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  /** sm 320px · md 420px · lg 560px · full. En móvil siempre ancho completo. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Nombre del diálogo cuando no hay título visible. */
  ariaLabel?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
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
  subtitle,
  ariaLabel,
  initialFocusRef,
  footer,
  dismissible = true,
  children,
  className,
}) => {
  const { mounted, visible } = useAnimatedPresence({ open, duration: 300 });
  const id = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { enabled: open && mounted, initialFocusRef });
  useScrollLock(mounted);
  const dismiss = React.useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);
  useEscapeStack(id, open, dismiss);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40" inert={!open || undefined}>
      <div
        className={cn(
          'absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (title == null ? 'Panel lateral' : undefined)}
        aria-labelledby={!ariaLabel && title != null ? `${id}-title` : undefined}
        aria-describedby={subtitle ? `${id}-description` : undefined}
        className={cn(
          'absolute inset-y-0 flex flex-col w-full bg-[var(--bg-card,#ffffff)] text-[var(--fg-default)] shadow-2xl transition-transform duration-300 ease-out focus:outline-none',
          sizeClasses[size],
          side === 'right'
            ? cn(
                'right-0 sm:border-l border-[var(--border-default,#e2e8f0)]',
                !visible && 'translate-x-full',
              )
            : cn(
                'left-0 sm:border-r border-[var(--border-default,#e2e8f0)]',
                !visible && '-translate-x-full',
              ),
          visible && 'translate-x-0',
          className,
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {(title || subtitle || dismissible) && (
          <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-[var(--border-default,#e2e8f0)] shrink-0">
            <div className="min-w-0">
              {title != null && (
                <h2 id={`${id}-title`} className="text-[15px] font-bold truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id={`${id}-description`} className="mt-1 text-[12px] text-[var(--fg-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel"
                className="p-1.5 text-[var(--fg-subtle,#657486)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover)] rounded-[var(--k-radius-xs,2px)] transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 p-3 border-t border-[var(--border-default,#e2e8f0)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
