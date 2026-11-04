import * as React from 'react';
import { animate, type AnimateOptions, type AnimationControls, type MotionKeyframes } from './animate';
import { motionDisabled } from './dom';
import { createMotionValue, derivedValue, mapRange, type MotionValue } from './motionValue';
import type { MotionSpring } from './springInput';

type ScopedAnimate = typeof animate & ((selector: string, values: MotionKeyframes, options?: AnimateOptions) => AnimationControls);

/**
 * `animate` atado a un componente: además admite selectores, que se buscan dentro de `scope`, y al desmontar detiene
 * todo lo suyo.
 */
export function useAnimate<T extends Element = HTMLElement>(): [React.RefObject<T | null>, ScopedAnimate] {
  const scope = React.useRef<T>(null);
  const running = React.useRef(new Set<AnimationControls>());
  const scoped = React.useCallback((target: unknown, second: unknown, options?: AnimateOptions) => {
    const resolved = typeof target === 'string' ? [...(scope.current?.querySelectorAll(target) ?? [])] : target;
    const controls = (animate as (a: unknown, b: unknown, c?: AnimateOptions) => AnimationControls)(resolved, second, options);
    running.current.add(controls);
    void controls.finished.then(() => running.current.delete(controls));
    return controls;
  }, []) as ScopedAnimate;
  React.useEffect(() => {
    const live = running.current;
    return () => { for (const controls of [...live]) controls.stop(); };
  }, []);
  return [scope, scoped];
}

function subscribeMotionPreference(onChange: () => void): () => void {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'style', 'class'] });
  return () => {
    media?.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

/** Si hay que saltarse el movimiento, y sigue al cambiar: preferencia del sistema, `data-motion="off"` o velocidad 0. */
export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribeMotionPreference, () => motionDisabled(), () => false);
}

/** Un valor de movimiento que vive con el componente. */
export function useMotionValue(initial: number): MotionValue<number>;
export function useMotionValue(initial: string): MotionValue<string>;
export function useMotionValue<T extends number | string>(initial: T): MotionValue<T>;
export function useMotionValue<T extends number | string>(initial: T): MotionValue<T> {
  const value = React.useRef<MotionValue<T> | null>(null);
  value.current ??= createMotionValue(initial);
  return value.current;
}

/**
 * Otro valor calculado de este, que se actualiza sin rerenderizar.
 *
 * ```ts
 * const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);    // también colores y unidades
 * const doble = useTransform(x, (value) => value * 2);
 * ```
 */
export function useTransform<T extends number | string>(value: MotionValue<number>, from: number[], to: T[], options?: { clamp?: boolean }): MotionValue<T>;
export function useTransform<S, T>(value: MotionValue<S>, map: (value: S) => T): MotionValue<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTransform(value: MotionValue<any>, first: unknown, to?: unknown, options?: { clamp?: boolean }): MotionValue<unknown> {
  const latest = React.useRef({ first, to, options });
  latest.current = { first, to, options };
  return React.useMemo(() => derivedValue([value], () => {
    const current = latest.current;
    if (typeof current.first === 'function') return (current.first as (input: unknown) => unknown)(value.get());
    return mapRange(value.get() as number, current.first as number[], current.to as (number | string)[], current.options);
  }), [value]);
}

/** Sigue a otro valor con un muelle. Por defecto, el del papel `gesture` del tema. */
export function useSpringValue(value: MotionValue<number>, { spring }: { spring?: MotionSpring } = {}): MotionValue<number> {
  const output = useMotionValue(value.get());
  const latest = React.useRef(spring);
  latest.current = spring;
  React.useEffect(() => value.on('change', (next) => { animate(output, next, { spring: latest.current ?? 'gesture' }); }), [value, output]);
  return output;
}

/** Dónde está el puntero: sobre la ventana o, con `target`, respecto a ese elemento. */
export function usePointerValue(target?: React.RefObject<Element | null>): { x: MotionValue<number>; y: MotionValue<number> } {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  React.useEffect(() => {
    const move = (event: PointerEvent) => {
      const box = target?.current?.getBoundingClientRect();
      x.set(event.clientX - (box?.left ?? 0));
      y.set(event.clientY - (box?.top ?? 0));
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [target, x, y]);
  return { x, y };
}
