import * as React from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePopover } from '../hooks/usePopover';
import { useEscapeStack } from '../internal/escapeStack';
import { Modal } from './Modal';
import { NotificationList, type NotificationListProps } from './NotificationList';

export interface NotificationCenterProps extends Omit<NotificationListProps, 'maxHeight' | 'headerActions'> {
  /** Apertura controlada opcional. Sin esta propiedad, la campana la gestiona localmente. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Contenido de la campana; se monta dentro del botón accesible. */
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

/** Campana y bandeja controlada: desplegable en escritorio y pantalla completa en móvil. */
export function NotificationCenter({ items, title = 'Notificaciones', open, onOpenChange, trigger, triggerClassName, className, onActivate, ...listProps }: NotificationCenterProps) {
  const [localOpen, setLocalOpen] = React.useState(false);
  const isOpen = open ?? localOpen;
  const narrow = useMediaQuery('(max-width: 767px)');
  const id = React.useId();
  const unread = items.filter(item => !item.read).length;
  const changeOpen = React.useCallback((next: boolean) => { if (open === undefined) setLocalOpen(next); onOpenChange?.(next); }, [open, onOpenChange]);
  const dismiss = React.useCallback(() => changeOpen(false), [changeOpen]);
  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLButtonElement>({ open: isOpen && !narrow, onClose: dismiss, align: 'end', offset: 8, closeOnEscape: false });
  const closeAndFocus = React.useCallback(() => { changeOpen(false); anchorRef.current?.focus(); }, [changeOpen, anchorRef]);
  useEscapeStack(id, isOpen, closeAndFocus);
  React.useEffect(() => {
    if (!isOpen || narrow || !ready) return;
    const frame = requestAnimationFrame(() => popoverRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, narrow, ready, popoverRef]);
  const list = <NotificationList {...listProps} title={title} items={items} className="notification-center-list"
    onActivate={onActivate ? item => { changeOpen(false); onActivate(item); } : undefined}
    headerActions={<button type="button" className="notification-center-close" aria-label="Cerrar notificaciones" onClick={closeAndFocus}><UiIcon slot="x" size={18} /></button>} />;
  return <span className={cn('notification-center', className)}>
    <button ref={anchorRef} type="button" className={cn('notification-center-trigger', triggerClassName)} disabled={listProps.disabled}
      aria-label={`${title}: ${unread} sin leer`} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={isOpen && !narrow ? id : undefined} onClick={() => changeOpen(!isOpen)}>
      {trigger ?? <UiIcon slot="bell" size={19} />}{unread > 0 && <span className="notification-center-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {isOpen && !narrow && typeof document !== 'undefined' && createPortal(<div ref={popoverRef} id={id} role="dialog" aria-label={title} className={cn('notification-center-panel', !ready && 'invisible')} style={style}>{list}</div>, document.body)}
    <Modal isOpen={isOpen && narrow} onClose={dismiss} ariaLabel={title} dismissible={false} hideCancel noBodyPadding fullHeight
      className="notification-center-mobile" overlayClassName="notification-center-mobile-overlay">{list}</Modal>
  </span>;
}
