import { useMergedRefs } from '../hooks/useMergedRefs';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useDragDismiss } from '../motion/useDragDismiss';
import { BottomSheet } from './BottomSheet';
import { useEscapeStack } from '../internal/escapeStack';
import type { MobilePresentation } from './internal/mobilePresentation';

export interface DrawerProps {
  mobilePresentation?: MobilePresentation;
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
  mobilePresentation = 'auto',
}) => {
  const { mounted, state, ref: presenceRef } = useAnimatedPresence({ open });
  const id = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const narrow = useIsMobile();
  // En móvil con presentación de hoja se usa la `BottomSheet` común (anclajes, inercia); ella atrapa el foco, bloquea
  // el scroll y atiende a Escape.
  const asSheet = narrow && mobilePresentation === 'sheet';
  useFocusTrap(dialogRef, { enabled: open && mounted && !asSheet, initialFocusRef });
  useScrollLock(mounted && !asSheet);
  const dismiss = React.useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);
  useEscapeStack(id, open && !asSheet, dismiss);

  // Con el dedo se arrastra hacia su borde y se va con la velocidad con que se suelte.
  const scrimRef = React.useRef<HTMLDivElement>(null);
  const openRef = React.useRef(open);
  openRef.current = open;
  const drag = useDragDismiss({
    axis: 'x',
    direction: side === 'right' ? 1 : -1,
    disabled: !dismissible || asSheet,
    onProgress: (p) => {
      const o = scrimRef.current;
      if (!o) return;
      o.style.transition = p > 0 ? 'none' : '';
      o.style.opacity = p > 0 ? String(1 - p) : '';
    },
    onDismiss: () => {
      onClose();
      setTimeout(() => {
        if (!openRef.current) return;
        drag.reset();
        if (scrimRef.current) { scrimRef.current.style.opacity = ''; scrimRef.current.style.transition = ''; }
      }, 0);
    },
  });
  const setDialogRef = useMergedRefs<HTMLDivElement>(dialogRef, presenceRef as React.Ref<HTMLElement> as React.Ref<HTMLDivElement>, drag.ref as React.Ref<HTMLElement> as React.Ref<HTMLDivElement>);

  if (asSheet) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        dismissible={dismissible}
        snapPoints={['auto']}
        title={title}
        aria-label={ariaLabel ?? (title == null ? 'Panel lateral' : undefined)}
        initialFocusRef={initialFocusRef}
        footer={footer}
        className={className}
      >
        {subtitle && <p className="m-0 mb-3 text-[12px] text-[var(--fg-muted)]">{subtitle}</p>}
        {children}
      </BottomSheet>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40" inert={!open || undefined}>
      <div
        ref={scrimRef}
        data-state={state}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm k-scrim"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={setDialogRef}
        {...drag.bind}
        tabIndex={-1}
        role="dialog"
        data-k-mobile-presentation={mobilePresentation === 'auto' ? 'fullscreen' : mobilePresentation}
        data-state={state}
        data-side={side}
        aria-modal="true"
        aria-label={ariaLabel ?? (title == null ? 'Panel lateral' : undefined)}
        aria-labelledby={!ariaLabel && title != null ? `${id}-title` : undefined}
        aria-describedby={subtitle ? `${id}-description` : undefined}
        className={cn(
          'k-drawer absolute inset-y-0 flex flex-col w-full bg-[var(--bg-card,#ffffff)] text-[var(--fg-default)] shadow-2xl k-sheet focus:outline-none',
          sizeClasses[size],
          side === 'right'
            ? 'right-0 sm:border-l border-[var(--border-default,#e2e8f0)]'
            : 'left-0 sm:border-r border-[var(--border-default,#e2e8f0)]',
          className,
        )}
        style={{
          ...drag.style,
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
                <UiIcon slot="x" size={18} />
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
