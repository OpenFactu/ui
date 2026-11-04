import * as React from 'react';
import type { AnimateOptions, MotionKeyframes } from './animate';
import type { MotionSpring } from './springInput';

/** Un efecto con nombre: lo que hace al entrar, quedarse y salir. Se usa con `<Motion.div animate="fade-up" />`. */
export interface MotionPreset {
  initial?: MotionKeyframes;
  animate: MotionKeyframes;
  exit?: MotionKeyframes;
  spring?: MotionSpring;
  timing?: AnimateOptions['timing'];
}

export interface RegisteredMotionPreset {
  name: string;
  source: string;
  preset: MotionPreset;
}

const BUILTIN = 'builtin';

const fade = (axis: 'x' | 'y' | 'inlineX', distance: number): MotionPreset => ({
  initial: { opacity: 0, [axis]: distance },
  animate: { opacity: 1, [axis]: 0 },
  exit: { opacity: 0, [axis]: distance / 2 },
});

const builtins: Record<string, MotionPreset> = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  'fade-up': fade('y', 12),
  'fade-down': fade('y', -12),
  'fade-start': fade('inlineX', -16),
  'fade-end': fade('inlineX', 16),
  scale: {
    initial: { opacity: 0, scale: 'var(--k-enter-scale, 0.96)' },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 'var(--k-enter-scale, 0.96)' },
  },
  pop: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, spring: 'pop' },
  // Aunque el tema no desenfoque al entrar, este efecto se llama así: al menos 4 px.
  blur: {
    initial: { opacity: 0, filter: 'blur(max(var(--k-enter-blur, 0px), 4px))' },
    animate: { opacity: 1, filter: 'none' },
    exit: { opacity: 0, filter: 'blur(max(var(--k-enter-blur, 0px), 4px))' },
  },
};

/** Por nombre, una pila: el último registrado manda y, al quitarlo, vuelve el anterior (también uno de serie). */
const registered = new Map<string, RegisteredMotionPreset[]>(Object.entries(builtins).map(([name, preset]) => [name, [{ name, source: BUILTIN, preset }]]));
const listeners = new Set<() => void>();
let snapshot: RegisteredMotionPreset[] | null = null;

function notify(): void {
  snapshot = null;
  for (const listener of [...listeners]) listener();
}

/**
 * Añade un efecto. Devuelve la función que lo quita.
 *
 * ```ts
 * registerMotionPreset('mi-entrada', { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, { source: 'mi-app' });
 * ```
 */
export function registerMotionPreset(name: string, preset: MotionPreset, options: { source?: string } = {}): () => void {
  if (!name || !preset?.animate || typeof preset.animate !== 'object') {
    console.warn(`[openfactu/ui] El efecto «${name}» necesita un nombre y un \`animate\`; se ignora.`);
    return () => undefined;
  }
  const entry: RegisteredMotionPreset = { name, source: options.source ?? 'app', preset };
  registered.set(name, [...(registered.get(name) ?? []), entry]);
  notify();
  return () => {
    const stack = registered.get(name)?.filter((item) => item !== entry) ?? [];
    if (stack.length) registered.set(name, stack); else registered.delete(name);
    notify();
  };
}

/** Quita todo lo que aportó un origen, para cuando se desactiva un plugin. */
export function unregisterMotionSource(source: string): void {
  for (const [name, stack] of [...registered]) {
    const kept = stack.filter((item) => item.source !== source);
    if (kept.length) registered.set(name, kept); else registered.delete(name);
  }
  notify();
}

export function getMotionPreset(name: string): MotionPreset | undefined {
  const stack = registered.get(name);
  return stack?.[stack.length - 1].preset;
}

function allPresets(): RegisteredMotionPreset[] {
  snapshot ??= [...registered.values()].map((stack) => stack[stack.length - 1]);
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** El catálogo de efectos, reactivo. */
export function useMotionPresets(): readonly RegisteredMotionPreset[] {
  return React.useSyncExternalStore(subscribe, allPresets, allPresets);
}
