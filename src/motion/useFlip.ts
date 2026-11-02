import * as React from 'react';
import { motionDisabled, readSpringCss } from './dom';
import type { MotionRole } from './presets';

export interface UseFlipOptions {
  /** Qué elementos, dentro de la raíz, se siguen. */
  selector: string;
  /** Identifica cada elemento entre renders. Default `data-flip-id` o, si no, `id`. */
  getKey?: (element: HTMLElement) => string | null | undefined;
  /** Cuando cambia, se mira quién se ha movido. Sin esto, tras cada render. */
  watch?: React.DependencyList;
  /** Estos no se animan (la tarjeta que acaba de aterrizar, por ejemplo). */
  skip?: (element: HTMLElement) => boolean;
  /** Muelle del tema con el que se mueven. Default `move`. */
  role?: MotionRole;
  /** Lo que aparece nuevo entra creciendo y aclarándose. Default true. */
  enter?: boolean;
}

/** El `translate` que lleva ahora mismo el elemento (de una animación a medias). */
function currentTranslate(el: HTMLElement): { x: number; y: number } {
  const raw = getComputedStyle(el).translate;
  if (!raw || raw === 'none') return { x: 0, y: 0 };
  const [x, y] = raw.split(' ').map((part) => parseFloat(part));
  return { x: x || 0, y: y || 0 };
}

/**
 * Anima los cambios de sitio de una lista (técnica FLIP): tras cada cambio, quien se ha movido arranca donde estaba y
 * llega a su sitio nuevo con el muelle del tema. Mueve `translate`, así que no pisa los `transform` de cada elemento, y
 * retoma una animación a medias desde donde va, sin saltos. Las posiciones se miden respecto al contenido de la raíz: el
 * scroll no cuenta como movimiento. Con movimiento reducido o velocidad 0 no hace nada.
 *
 * ```tsx
 * const root = React.useRef<HTMLUListElement>(null);
 * useFlip(root, { selector: '[data-flip-id]', watch: [items] });
 * <ul ref={root}>{items.map(i => <li key={i.id} data-flip-id={i.id}>{i.name}</li>)}</ul>
 * ```
 */
export function useFlip(root: React.RefObject<HTMLElement | null>, { selector, getKey, watch, skip, role = 'move', enter = true }: UseFlipOptions): void {
  const positions = React.useRef<Map<string, { x: number; y: number }> | null>(null);
  const latest = React.useRef({ selector, getKey, skip, role, enter });
  latest.current = { selector, getKey, skip, role, enter };

  React.useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const { selector: query, getKey: keyOf, skip: omit, role: springRole, enter: animateEnter } = latest.current;
    const box = host.getBoundingClientRect();
    const previous = positions.current;
    const next = new Map<string, { x: number; y: number }>();
    const moves: Array<() => void> = [];
    const still = motionDisabled(host);
    host.querySelectorAll<HTMLElement>(query).forEach((el) => {
      const key = keyOf ? keyOf(el) : el.dataset.flipId ?? el.id;
      if (!key) return;
      const rect = el.getBoundingClientRect();
      const inFlight = still ? { x: 0, y: 0 } : currentTranslate(el);
      // Dónde cae de verdad, sin contar lo que le falte por recorrer de la animación anterior.
      const place = { x: rect.left - box.left + host.scrollLeft - inFlight.x, y: rect.top - box.top + host.scrollTop - inFlight.y };
      next.set(key, place);
      if (!previous || still || omit?.(el)) return;
      const before = previous.get(key);
      if (!before) {
        if (animateEnter) moves.push(() => {
          const { easing, duration } = readSpringCss(springRole, el);
          el.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration, easing });
        });
        return;
      }
      const dx = before.x + inFlight.x - place.x; const dy = before.y + inFlight.y - place.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      moves.push(() => {
        const { easing, duration } = readSpringCss(springRole, el);
        el.getAnimations().forEach((animation) => { if ((animation as Animation & { id: string }).id === 'k-flip') animation.cancel(); });
        const animation = el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration, easing });
        animation.id = 'k-flip';
      });
    });
    positions.current = next;
    moves.forEach((move) => move());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);
}
