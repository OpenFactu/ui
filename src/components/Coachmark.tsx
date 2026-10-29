import * as React from 'react';
import { cn } from '../utils';
import { Button } from './Button';
import { usePopover } from '../hooks/usePopover';
import { safeStorage } from '../internal/storage';
import { useMessages } from '../i18n/I18nProvider';

export interface CoachmarkProps {
  /** Identificador estable: con él se recuerda en el navegador que ya se vio y no vuelve a salir. */
  id: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  /** Lo que se señala (un botón, un filtro nuevo…). */
  target: React.ReactElement;
  /** Abre la tarjeta sin pulsar el faro. */
  defaultOpen?: boolean;
  /** Texto del botón para cerrarlo. Default «Entendido». */
  dismissLabel?: string;
  /** Recuerda que se cerró (en `localStorage`). Default true. */
  persist?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Señal discreta sobre algo nuevo: un faro que late junto al elemento y, al pulsarlo, una tarjeta con la explicación.
 * Al cerrarla no vuelve a aparecer (se recuerda en el navegador con `id`).
 */
export const Coachmark: React.FC<CoachmarkProps> = ({ id, title, children, target, defaultOpen = false, dismissLabel: dismissLabelProp, persist = true, onDismiss, className }) => {
  const texts = useMessages('coachmark');
  const dismissLabelDefault = useMessages('status').gotIt;
  const dismissLabel = dismissLabelProp ?? dismissLabelDefault;
  const key = `k-coachmark:${id}`;
  const [dismissed, setDismissed] = React.useState<boolean>(() => persist && safeStorage.get<boolean>(key, false));
  const [open, setOpen] = React.useState(defaultOpen);
  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLButtonElement>({ open: open && !dismissed, onClose: () => setOpen(false), offset: 10 });
  const titleId = React.useId();

  const dismiss = () => {
    setOpen(false); setDismissed(true);
    if (persist) safeStorage.set(key, true);
    onDismiss?.();
  };

  if (dismissed) return target;
  return (
    <span className={cn('k-coachmark', className)}>
      {target}
      <button ref={anchorRef} type="button" className="k-coachmark-beacon" aria-label={texts.beacon} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true" />
      </button>
      {(open || mounted) && (
        <div ref={popoverRef as React.Ref<HTMLDivElement>} role="dialog" aria-labelledby={titleId} {...popoverProps} className={cn('k-coachmark-card k-appear', !ready && 'invisible')} style={style}>
          <strong id={titleId}>{title}</strong>
          {children && <div className="k-coachmark-body">{children}</div>}
          <div className="k-coachmark-actions"><Button size="sm" onClick={dismiss}>{dismissLabel}</Button></div>
        </div>
      )}
    </span>
  );
};
