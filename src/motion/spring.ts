/**
 * Muelle amortiguado (oscilador armónico) resuelto en forma cerrada.
 *
 *   m·x″ + c·x′ + k·(x − destino) = 0
 *
 * Se trabaja con el desplazamiento respecto al destino, d = x − destino, y el
 * tiempo en segundos. La solución exacta (no una integración paso a paso) permite
 * muestrear la curva para CSS y retomar una animación en cualquier instante con
 * su velocidad real, que es lo que hace que un gesto soltado «siga» al dedo.
 */

export interface SpringConfig {
  /** Rigidez (k). Más alta = más rápida. */
  stiffness: number;
  /** Amortiguación (c). Más baja = más rebote. */
  damping: number;
  /** Masa (m). Default 1. */
  mass?: number;
}

/** Forma perceptiva, como en iOS: cuánto tarda y cuánto rebota (0 = nada, 1 = sin freno). */
export interface SpringFeel {
  /** Duración percibida en segundos. */
  duration: number;
  /** Rebote entre -1 y 1. 0 = crítico, positivo = rebota, negativo = sobreamortiguado. */
  bounce?: number;
}

export interface SpringState {
  /** Desplazamiento respecto al destino. */
  value: number;
  /** Velocidad, en unidades por segundo. */
  velocity: number;
}

/** Convierte `{ duration, bounce }` en física (fórmula de SwiftUI/Apple). */
export function spring({ duration, bounce = 0 }: SpringFeel): Required<SpringConfig> {
  const d = Math.max(0.01, duration);
  const b = Math.max(-0.99, Math.min(0.99, bounce));
  const stiffness = (2 * Math.PI / d) ** 2;
  const damping = b >= 0 ? (4 * Math.PI * (1 - b)) / d : (4 * Math.PI) / (d * (1 + b));
  return { stiffness, damping, mass: 1 };
}

/** Razón de amortiguación: <1 rebota, 1 crítico, >1 sobreamortiguado. */
export function dampingRatio({ stiffness, damping, mass = 1 }: SpringConfig): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Estado del muelle en el instante `t` (s), partiendo de un desplazamiento `d0`
 * y una velocidad `v0` (unidades/s). El destino es 0.
 */
export function springAt(t: number, config: SpringConfig, d0: number, v0 = 0): SpringState {
  const { stiffness: k, damping: c, mass: m = 1 } = config;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  if (Math.abs(zeta - 1) < 1e-6) {
    // Crítico: llega lo antes posible sin pasarse.
    const e = Math.exp(-w0 * t);
    const b = v0 + w0 * d0;
    return { value: e * (d0 + b * t), velocity: e * (v0 - w0 * t * b) };
  }
  if (zeta < 1) {
    // Subamortiguado: oscila con una envolvente que decae.
    const a = zeta * w0;
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const A = d0;
    const B = (v0 + a * d0) / wd;
    const e = Math.exp(-a * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return {
      value: e * (A * cos + B * sin),
      velocity: e * ((-a * A + wd * B) * cos + (-a * B - wd * A) * sin),
    };
  }
  // Sobreamortiguado: dos exponenciales, sin oscilar.
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  const C2 = (v0 - r1 * d0) / (r2 - r1);
  const C1 = d0 - C2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return { value: C1 * e1 + C2 * e2, velocity: r1 * C1 * e1 + r2 * C2 * e2 };
}

const MAX_SETTLE = 10;
const STEP = 1 / 240;

/**
 * Cuánto tarda en quedarse quieto (s): el último instante en que el desplazamiento
 * o la velocidad superan el umbral. `d0` y `v0` en las unidades de la animación.
 */
export function springSettleTime(config: SpringConfig, d0 = -1, v0 = 0, precision = 0.001): number {
  const scale = Math.max(Math.abs(d0), 1e-9);
  let last = 0;
  for (let t = 0; t <= MAX_SETTLE; t += STEP) {
    const { value, velocity } = springAt(t, config, d0, v0);
    if (Math.abs(value) / scale > precision || Math.abs(velocity) / scale > precision * 20) last = t;
    else if (t - last > 0.25) break;
  }
  return Math.min(MAX_SETTLE, last + STEP);
}

/** Progreso 0→1 en el instante `t` (s), para una transición de 0 a 1 con velocidad inicial `v0` (progreso/s). */
export function springProgress(t: number, config: SpringConfig, v0 = 0): number {
  return 1 + springAt(t, config, -1, v0).value;
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Simplifica una polilínea conservando la forma (Ramer–Douglas–Peucker). */
function simplify(points: Array<[number, number]>, tolerance: number): Array<[number, number]> {
  if (points.length < 3) return points;
  const [x1, y1] = points[0];
  const [x2, y2] = points[points.length - 1];
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    // Distancia vertical a la recta: el eje x es el tiempo y lo que importa es el error de posición.
    const expected = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1 || 1);
    const distance = Math.abs(y - expected);
    if (distance > maxDistance) { maxDistance = distance; index = i; }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** Fracción del recorrido por debajo de la cual el muelle se da por asentado en CSS: invisible a ojo. */
export const CSS_PRECISION = 0.004;

export interface SpringCss {
  /** Curva para `transition-timing-function` / `animation-timing-function`: `linear(…)`. */
  easing: string;
  /** Duración en milisegundos (el tiempo hasta quedarse quieto). */
  duration: number;
}

/**
 * La curva del muelle como `linear()` de CSS: la transición deja de ser una curva
 * inventada y sigue la física (incluido el rebote), sin JavaScript por fotograma.
 */
export function springToLinear(config: SpringConfig, tolerance = 0.0025): SpringCss {
  const settle = springSettleTime(config, -1, 0, CSS_PRECISION);
  const samples = 240;
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    const t = (settle * i) / samples;
    points.push([i / samples, springProgress(t, config)]);
  }
  points[0] = [0, 0];
  points[points.length - 1] = [1, 1];
  const kept = simplify(points, tolerance);
  const stops = kept.map(([x, y], i) => {
    const value = round(y, 4);
    if (i === 0 || i === kept.length - 1) return String(value);
    return `${value} ${round(x * 100, 2)}%`;
  });
  return { easing: `linear(${stops.join(', ')})`, duration: Math.round(settle * 1000) };
}

/**
 * Aproximación con `cubic-bezier`, para navegadores sin `linear()`. Conserva el
 * carácter (rebote o no) aunque no la forma exacta.
 */
export function springToCubic(config: SpringConfig): string {
  const zeta = dampingRatio(config);
  if (zeta >= 1) return 'cubic-bezier(0.22, 1, 0.36, 1)';
  const overshoot = Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
  const y1 = round(Math.min(2, 1 + overshoot * 2.4), 3);
  return `cubic-bezier(0.34, ${y1}, 0.64, 1)`;
}

/** Parámetros «k c m» tal como se emiten en las variables del tema, para leerlos desde JS. */
export const springToParams = ({ stiffness, damping, mass = 1 }: SpringConfig) => `${round(stiffness, 3)} ${round(damping, 3)} ${round(mass, 3)}`;
export function parseSpringParams(text: string | null | undefined): Required<SpringConfig> | null {
  const parts = (text ?? '').trim().split(/\s+/).map(Number);
  if (parts.length < 2 || parts.some(n => !Number.isFinite(n)) || parts[0] <= 0 || parts[1] < 0) return null;
  return { stiffness: parts[0], damping: parts[1], mass: parts[2] > 0 ? parts[2] : 1 };
}
