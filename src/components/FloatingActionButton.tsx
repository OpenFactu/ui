import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useEscapeStack } from '../internal/escapeStack';
import { useMobileViewport } from '../hooks/useMobileViewport';
import { useIsNarrow } from '../hooks/useMediaQuery';

export interface FloatingAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}
export interface FloatingActionButtonProps {
  actions: readonly FloatingAction[];
  label?: string;
  closeLabel?: string;
  icon?: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Permite ajustar los márgenes para barras de navegación o compositores propios. */
  style?: React.CSSProperties;
}

/** Menú de acciones del consumidor, con anclaje fijo y controles táctiles de al menos 48 px. */
export function FloatingActionButton({ actions, label = 'Acciones rápidas', closeLabel = 'Cerrar acciones', icon, position = 'bottom-right', open, onOpenChange, disabled, className, style }: FloatingActionButtonProps) {
  const [localOpen, setLocalOpen] = React.useState(false);
  const viewport = useMobileViewport(); const mobile = useIsNarrow(768);
  const [pending, setPending] = React.useState<string>();
  const [error, setError] = React.useState('');
  const busy = React.useRef(false);
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const keyboard = React.useRef(false);
  const focusRequest = React.useRef<'first' | 'last' | null>(null);
  const interaction = React.useRef(0);
  const id = React.useId();
  const isOpen = !!(open ?? localOpen) && !disabled && actions.length > 0 && !(mobile && viewport.editing);
  const currentOpen = React.useRef(isOpen); currentOpen.current = isOpen;
  const { mounted, visible } = useAnimatedPresence({ open: isOpen, duration: 180 });
  const changeOpen = React.useCallback((next: boolean) => { interaction.current++; if (open === undefined) setLocalOpen(next); onOpenChange?.(next); if (next) setError(''); }, [open, onOpenChange]);
  const close = React.useCallback((restoreFocus = true) => { changeOpen(false); if (restoreFocus) trigger.current?.focus(); }, [changeOpen]);
  React.useEffect(() => { interaction.current++; }, [open]);
  React.useEffect(() => { if (mobile && viewport.editing && (open ?? localOpen)) changeOpen(false); }, [mobile, viewport.editing, open, localOpen, changeOpen]);
  useEscapeStack(id, isOpen, close);
  const enabledButtons = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? []);
  React.useEffect(() => {
    if (!isOpen || !mounted || !focusRequest.current) return;
    const buttons = enabledButtons(); const target = focusRequest.current === 'last' ? buttons[buttons.length - 1] : buttons[0];
    focusRequest.current = null; target?.focus();
  }, [isOpen, mounted, actions]);
  React.useEffect(() => {
    if (!isOpen) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) changeOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [isOpen, changeOpen]);
  async function activate(action: FloatingAction) {
    if (disabled || action.disabled || busy.current) return;
    const started = interaction.current;
    busy.current = true; setPending(action.id); setError('');
    try {
      await action.onClick();
      if (started === interaction.current && currentOpen.current) close(document.activeElement === document.body || !!root.current?.contains(document.activeElement));
    }
    catch (cause) { if (started === interaction.current && currentOpen.current) setError(cause instanceof Error ? cause.message : 'No se ha podido completar la acción. Inténtalo de nuevo.'); }
    finally { busy.current = false; setPending(undefined); }
  }
  function navigate(event: React.KeyboardEvent) {
    if (event.key === 'Tab') { changeOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const buttons = enabledButtons(); if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  return <div ref={root} className={cn('k-floating-actions', className)} data-k-editing={mobile && viewport.editing || undefined} data-position={position} data-open={isOpen || undefined} data-keyboard={keyboard.current || undefined} style={style}>
    {mounted && <div className="k-floating-actions-panel" data-visible={visible || undefined} aria-hidden={!isOpen || undefined} inert={!isOpen || undefined}>
      <div ref={menu} id={id} role="menu" aria-label={label} aria-busy={!!pending} className="k-floating-actions-menu" onKeyDown={navigate}>
        {actions.map(action => <button key={action.id} type="button" role="menuitem" tabIndex={-1} className="k-floating-action" disabled={disabled || !!pending || action.disabled} onClick={() => void activate(action)}>
          <span className="k-floating-action-label">{action.label}</span><span className="k-floating-action-icon" aria-hidden="true">{pending === action.id ? <UiIcon slot="loader-2" className="k-floating-action-spinner" size={19} /> : action.icon ?? <UiIcon slot="arrow-up-right" size={19} />}</span>
        </button>)}
      </div>{error && <p className="k-floating-actions-error" role="alert">{error}</p>}
    </div>}
    <button ref={trigger} type="button" className="k-floating-actions-trigger" aria-label={isOpen ? closeLabel : label} title={isOpen ? closeLabel : label}
      aria-haspopup="menu" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} disabled={disabled || !actions.length}
      onClick={event => { keyboard.current = event.detail === 0; if (!isOpen && keyboard.current) focusRequest.current = 'first'; changeOpen(!isOpen); }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); keyboard.current = true; focusRequest.current = event.key === 'ArrowUp' ? 'last' : 'first'; if (isOpen) { const buttons = enabledButtons(); (focusRequest.current === 'last' ? buttons[buttons.length - 1] : buttons[0])?.focus(); focusRequest.current = null; } else changeOpen(true); } else if (event.key === 'Tab' && isOpen) changeOpen(false); }}>
      <span className={icon ? undefined : 'k-floating-actions-plus'} aria-hidden="true">{icon ?? <UiIcon slot="plus" size={25} />}</span>
    </button>
  </div>;
}
