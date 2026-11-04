import { springAt, type SpringConfig } from './spring';

export interface DriverState {
  value: number;
  /** Unidades por segundo. */
  velocity: number;
  done: boolean;
}

/**
 * El movimiento como función pura del tiempo (segundos desde que empezó). Una pestaña en segundo plano no acumula
 * error: al volver, el valor sale directamente del tiempo transcurrido.
 */
export type Driver = ((elapsed: number) => DriverState) & {
  /** Lo que dura, cuando se sabe sin recorrerlo. */
  duration?: number;
};

export type EaseInput = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | [number, number, number, number] | ((t: number) => number);

const NAMED_EASES: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** Curva de Bézier cúbica como en CSS: busca por bisección la `t` cuya x es el tiempo. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const axis = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (progress) => {
    if (progress <= 0 || progress >= 1) return progress;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i += 1) {
      const middle = (low + high) / 2;
      if (axis(x1, x2, middle) < progress) low = middle; else high = middle;
    }
    return axis(y1, y2, (low + high) / 2);
  };
}

function resolveEase(ease: EaseInput = 'ease-in-out'): (t: number) => number {
  if (typeof ease === 'function') return ease;
  if (ease === 'linear') return (t) => t;
  const points = Array.isArray(ease) ? ease : NAMED_EASES[ease];
  return cubicBezier(points[0], points[1], points[2], points[3]);
}

export function springDriver({ from, to, velocity = 0, config, restDelta, restSpeed }: {
  from: number;
  to: number;
  velocity?: number;
  config: SpringConfig;
  restDelta?: number;
  restSpeed?: number;
}): Driver {
  // El reposo depende del recorrido: 0,1 px sobra para 100 px, pero es todo el movimiento de un progreso de 0 a 1.
  const span = Math.abs(to - from) || Math.abs(velocity) / 10 || 1;
  const delta = restDelta ?? span * 0.001;
  const speed = restSpeed ?? span * 0.01;
  return (elapsed) => {
    const state = springAt(elapsed, config, from - to, velocity);
    if (Math.abs(state.value) < delta && Math.abs(state.velocity) < speed) return { value: to, velocity: 0, done: true };
    return { value: to + state.value, velocity: state.velocity, done: false };
  };
}

/** `duration` en segundos. */
export function timingDriver({ from, to, duration, ease }: { from: number; to: number; duration: number; ease?: EaseInput }): Driver {
  const curve = resolveEase(ease);
  const driver: Driver = (elapsed) => {
    if (elapsed >= duration) return { value: to, velocity: 0, done: true };
    const t = elapsed / duration;
    const step = 0.001;
    return { value: from + (to - from) * curve(t), velocity: ((to - from) * (curve(t + step) - curve(t))) / (step * duration), done: false };
  };
  driver.duration = duration;
  return driver;
}

const SCAN_STEP = 1 / 120;
const SCAN_LIMIT = 30;

/** Lo que dura un conductor: el suyo si lo sabe; si no, recorriéndolo hasta que termina. */
function lengthOf(driver: Driver): number {
  if (driver.duration !== undefined) return driver.duration;
  for (let t = 0; t < SCAN_LIMIT; t += SCAN_STEP) if (driver(t).done) return t;
  return SCAN_LIMIT;
}

/** Una secuencia de fotogramas: cada tramo sale de donde acabó el anterior, con la velocidad que llevaba. */
export function keyframesDriver(values: number[], make: (from: number, to: number, velocity: number, index: number) => Driver): Driver {
  const segments: { driver: Driver; start: number; end: number }[] = [];
  let start = 0;
  let velocity = 0;
  for (let i = 0; i < values.length - 1; i += 1) {
    const driver = make(values[i], values[i + 1], velocity, i);
    const length = lengthOf(driver);
    segments.push({ driver, start, end: start + length });
    velocity = driver(length).velocity;
    start += length;
  }
  const last = values[values.length - 1];
  const driver: Driver = (elapsed) => {
    const segment = segments.find((item) => elapsed < item.end);
    if (!segment) return { value: last, velocity: 0, done: true };
    const state = segment.driver(elapsed - segment.start);
    return { value: state.value, velocity: state.velocity, done: false };
  };
  driver.duration = start;
  return driver;
}

/**
 * Repite un conductor. Con `reverse`, las vueltas pares son `backward`, el mismo recorrido al revés: así no se sale de
 * lo pedido y, con muelle, cada vuelta arranca en reposo.
 */
export function repeatDriver(driver: Driver, { repeat, repeatType, backward }: { repeat: number; repeatType: 'loop' | 'reverse'; backward?: Driver }): Driver {
  const forwardLength = Math.max(lengthOf(driver), 1e-3);
  const returns = repeatType === 'reverse' ? backward : undefined;
  const backwardLength = returns ? Math.max(lengthOf(returns), 1e-3) : 0;
  const period = forwardLength + backwardLength;
  const passes = repeat + 1;
  const endsBackward = returns !== undefined && passes % 2 === 0;
  const total = returns ? Math.floor(passes / 2) * period + (passes % 2) * forwardLength : passes * forwardLength;
  return (elapsed) => {
    if (elapsed >= total) return { value: (endsBackward ? returns! : driver)(Number.MAX_SAFE_INTEGER).value, velocity: 0, done: true };
    const local = elapsed % period;
    const state = local < forwardLength ? driver(local) : returns!(local - forwardLength);
    return { value: state.value, velocity: state.velocity, done: false };
  };
}
