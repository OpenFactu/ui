import * as React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../utils';
import { Button, type ButtonProps } from './Button';
import { useScrollLock } from '../hooks/useScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';

export type ModalSize =
  | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  | 'full'
  /** Ancho de editor: w-[min(96vw,1100px)]. */
  | 'screen';

export type ModalTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

export interface ModalAction {
  label: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: ButtonProps['variant'];
  icon?: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  /** 'submit' envía el `<form>` interno cuando se usa `onSubmit`. */
  type?: 'button' | 'submit';
}

export interface ModalStep {
  key: string;
  label: string;
  description?: string;
  optional?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;

  // ── Cabecera ──────────────────────────────────────────────────────────
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Antetítulo en versales pequeñas sobre el título. */
  eyebrow?: React.ReactNode;
  /** Icono en un chip a la izquierda del título. */
  icon?: React.ReactNode;
  tone?: ModalTone;
  /** Nodos extra en la cabecera, junto al botón de cerrar. */
  headerActions?: React.ReactNode;

  // ── Tamaño y disposición ──────────────────────────────────────────────
  size?: ModalSize;
  /**
   * @deprecated Usa `size`. Se mantiene por compatibilidad y, si se pasa,
   * tiene prioridad sobre `size`.
   */
  maxWidth?: ModalSize;
  /** Altura fija tipo editor: h-[min(92vh,760px)]. */
  fullHeight?: boolean;
  noBodyPadding?: boolean;
  /** 'body' (default): cabecera y pie fijos. 'container': scrollea el panel entero. */
  scrollBehavior?: 'body' | 'container';

  // ── Pie ───────────────────────────────────────────────────────────────
  /** Pie a medida. Tiene prioridad sobre las acciones. */
  footer?: React.ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  /** Acción alineada a la izquierda del pie. */
  tertiaryAction?: ModalAction;
  hideCancel?: boolean;
  cancelLabel?: string;

  // ── Formulario ────────────────────────────────────────────────────────
  /** Envuelve el cuerpo en un `<form>`; Intro envía y la acción primaria pasa a submit. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;

  // ── Estado ────────────────────────────────────────────────────────────
  /** Capa de carga sobre el cuerpo (para cargar los datos del diálogo). */
  isLoading?: boolean;
  loadingLabel?: string;
  /** Operación en curso: inhabilita las acciones e impide cerrar. */
  isBusy?: boolean;
  /** Banda de error encima del pie. */
  error?: React.ReactNode;

  // ── Asistente por pasos ───────────────────────────────────────────────
  steps?: ModalStep[];
  /** Índice 0-based del paso actual. */
  currentStep?: number;
  onStepChange?: (index: number) => void;

  // ── Comportamiento ────────────────────────────────────────────────────
  zIndex?: number | string;
  /** Muestra la X y permite cerrar con Escape. Default true. */
  dismissible?: boolean;
  /** Cerrar al pulsar fuera. Default **false**: la mayoría son formularios. */
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  container?: HTMLElement | null;
  lockScroll?: boolean;

  className?: string;
  overlayClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs: 'max-w-xs',
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
  screen: 'w-[min(96vw,1100px)] max-w-none',
};

const TONE_ICON: Record<Exclude<ModalTone, 'default'>, React.ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  danger: <AlertCircle size={18} />,
};

const TONE_CHIP: Record<ModalTone, string> = {
  default: 'bg-accent/10 text-accent',
  info: 'bg-[var(--k-info-bg)] text-[var(--k-info-fg)]',
  success: 'bg-[var(--k-success-bg)] text-[var(--k-success-fg)]',
  warning: 'bg-[var(--k-warning-bg)] text-[var(--k-warning-fg)]',
  danger: 'bg-[var(--k-danger-bg)] text-[var(--k-danger-fg)]',
};

/** Profundidad de anidamiento, para apilar diálogos abiertos unos sobre otros. */
const ModalDepthContext = React.createContext(0);

/**
 * Pila de diálogos abiertos. Escape solo debe cerrar el de arriba: sin esto,
 * cada diálogo escucha en `document` y una sola pulsación los cierra todos.
 */
const escapeStack: string[] = [];

