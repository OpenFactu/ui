import { alignUnits, interpolate, parseValue } from './values';

/** Un valor que cambia sin pasar por React: lo escribe un gesto, el scroll o una animación, y lo leen los estilos. */
export interface MotionValue<T = number | string> {
  get(): T;
  set(value: T): void;
  /** Unidades por segundo. Cero en valores que no son números. */
  velocity(): number;
  on(event: 'change', listener: (value: T) => void): () => void;
}

interface InternalValue<T> extends MotionValue<T> {
  /** Lo escribe una animación, que ya sabe su velocidad exacta. */
  write(value: T, velocity: number): void;
}

const BRAND = Symbol.for('openfactu.motionValue');

export function createMotionValue(initial: number): MotionValue<number>;
export function createMotionValue(initial: string): MotionValue<string>;
export function createMotionValue<T extends number | string>(initial: T): MotionValue<T>;
export function createMotionValue<T extends number | string>(initial: T): MotionValue<T> {
  let current = initial;
  let speed = 0;
  let changedAt = 0;
  const listeners = new Set<(value: T) => void>();
  const notify = () => { for (const listener of [...listeners]) listener(current); };
  const value: InternalValue<T> = {
    get: () => current,
    set(next) {
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      if (typeof next === 'number' && typeof current === 'number' && now > changedAt) speed = ((next - current) / (now - changedAt)) * 1000;
      changedAt = now;
      current = next;
      notify();
    },
    write(next, velocity) {
      speed = velocity;
      current = next;
      notify();
    },
    velocity: () => speed,
    on(_event, listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  Object.defineProperty(value, BRAND, { value: true });
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isMotionValue = (value: unknown): value is MotionValue<any> => typeof value === 'object' && value !== null && BRAND in value;

export function writeMotionValue<T>(value: MotionValue<T>, next: T, velocity: number): void {
  (value as InternalValue<T>).write(next, velocity);
}

/**
 * Un valor calculado de otros. Solo escucha a sus fuentes mientras alguien le escucha a él, así que crearlo en cada
 * render (un `motionTemplate` en el JSX) no deja suscripciones colgando.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function derivedValue<T>(sources: MotionValue<any>[], compute: () => T): MotionValue<T> {
  const listeners = new Set<(value: T) => void>();
  let release: (() => void) | null = null;
  const value: InternalValue<T> = {
    get: compute,
    set() {},
    write() {},
    velocity: () => 0,
    on(_event, listener) {
      if (!listeners.size) {
        const notify = () => { const next = compute(); for (const item of [...listeners]) item(next); };
        const offs = sources.map((source) => source.on('change', notify));
        release = () => { for (const off of offs) off(); };
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { release?.(); release = null; }
      };
    },
  };
  Object.defineProperty(value, BRAND, { value: true });
  return value;
}

/** Lleva un número de unos tramos a otros. La salida puede ser números, unidades o colores. */
export function mapRange<T extends number | string>(input: number, from: number[], to: T[], { clamp = true }: { clamp?: boolean } = {}): T {
  const last = from.length - 2;
  let index = 0;
  while (index < last && input > from[index + 1]) index += 1;
  const span = from[index + 1] - from[index];
  const raw = span === 0 ? 1 : (input - from[index]) / span;
  const progress = clamp ? Math.min(1, Math.max(0, raw)) : raw;
  const a = to[index];
  const b = to[index + 1];
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * progress) as T;
  const parsedA = parseValue(a);
  const parsedB = parseValue(b);
  const aligned = alignUnits(parsedA, parsedB) ?? [parsedA, parsedB];
  return interpolate(aligned[0], aligned[1], progress) as T;
}

/** Un texto con valores de movimiento dentro: `motionTemplate\`hsl(${tono} 80% 50%)\``. */
export function motionTemplate(strings: TemplateStringsArray, ...values: (MotionValue<number> | MotionValue<string> | string | number)[]): MotionValue<string> {
  const sources = values.filter(isMotionValue);
  return derivedValue(sources, () => strings.reduce((text, part, i) => {
    const value = values[i - 1];
    return `${text}${isMotionValue(value) ? String(value.get()) : value}${part}`;
  }));
}
