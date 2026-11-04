import * as React from 'react';
import { addFrameTask } from './frameloop';
import { createMotionValue, type MotionValue } from './motionValue';

/** Dos momentos, cada uno «borde del objetivo, borde de la vista»: `['start end', 'end start']` es desde que asoma hasta que se va. */
export type ScrollOffset = [string, string];

const EDGES: Record<string, number> = { start: 0, center: 0.5, end: 1 };

const edge = (text: string | undefined): number => {
  if (text === undefined) return 0;
  return EDGES[text] ?? (text.endsWith('%') ? parseFloat(text) / 100 : parseFloat(text)) ?? 0;
};

/** En qué punto del recorrido va el scroll, de 0 a 1. */
export function scrollProgress(m: { scroll: number; viewport: number; targetStart: number; targetSize: number }, offset: ScrollOffset): number {
  const at = (pair: string) => {
    const [target, view] = pair.split(' ');
    return m.targetStart + edge(target) * m.targetSize - edge(view) * m.viewport;
  };
  const from = at(offset[0]);
  const to = at(offset[1]);
  if (to === from) return 0;
  return Math.min(1, Math.max(0, (m.scroll - from) / (to - from)));
}

export interface UseScrollOptions {
  /** Lo que sigue el recorrido. Sin esto, todo el contenido que se desplaza. */
  target?: React.RefObject<Element | null>;
  /** Lo que se desplaza. Sin esto, la página. */
  container?: React.RefObject<Element | null>;
  offset?: ScrollOffset;
}

export interface ScrollValues {
  /** Píxeles desplazados. */
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** De 0 a 1. */
  progress: MotionValue<number>;
  progressX: MotionValue<number>;
}

/** El tramo que ocupa un elemento en un eje. Sale de su centro: girarlo o escalarlo no cambia dónde está. */
function targetRange(el: Element, axis: 'x' | 'y'): { start: number; size: number } {
  const box = el.getBoundingClientRect();
  const html = el as HTMLElement;
  const size = (axis === 'y' ? html.offsetHeight : html.offsetWidth) ?? (axis === 'y' ? box.height : box.width);
  const center = axis === 'y' ? box.top + box.height / 2 : box.left + box.width / 2;
  return { start: center - size / 2, size };
}

/**
 * El scroll como valores de movimiento, para enlazarlo con estilos sin rerenderizar. Sigue actualizándose con movimiento
 * reducido: si un efecto enlazado al scroll sobra, lo decide quien lo escribe con `useReducedMotion`.
 */
export function useScroll({ target, container, offset = ['start end', 'end start'] }: UseScrollOptions = {}): ScrollValues {
  const values = React.useRef<ScrollValues | null>(null);
  values.current ??= { x: createMotionValue(0), y: createMotionValue(0), progress: createMotionValue(0), progressX: createMotionValue(0) };
  const output = values.current;
  const offsetKey = offset.join('|');

  React.useEffect(() => {
    const range = offsetKey.split('|') as ScrollOffset;
    const root = container?.current ?? null;
    const page = document.documentElement;
    const measureAxis = (axis: 'x' | 'y'): { scroll: number; progress: number } => {
      const box = root?.getBoundingClientRect();
      const scroll = axis === 'y' ? root?.scrollTop ?? window.scrollY : Math.abs(root?.scrollLeft ?? window.scrollX);
      const viewport = axis === 'y' ? root?.clientHeight ?? window.innerHeight : root?.clientWidth ?? window.innerWidth;
      const element = target?.current;
      if (element) {
        const { start, size } = targetRange(element, axis);
        const base = axis === 'y' ? (box ? box.top + (root?.clientTop ?? 0) : 0) : (box ? box.left + (root?.clientLeft ?? 0) : 0);
        return { scroll, progress: scrollProgress({ scroll, viewport, targetStart: start - base + scroll, targetSize: size }, range) };
      }
      const max = (axis === 'y' ? (root ?? page).scrollHeight : (root ?? page).scrollWidth) - viewport;
      if (max <= 0) return { scroll, progress: 0 };
      // Con zoom, el final del scroll puede quedarse a una fracción de píxel.
      return { scroll, progress: max - scroll < 1 ? 1 : scroll / max };
    };
    const measure = () => {
      const vertical = measureAxis('y');
      const horizontal = measureAxis('x');
      output.y.set(vertical.scroll);
      output.x.set(horizontal.scroll);
      output.progress.set(vertical.progress);
      output.progressX.set(horizontal.progress);
    };
    let removeTask: (() => void) | null = null;
    const schedule = () => {
      if (removeTask) return;
      removeTask = addFrameTask(() => { removeTask = null; measure(); return false; });
    };
    measure();
    const scroller: EventTarget = root ?? window;
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(root ?? page);
    if (target?.current) observer?.observe(target.current);
    return () => {
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      removeTask?.();
    };
  }, [container, target, offsetKey, output]);

  return output;
}
