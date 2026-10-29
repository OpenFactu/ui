import * as React from 'react';
import { UiIcon, type IconSlot } from '../icons';
import { cn } from '../utils';
import { Collapse } from './Collapse';
import { safeStorage } from '../internal/storage';

export type BannerTone = 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BannerProps {
  tone?: BannerTone;
  /** `bar` (por defecto): franja a todo el ancho, para avisos de la aplicación. `card`: bloque con borde, dentro de una página. */
  variant?: 'bar' | 'card';
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Botones o enlaces a la derecha. */
  actions?: React.ReactNode;
  /** Icono propio; por defecto el del tono. `false` lo quita. */
  icon?: React.ReactNode | false;
  /** Se puede cerrar. Con `storageKey`, cerrado se queda cerrado en ese navegador. */
  dismissible?: boolean;
  storageKey?: string;
  onDismiss?: () => void;
  className?: string;
}

const ICONS: Record<BannerTone, IconSlot> = { accent: 'sparkles', info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle', neutral: 'bell' };

/**
 * Aviso de anuncio (nueva función, mantenimiento programado, prueba que caduca). Se pliega al cerrarlo y, con
 * `storageKey`, no vuelve a salir en ese navegador.
 */
export const Banner: React.FC<BannerProps> = ({ tone = 'accent', variant = 'bar', title, children, actions, icon, dismissible, storageKey, onDismiss, className }) => {
  const key = storageKey ? `k-banner:${storageKey}` : null;
  const [open, setOpen] = React.useState(() => !(key && safeStorage.get(key, false)));
  const dismiss = () => { setOpen(false); if (key) safeStorage.set(key, true); onDismiss?.(); };
  return (
    <Collapse open={open}>
      <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('k-banner', className)} data-tone={tone} data-variant={variant} data-k-mobile="Banner">
        {icon !== false && <span className="k-banner-icon" aria-hidden="true">{icon ?? <UiIcon slot={ICONS[tone]} size={16} />}</span>}
        <div className="k-banner-text">
          {title && <strong>{title}</strong>}
          {children && <span>{children}</span>}
        </div>
        {actions && <div className="k-banner-actions">{actions}</div>}
        {dismissible && <button type="button" className="k-banner-close" aria-label="Cerrar aviso" onClick={dismiss}><UiIcon slot="x" size={14} /></button>}
      </div>
    </Collapse>
  );
};
