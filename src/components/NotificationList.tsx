import * as React from 'react';
import { Bell, Check, Mail, X } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './Button';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';

export interface NotificationItem {
  id: string;
  title: string;
  description?: React.ReactNode;
  read: boolean;
  timestamp?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}
export interface NotificationListProps {
  items: NotificationItem[];
  title?: string;
  onActivate?: (item: NotificationItem) => void;
  onReadChange?: (item: NotificationItem, read: boolean) => void;
  /** Recibe los IDs no leídos de la lista recibida, sin afectar otras páginas. */
  onMarkAllRead?: (ids: string[]) => void;
  onDismiss?: (item: NotificationItem) => void;
  disabled?: boolean;
  maxHeight?: number | string;
  className?: string;
}

/** Bandeja controlada. Abrir una notificación no cambia su lectura automáticamente. */
export const NotificationList: React.FC<NotificationListProps> = ({
  items,
  title = 'Notificaciones',
  onActivate,
  onReadChange,
  onMarkAllRead,
  onDismiss,
  disabled = false,
  maxHeight,
  className,
}) => {
  const id = React.useId();
  const unread = items.filter((item) => !item.read);
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'overflow-hidden rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-card)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2">
          <h2 id={id} className="text-sm font-semibold text-[var(--fg-default)]">
            {title}
          </h2>
          <Badge variant={unread.length ? 'info' : 'neutral'}>{unread.length} sin leer</Badge>
        </div>
        {onMarkAllRead && (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={disabled || !unread.length}
            onClick={() => onMarkAllRead(unread.map((item) => item.id))}
          >
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {!items.length ? (
        <EmptyState variant="compact" icon={<Bell size={24} />} title="No hay notificaciones" />
      ) : (
        <ul
          aria-label={title}
          className="divide-y divide-[var(--border-default)] overflow-y-auto"
          style={{ maxHeight }}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={cn('flex gap-3 p-4', !item.read && 'bg-[var(--bg-muted)]')}
            >
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--fg-muted)]">
                {item.icon ?? <Bell size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="sr-only">{item.read ? 'Leída. ' : 'Sin leer. '}</span>
                    {onActivate ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onActivate(item)}
                        className="break-words text-left text-[13px] font-semibold text-[var(--fg-default)] hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {item.title}
                      </button>
                    ) : (
                      <p className="break-words text-[13px] font-semibold text-[var(--fg-default)]">
                        {item.title}
                      </p>
                    )}
                  </div>
                  {!item.read && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                    />
                  )}
                </div>
                {item.description && (
                  <div className="mt-1 text-[12px] text-[var(--fg-muted)]">{item.description}</div>
                )}
                {item.timestamp && (
                  <div className="mt-2 text-[11px] text-[var(--fg-subtle)]">{item.timestamp}</div>
                )}
                {(onReadChange || onDismiss || item.action) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onReadChange && (
                      <Button
                        type="button"
                        size="sm"
                        variant="soft"
                        disabled={disabled}
                        aria-label={`${item.read ? 'Marcar sin leer' : 'Marcar como leída'}: ${item.title}`}
                        onClick={() => onReadChange(item, !item.read)}
                      >
                        {item.read ? <Mail size={13} /> : <Check size={13} />}
                        {item.read ? 'Sin leer' : 'Marcar leída'}
                      </Button>
                    )}
                    {onDismiss && (
                      <Button
                        type="button"
                        size="sm"
                        variant="link"
                        disabled={disabled}
                        aria-label={`Descartar: ${item.title}`}
                        onClick={() => onDismiss(item)}
                      >
                        <X size={13} />
                        Descartar
                      </Button>
                    )}
                    {item.action}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
