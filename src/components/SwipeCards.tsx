import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { createVelocityTracker } from '../motion/velocity';
import { exitDelay, motionDisabled } from '../motion/dom';
import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import { useI18n } from '../i18n/I18nProvider';

export type SwipeDirection = 'left' | 'right';

export interface SwipeCardsProps<T> {
  items: readonly T[];
  getKey: (item: T) => React.Key;
  renderCard: (item: T) => React.ReactNode;
  /** Al lanzar una tarjeta. Quien controla `items` la quita (o no). */
  onSwipe: (item: T, direction: SwipeDirection) => void;
  /** Etiquetas de los botones y de lo que aparece al inclinar. Default «Descartar» y «Aceptar». */
  labels?: { left?: string; right?: string };
  /** Tarjetas visibles detrás de la primera. Default 2. */
  stack?: number;
  /** Qué se ve sin tarjetas. */
  empty?: React.ReactNode;
  className?: string;
}

/** Distancia (fracción del ancho) o velocidad (px/ms) que bastan para lanzar. */
const THRESHOLD = 0.35;
const FLICK = 0.5;

/**
 * Pila de tarjetas que se lanzan a un lado o al otro (revisar facturas, aprobar gastos, clasificar): la de arriba sigue
 * al dedo girando un poco, enseña qué decisión se tomará y, al soltarla, sale volando si se pasó del umbral o se lanzó;
 * si no, vuelve con el muelle del tema. También con botones y con las flechas del teclado.
 */
export function SwipeCards<T>({ items, getKey, renderCard, onSwipe, labels = {}, stack = 2, empty: emptyProp, className }: SwipeCardsProps<T>) {
  const { messages: m, format } = useI18n();
  const empty = emptyProp ?? m.swipeCards.empty;
  const top = React.useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = React.useState<{ key: React.Key; dir: SwipeDirection } | null>(null);
  const tracker = React.useMemo(() => createVelocityTracker(100), []);
  const left = labels.left ?? 'Descartar'; const right = labels.right ?? 'Aceptar';

  const setOffset = (el: HTMLElement, x: number, animate: boolean) => {
    el.style.transition = animate ? '' : 'none';
    el.style.translate = `${x}px 0`;
    el.style.rotate = `${x / 20}deg`;
    el.style.setProperty('--k-swipe', String(Math.max(-1, Math.min(1, x / (el.offsetWidth * THRESHOLD)))));
  };

  const fling = (dir: SwipeDirection) => {
    const el = top.current; const item = items[0];
    if (!el || item === undefined || leaving) return;
    const out = (dir === 'right' ? 1 : -1) * (window.innerWidth * 0.6 + el.offsetWidth);
    el.setAttribute('data-leaving', '');
    setOffset(el, out, true);
    setLeaving({ key: getKey(item), dir });
    setTimeout(() => { setLeaving(null); onSwipe(item, dir); }, motionDisabled(el) ? 0 : exitDelay(el, 'gesture'));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointer(event) || leaving) return;
    const el = event.currentTarget; const startX = event.clientX;
    tracker.reset(); tracker.add(event.clientX, event.timeStamp);
    el.setAttribute('data-dragging', '');
    startPointerDrag(event, {
      onMove: (e) => { tracker.add(e.clientX, e.timeStamp); setOffset(el, e.clientX - startX, false); },
      onEnd: (e) => {
        el.removeAttribute('data-dragging');
        const dx = e.clientX - startX; const v = tracker.velocity(e.timeStamp);
        if (Math.abs(dx) > el.offsetWidth * THRESHOLD || (Math.abs(v) > FLICK && Math.sign(v) === Math.sign(dx))) fling(dx > 0 ? 'right' : 'left');
        else setOffset(el, 0, true);
      },
    });
  };

  const visible = items.slice(0, stack + 1);
  return (
    <div className={cn('k-swipe', className)} data-k-mobile="SwipeCards">
      <div
        className="k-swipe-stack"
        role="group"
        aria-roledescription={m.swipeCards.roleDescription}
        aria-label={format(m.swipeCards.pending, { count: items.length })}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); fling('left'); } else if (e.key === 'ArrowRight') { e.preventDefault(); fling('right'); } }}
      >
        {visible.length === 0 && <div className="k-swipe-empty">{empty}</div>}
        {visible.slice().reverse().map((item) => {
          const depth = visible.indexOf(item);
          const isTop = depth === 0;
          return (
            <div
              key={getKey(item)}
              ref={isTop ? top : undefined}
              className="k-swipe-card"
              data-depth={depth}
              style={{ '--k-depth': depth } as React.CSSProperties}
              onPointerDown={isTop ? onPointerDown : undefined}
              aria-hidden={!isTop || undefined}
            >
              {isTop && <span className="k-swipe-stamp" data-side="left" aria-hidden="true">{left}</span>}
              {isTop && <span className="k-swipe-stamp" data-side="right" aria-hidden="true">{right}</span>}
              {renderCard(item)}
            </div>
          );
        })}
      </div>
      {items.length > 0 && (
        <div className="k-swipe-actions">
          <button type="button" className="k-swipe-button" data-side="left" aria-label={left} onClick={() => fling('left')} disabled={!!leaving}><UiIcon slot="x" size={20} /></button>
          <button type="button" className="k-swipe-button" data-side="right" aria-label={right} onClick={() => fling('right')} disabled={!!leaving}><UiIcon slot="check" size={20} /></button>
        </div>
      )}
    </div>
  );
}
