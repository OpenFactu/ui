import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useEscapeStack } from '../internal/escapeStack';
import { useI18n } from '../i18n/I18nProvider';

export interface TourStep {
  /** Elemento que se ilumina: selector CSS o ref. Sin destino, el paso sale centrado. */
  target?: string | React.RefObject<HTMLElement | null>;
  title: React.ReactNode;
  content?: React.ReactNode;
  /** Lado preferido de la tarjeta. Default `bottom` (si no cabe, arriba). */
  placement?: 'top' | 'bottom';
}

export interface TourProps {
  steps: readonly TourStep[];
  open: boolean;
  onClose: () => void;
  /** Al terminar el último paso (además de `onClose`). */
  onFinish?: () => void;
  /** Paso actual (controlado). */
  step?: number;
  onStepChange?: (step: number) => void;
  /** Margen alrededor del elemento iluminado. Default 8. */
  padding?: number;
  labels?: { next?: string; previous?: string; finish?: string; skip?: string };
}

interface Rect { top: number; left: number; width: number; height: number }

const resolve = (target: TourStep['target']): HTMLElement | null =>
  !target ? null : typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target.current;

/**
 * Tour guiado: oscurece la página, ilumina el elemento de cada paso (el foco viaja de uno a otro con el muelle del tema)
 * y muestra una tarjeta con el texto, el progreso y los botones. Flechas para avanzar y retroceder, Escape para salir.
 */
export const Tour: React.FC<TourProps> = ({ steps, open, onClose, onFinish, step: controlled, onStepChange, padding = 8, labels = {} }) => {
  const { messages: m, format } = useI18n();
  const [internal, setInternal] = React.useState(0);
  const index = Math.min(controlled ?? internal, steps.length - 1);
  const current = steps[index];
  const { mounted, state } = useAnimatedPresence({ open });
  const [rect, setRect] = React.useState<Rect | null>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = React.useState({ width: 320, height: 160 });
  const id = React.useId();
  const titleId = `${id}-title`;

  const setStep = (next: number) => { if (controlled === undefined) setInternal(next); onStepChange?.(next); };
  const finish = () => { onFinish?.(); onClose(); };
  const next = () => (index >= steps.length - 1 ? finish() : setStep(index + 1));
  const previous = () => setStep(Math.max(0, index - 1));
  useEscapeStack(id, open, onClose);

  React.useEffect(() => { if (open && controlled === undefined) setInternal(0); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Medir el destino (y seguirlo al desplazar o cambiar el tamaño de la ventana).
  React.useLayoutEffect(() => {
    if (!open || !current) return;
    const el = resolve(current.target);
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    const measure = () => {
      const target = resolve(current.target);
      if (!target) { setRect(null); return; }
      const r = target.getBoundingClientRect();
      setRect({ top: r.top - padding, left: r.left - padding, width: r.width + padding * 2, height: r.height + padding * 2 });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, index, current, padding]);

  React.useLayoutEffect(() => {
    const el = card.current; if (!el) return;
    setCardSize((s) => (s.width === el.offsetWidth && s.height === el.offsetHeight ? s : { width: el.offsetWidth, height: el.offsetHeight }));
  });
  React.useEffect(() => { if (open) card.current?.focus(); }, [open, index]);

  if (!mounted || !current || typeof document === 'undefined') return null;

  // Tarjeta: debajo del destino si cabe (o arriba), alineada con él y siempre dentro de la ventana.
  const vw = window.innerWidth; const vh = window.innerHeight; const gap = 12;
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + gap + cardSize.height <= vh;
    const preferTop = current.placement === 'top' && rect.top - gap - cardSize.height >= 0;
    const top = preferTop || !below ? Math.max(8, rect.top - gap - cardSize.height) : rect.top + rect.height + gap;
    const left = Math.max(8, Math.min(vw - cardSize.width - 8, rect.left + rect.width / 2 - cardSize.width / 2));
    cardStyle = { top, left };
  } else {
    cardStyle = { top: Math.max(8, vh / 2 - cardSize.height / 2), left: Math.max(8, vw / 2 - cardSize.width / 2) };
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
  };

  return createPortal(
    <div className="k-tour" data-state={state}>
      <div
        className="k-tour-hole"
        data-centered={!rect || undefined}
        style={rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : { top: vh / 2, left: vw / 2, width: 0, height: 0 }}
        aria-hidden="true"
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="k-tour-card k-appear"
        data-state={state}
        style={cardStyle}
        onKeyDown={onKeyDown}
      >
        <div className="k-tour-progress" aria-hidden="true">
          {steps.map((_, i) => <span key={i} data-active={i === index || undefined} data-done={i < index || undefined} />)}
        </div>
        <h2 id={titleId} className="k-tour-title">{current.title}</h2>
        {current.content && <div className="k-tour-content">{current.content}</div>}
        <div className="k-tour-actions">
          <span className="k-tour-count">{format(m.common.ofTotal, { current: index + 1, total: steps.length })}</span>
          <span className="flex gap-2">
            {index < steps.length - 1 && <Button size="sm" variant="ghost" onClick={onClose}>{labels.skip ?? m.tour.skip}</Button>}
            {index > 0 && <Button size="sm" variant="secondary" onClick={previous}>{labels.previous ?? m.common.previous}</Button>}
            <Button size="sm" onClick={next}>{index >= steps.length - 1 ? (labels.finish ?? m.tour.finish) : (labels.next ?? m.common.next)}</Button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Selector para `TourStep.target` de un elemento marcado con `data-tour="nombre"`. */
export const tourTarget = (name: string) => `[data-tour="${name.replace(/["\\]/g, '\\$&')}"]`;
