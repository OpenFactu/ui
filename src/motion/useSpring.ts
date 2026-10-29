import * as React from 'react';
import { motionDisabled, readMotionSpeed, readSpringConfig } from './dom';
import type { MotionRole } from './presets';
import { springAt, type SpringConfig } from './spring';

export interface UseSpringOptions {
  /** Elemento al que se aplica el valor (también de donde se lee el tema). */
  ref: React.RefObject<HTMLElement | null>;
  /** Qué hace el valor en cada fotograma: normalmente escribir un `transform`. Sin estado de React. */
  apply: (value: number, element: HTMLElement) => void;
  /** Papel del movimiento del que sale el muelle. Default `gesture`. */
  role?: MotionRole;
  /** Física propia, en lugar de la del tema. */
  config?: SpringConfig;
  /** Valor de partida. Default 0. */
  initial?: number;
  /** Cuando llega al reposo. */
  onRest?: (value: number) => void;
  /** Distancia y velocidad por debajo de las cuales se da por quieto. */
  restDelta?: number;
  restSpeed?: number;
}

export interface SpringController {
  /** Va hacia `target`. Con `velocity` (unidades/s) arranca con esa inercia; sin ella, con la que ya llevaba. */
  to(target: number, options?: { velocity?: number; immediate?: boolean }): void;
  /** Coloca el valor sin animar y detiene el muelle. */
  set(value: number): void;
  /** Detiene el muelle donde esté. */
  stop(): void;
  get(): number;
  /** Velocidad actual (unidades/s). */
  velocity(): number;
  readonly animating: boolean;
}

/**
 * Un muelle de un solo valor movido con requestAnimationFrame. Lo que lo distingue de una
 * transición CSS es que **retoma** donde está y con la velocidad que lleva: soltar un gesto
 * rápido, o cambiar de destino a mitad de camino, no produce saltos.
 *
 * - Escribe directamente en el elemento (`apply`), sin pasar por React.
 * - Con movimiento reducido, `data-motion="off"` o velocidad 0 del tema, va al destino al instante.
 * - La velocidad del tema alarga o acorta el movimiento sin cambiar su forma.
 */
export function useSpring({ ref, apply, role = 'gesture', config, initial = 0, onRest, restDelta = 0.4, restSpeed = 8 }: UseSpringOptions): SpringController {
  const latest = React.useRef({ apply, onRest, config, role, restDelta, restSpeed });
  latest.current = { apply, onRest, config, role, restDelta, restSpeed };
  const state = React.useRef({ value: initial, velocity: 0, target: initial, from: initial, startV: 0, startedAt: 0, raf: 0, animating: false, physics: null as Required<SpringConfig> | null, speed: 1 });

  const controller = React.useMemo<SpringController>(() => {
    const s = state.current;
    const write = () => { const el = ref.current; if (el) latest.current.apply(s.value, el); };
    const halt = () => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; s.animating = false; };
    const frame = (now: number) => {
      const elapsed = ((now - s.startedAt) / 1000) / Math.max(s.speed, 1e-3);
      const physics = s.physics!;
      const { value: offset, velocity } = springAt(elapsed, physics, s.from - s.target, s.startV);
      s.value = s.target + offset; s.velocity = velocity / Math.max(s.speed, 1e-3);
      const { restDelta: delta, restSpeed: speedLimit } = latest.current;
      if (Math.abs(offset) < delta && Math.abs(s.velocity) < speedLimit) {
        s.value = s.target; s.velocity = 0; halt(); write(); latest.current.onRest?.(s.value);
        return;
      }
      write();
      s.raf = requestAnimationFrame(frame);
    };
    return {
      to(target, options = {}) {
        const el = ref.current;
        if (options.velocity !== undefined) s.velocity = options.velocity;
        if (options.immediate || !el || motionDisabled(el) || readMotionSpeed(el) === 0) {
          halt(); s.value = s.target = target; s.velocity = 0; write(); latest.current.onRest?.(target);
          return;
        }
        halt();
        s.physics = latest.current.config ? { mass: 1, ...latest.current.config } : readSpringConfig(latest.current.role, el);
        s.speed = readMotionSpeed(el);
        s.from = s.value; s.target = target; s.startV = s.velocity * s.speed; s.startedAt = performance.now(); s.animating = true;
        s.raf = requestAnimationFrame(frame);
      },
      set(value) { halt(); s.value = s.target = value; s.velocity = 0; write(); },
      stop() { halt(); s.target = s.value; s.velocity = 0; },
      get: () => s.value,
      velocity: () => s.velocity,
      get animating() { return s.animating; },
    };
  }, [ref]);

  React.useEffect(() => () => controller.stop(), [controller]);
  return controller;
}
