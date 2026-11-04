import * as React from 'react';
import { runAnimation, type AnimateOptions } from './animate';
import { motionDisabled } from './dom';
import { clearChannel, flushWrites, readValue } from './elementWriter';
import type { MotionSpring } from './springInput';

const pixels = (text: string | undefined, size: number) => {
  if (!text) return 0;
  return text.endsWith('%') ? (parseFloat(text) / 100) * size : parseFloat(text) || 0;
};

/** Su sitio en el padre, sin lo que lo desplaza `translate` ni lo que lo agranda `scale`, y sin contar el scroll. */
function measure(el: HTMLElement): { x: number; y: number } {
  const box = el.getBoundingClientRect();
  const [tx, ty] = getComputedStyle(el).translate.split(' ');
  const parent = el.parentElement;
  const outer = parent?.getBoundingClientRect();
  const width = el.offsetWidth ?? box.width;
  const height = el.offsetHeight ?? box.height;
  return {
    x: box.left + (box.width - width) / 2 - pixels(tx === 'none' ? undefined : tx, width) - (outer?.left ?? 0) + (parent?.scrollLeft ?? 0),
    y: box.top + (box.height - height) / 2 - pixels(ty, height) - (outer?.top ?? 0) + (parent?.scrollTop ?? 0),
  };
}

/**
 * Lo que cambia de sitio tras un render llega con un muelle (FLIP sobre `translate`, como `useFlip`). Solo mueve la
 * posición: si cambia de tamaño, salta. Va en canales propios, así que no pisa la `x` de quien lo use.
 */
export function useLayoutMotion(element: React.RefObject<HTMLElement | null>, enabled: boolean, options: { spring?: MotionSpring; timing?: AnimateOptions['timing'] }): void {
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const latest = React.useRef(options);
  latest.current = options;
  React.useLayoutEffect(() => {
    const el = element.current;
    if (!enabled || !el) { last.current = null; return; }
    const now = measure(el);
    const before = last.current;
    last.current = now;
    if (!before || motionDisabled(el)) return;
    const dx = before.x - now.x;
    const dy = before.y - now.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    const currentX = parseFloat(readValue(el, 'layoutX')) || 0;
    const currentY = parseFloat(readValue(el, 'layoutY')) || 0;
    runAnimation(el, { layoutX: [dx + currentX, 0], layoutY: [dy + currentY, 0] }, {
      ...latest.current,
      onRest() {
        clearChannel(el, 'layoutX');
        clearChannel(el, 'layoutY');
        flushWrites(el);
      },
    }, 'move');
  });
}