function useEscapeStack(id: string, active: boolean, onEscape: () => void): void {
  React.useEffect(() => {
    if (!active) return;
    escapeStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (escapeStack[escapeStack.length - 1] !== id) return;
      e.stopPropagation();
      onEscape();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      const idx = escapeStack.lastIndexOf(id);
      if (idx !== -1) escapeStack.splice(idx, 1);
      document.removeEventListener('keydown', onKey);
    };
  }, [id, active, onEscape]);
}

// ── Subcomponentes de composición ───────────────────────────────────────

export interface ModalHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: ModalTone;
  onClose?: () => void;
  dismissible?: boolean;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  tone = 'default',
  onClose,
  dismissible = true,
  actions,
  className,
  children,
  id,
}) => {
  const chipIcon = icon ?? (tone !== 'default' ? TONE_ICON[tone] : null);
  return (
    <div
      className={cn(
        'shrink-0 px-6 py-4 border-b border-[var(--border-default,#e2e8f0)] flex items-start justify-between gap-4 bg-[var(--bg-card,#ffffff)]',
        className,
      )}
    >
      {children ?? (
        <div className="flex items-start gap-3 min-w-0">
          {chipIcon && (
            <span
              className={cn(
                'shrink-0 flex items-center justify-center h-9 w-9 rounded-[var(--k-radius-xs,2px)]',
                TONE_CHIP[tone],
              )}
            >
              {chipIcon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#94a3b8)] mb-0.5">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                id={id}
                className="text-[16px] font-semibold font-display text-[var(--fg-default,#0a1628)] truncate"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12px] text-[var(--fg-subtle,#94a3b8)] mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        {dismissible && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 text-[var(--fg-subtle,#94a3b8)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--k-surface)] dark:hover:bg-slate-800 rounded-[var(--k-radius-xs,2px)] transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export interface ModalBodyProps {
  noPadding?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ noPadding, className, children }) => (
  <div
    data-modal-body
    className={cn('flex-1 min-h-0 overflow-y-auto', !noPadding && 'p-6', className)}
  >
    {children}
  </div>
);

export interface ModalFooterProps {
  align?: 'end' | 'between' | 'start';
  className?: string;
  children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  align = 'end',
  className,
  children,
}) => (
  <div
    className={cn(
      'shrink-0 flex items-center gap-2 px-6 py-3 border-t border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted,#f8fafc)]',
      align === 'end' && 'justify-end',
      align === 'between' && 'justify-between',
      align === 'start' && 'justify-start',
      className,
    )}
  >
    {children}
  </div>
);

function renderAction(action: ModalAction | undefined, fallbackVariant: ButtonProps['variant'], busy: boolean) {
  if (!action) return null;
  return (
    <Button
      type={action.type ?? 'button'}
      variant={action.variant ?? fallbackVariant}
      onClick={action.onClick}
      disabled={action.disabled || busy}
      isLoading={action.isLoading}
    >
      {action.icon}
      {action.label}
    </Button>
  );
}

// ── Componente principal ────────────────────────────────────────────────

const ModalRoot: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  eyebrow,
  icon,
  tone = 'default',
  headerActions,
  size = 'md',
  maxWidth,
  fullHeight = false,
  noBodyPadding = false,
  scrollBehavior = 'body',
  footer,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  hideCancel = false,
  cancelLabel = 'Cancelar',
  onSubmit,
  isLoading = false,
  loadingLabel = 'Cargando…',
  isBusy = false,
  error,
  steps,
  currentStep = 0,
  onStepChange,
  zIndex,
  dismissible = true,
  closeOnOverlayClick = false,
  closeOnEscape = true,
  initialFocusRef,
  container,
  lockScroll = true,
  className,
  overlayClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  children,
}) => {
  const depth = React.useContext(ModalDepthContext);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const { mounted, visible } = useAnimatedPresence({ open: isOpen, duration: 200 });

  useScrollLock(lockScroll && mounted);
  useFocusTrap(panelRef, {
    enabled: mounted,
    initialFocusRef,
    // Sin esto el foco iría al botón de cerrar, que en el DOM va antes.
    preferredRegionSelector: '[data-modal-body]',
  });

  const canDismiss = dismissible && !isBusy;
  useEscapeStack(titleId, mounted && closeOnEscape && canDismiss, onClose);

  if (!mounted) return null;

  const widthClass = SIZE_CLASSES[maxWidth ?? size] ?? SIZE_CLASSES.md;
  const resolvedZ = zIndex ?? `calc(var(--k-z-modal, 99999) + ${depth * 10})`;

  const hasActions = !!(primaryAction || secondaryAction || tertiaryAction || !hideCancel);
  const showFooter = footer !== undefined ? footer !== null : hasActions && !!primaryAction;

  const footerNode = footer ?? (
    showFooter ? (
      <ModalFooter align={tertiaryAction ? 'between' : 'end'} className={footerClassName}>
        {tertiaryAction && renderAction(tertiaryAction, 'ghost', isBusy)}
        <div className="flex items-center gap-2">
          {!hideCancel &&
            renderAction(
              secondaryAction ?? { label: cancelLabel, onClick: onClose },
              'secondary',
              isBusy,
            )}
          {renderAction(
            primaryAction ? { type: onSubmit ? 'submit' : 'button', ...primaryAction } : undefined,
            tone === 'danger' ? 'danger' : 'accent',
            isBusy,
          )}
        </div>
      </ModalFooter>
    ) : null
  );

  const bodyContent = (
    <>
      {steps && steps.length > 0 && (
        <ol className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-[var(--border-default,#e2e8f0)]">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <li key={step.key} className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onStepChange?.(i)}
                  disabled={!onStepChange}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 text-[12px] transition-colors',
                    onStepChange && 'hover:text-accent',
                    active
                      ? 'text-accent font-medium'
                      : done
                        ? 'text-[var(--fg-body,#2d3a4a)]'
                        : 'text-[var(--fg-subtle,#94a3b8)]',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-mono font-semibold shrink-0',
                      active
                        ? 'bg-accent text-[color:var(--color-accent-fg)]'
                        : done
                          ? 'bg-accent/15 text-accent'
                          : 'bg-[var(--k-line-2)] dark:bg-slate-800 text-[var(--fg-subtle,#94a3b8)]',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="truncate">{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <span className="h-px w-4 bg-[var(--k-line)] dark:bg-slate-700 shrink-0" />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div
        data-modal-body
        className={cn(
          scrollBehavior === 'body' ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-1',
          !noBodyPadding && 'p-6',
          bodyClassName,
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--fg-subtle,#94a3b8)]">
            <span className="h-6 w-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <span className="font-mono text-[11px] tracking-wider uppercase">{loadingLabel}</span>
          </div>
        ) : (
          children
        )}
      </div>

      {error && (
        <div className="shrink-0 px-6 py-2.5 border-t border-[var(--k-danger)]/30 bg-[var(--k-danger-bg)] text-[12px] text-[var(--k-danger-fg)] flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {footerNode}
    </>
  );

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'w-full flex flex-col rounded-[var(--k-radius-md,8px)] shadow-xl bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)] transition-all duration-200',
        widthClass,
        fullHeight ? 'h-[min(92vh,760px)]' : 'max-h-[90vh]',
        scrollBehavior === 'container' ? 'overflow-y-auto' : 'overflow-hidden',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className,
      )}
    >
      {(title || subtitle || eyebrow || icon || tone !== 'default' || dismissible) && (
        <ModalHeader
          id={titleId}
          title={title}
          subtitle={subtitle}
          eyebrow={eyebrow}
          icon={icon}
          tone={tone}
          onClose={onClose}
          dismissible={canDismiss}
          actions={headerActions}
          className={headerClassName}
        />
      )}
      {onSubmit ? (
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          {bodyContent}
        </form>
      ) : (
        bodyContent
      )}
    </div>
  );

  return createPortal(
    <ModalDepthContext.Provider value={depth + 1}>
      <div
        style={{ zIndex: resolvedZ }}
        onClick={() => closeOnOverlayClick && canDismiss && onClose()}
        className={cn(
          'fixed inset-0 flex items-center justify-center p-4 bg-[var(--k-ink-900)]/40 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
          overlayClassName,
        )}
      >
        {panel}
      </div>
    </ModalDepthContext.Provider>,
    container ?? document.body,
  );
};

type ModalComponent = React.FC<ModalProps> & {
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
};

export const Modal = ModalRoot as ModalComponent;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
