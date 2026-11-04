import type * as React from 'react';
import { GESTURE_IGNORE } from '../gestures/useGestures';
import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import { animate, runAnimation, stopAnimations, type AnimateOptions } from './animate';
import { flushWrites, readValue, writeValue } from './elementWriter';
import type { MotionValue } from './motionValue';
import type { MotionSpring } from './springInput';
import { createVelocityTracker, projectRelease, rubberband } from './velocity';

export interface DragConstraints {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface DragInfo {
  x: number;
  y: number;
  /** En px/s. */
  vx: number;
  vy: number;
  offsetX: number;
  offsetY: number;
}

/** Dentro de los límites sigue al puntero; fuera, con goma. Con `elastic` 0 se queda en el borde. */
export function constrainDrag(value: number, min: number | undefined, max: number | undefined, elastic: number): number {
  // Sin recorrido («tira y vuelve») la goma también tiene que ceder.
  const span = (min !== undefined && max !== undefined ? max - min : 0) || 200;
  if (min !== undefined && value < min) return min + rubberband(value - min, span, elastic);
  if (max !== undefined && value > max) return max + rubberband(value - max, span, elastic);
  return value;
}

/** Dónde acaba al soltar: sigue con la velocidad que llevaba (px/s) y, si hay límites, se queda dentro. */
export function releaseTarget(value: number, velocity: number, min?: number, max?: number): number {
  const projected = value + projectRelease(velocity / 1000);
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, projected));
}

/** Arrastrar en un eje deja el otro al navegador, para que el scroll siga funcionando. */
export function dragTouchAction(drag: boolean | 'x' | 'y'): string {
  if (drag === 'x') return 'pan-y';
  return drag === 'y' ? 'pan-x' : 'none';
}

export interface DragOptions {
  drag: boolean | 'x' | 'y';
  constraints?: DragConstraints;
  elastic: number;
  spring?: MotionSpring;
  timing?: AnimateOptions['timing'];
  onDragStart?: (info: DragInfo) => void;
  onDrag?: (info: DragInfo) => void;
  onDragEnd?: (info: DragInfo) => void;
  /** Si `style` lleva un valor de movimiento en ese eje, el arrastre lo mueve a él: lo enlazado sigue el gesto y la vuelta. */
  values?: { x?: MotionValue<number>; y?: MotionValue<number> };
}

/** Empieza un arrastre desde un `pointerdown`. Devuelve la función que lo termina. */
export function beginDrag(event: React.PointerEvent, el: HTMLElement, options: DragOptions): () => void {
  if (!isPrimaryPointer(event.nativeEvent)) return () => undefined;
  // Un control de dentro se queda su gesto: capturar el puntero le robaría el clic.
  const control = (event.target as Element).closest?.(GESTURE_IGNORE);
  if (control && control !== el) return () => undefined;
  const { drag, constraints: limits, elastic } = options;
  const movesX = drag !== 'y';
  const movesY = drag !== 'x';
  const { values } = options;
  stopAnimations(el, ['x', 'y']);
  if (values?.x) stopAnimations(values.x);
  if (values?.y) stopAnimations(values.y);
  const baseX = values?.x?.get() ?? (parseFloat(readValue(el, 'x')) || 0);
  const baseY = values?.y?.get() ?? (parseFloat(readValue(el, 'y')) || 0);
  const startX = event.clientX;
  const startY = event.clientY;
  const trackerX = createVelocityTracker();
  const trackerY = createVelocityTracker();
  let started = false;
  let x = baseX;
  let y = baseY;
  const info = (now?: number): DragInfo => ({ x, y, vx: trackerX.velocity(now) * 1000, vy: trackerY.velocity(now) * 1000, offsetX: x - baseX, offsetY: y - baseY });

  return startPointerDrag(event, {
    onMove(move) {
      trackerX.add(move.clientX, move.timeStamp);
      trackerY.add(move.clientY, move.timeStamp);
      if (movesX) x = constrainDrag(baseX + move.clientX - startX, limits?.left, limits?.right, elastic);
      if (movesY) y = constrainDrag(baseY + move.clientY - startY, limits?.top, limits?.bottom, elastic);
      const place = (key: 'x' | 'y', value: number) => {
        const target = values?.[key];
        if (target) target.set(value); else writeValue(el, key, `${value}px`);
      };
      if (movesX) place('x', x);
      if (movesY) place('y', y);
      flushWrites(el);
      if (!started) { started = true; options.onDragStart?.(info()); }
      options.onDrag?.(info());
    },
    onEnd(end, cancelled) {
      const final = info(end.timeStamp);
      // Si el navegador se ha quedado el gesto para hacer scroll, no hay lanzamiento: solo volver a los límites.
      const settle = (key: 'x' | 'y', value: number, velocity: number, min?: number, max?: number) => {
        const speed = cancelled ? 0 : velocity;
        const target = releaseTarget(value, speed, min, max);
        if (target === value && speed === 0) return;
        const motionValue = values?.[key];
        if (motionValue) animate(motionValue, target, { spring: options.spring ?? 'gesture', timing: options.timing, velocity: speed });
        else void runAnimation(el, { [key]: target }, { spring: options.spring, timing: options.timing, velocity: speed }, 'gesture');
      };
      if (movesX) settle('x', x, final.vx, limits?.left, limits?.right);
      if (movesY) settle('y', y, final.vy, limits?.top, limits?.bottom);
      if (started) options.onDragEnd?.(final);
    },
  });
}
