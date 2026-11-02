import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { exitDelay, motionDisabled } from '../motion/dom';
import { useGestures } from '../gestures/useGestures';
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
  const left = labels.left ?? m.swipeCards.reject; const right = labels.right ?? m.swipeCards.accept;

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

  const gestures = useGestures({
    axis: 'x',
    slop: 4,
    pointerTypes: ['touch', 'pen', 'mouse'],
    disabled: Boolean(leaving),
    attribute: false,
    onPan: (pan) => {
      const el = top.current;
      if (!el) return;
      if (pan.phase === 'start') el.setAttribute('data-dragging', '');
      if (pan.phase === 'start' || pan.phase === 'move') { setOffset(el, pan.dx, false); return; }
      el.removeAttribute('data-dragging');
      if (pan.phase === 'end' && (Math.abs(pan.dx) > el.offsetWidth * THRESHOLD || (Math.abs(pan.vx) > FLICK && Math.sign(pan.vx) === Math.sign(pan.dx)))) fling(pan.dx > 0 ? 'right' : 'left');
      else setOffset(el, 0, true);
    },
  });

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
              style={{ ...(isTop ? gestures.style : null), '--k-depth': depth } as React.CSSProperties}
              {...(isTop ? gestures.bind : null)}
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
