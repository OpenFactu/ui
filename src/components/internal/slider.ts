/** Cálculos del `Slider`, puros para poder probarlos. */

/** Número de decimales de un paso (0,05 → 2): evita los «0,30000000000000004» al redondear. */
export function stepDecimals(step: number): number {
  const text = String(step);
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  return (text.split('.')[1] ?? '').length;
}

/** Ajusta un valor al paso más cercano, contado desde `min`, y lo deja dentro de los límites. */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (!(max > min)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  if (!(step > 0)) return clamped;
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(stepDecimals(step)));
}

/** Fracción 0–1 de un valor dentro del rango. */
export const percent = (value: number, min: number, max: number) => (max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0);

/** Valor que corresponde a una posición del puntero sobre la pista (`offset` píxeles de `length`). */
export function valueFromPosition(offset: number, length: number, min: number, max: number, step: number): number {
  const fraction = length > 0 ? Math.min(1, Math.max(0, offset / length)) : 0;
  return snapToStep(min + fraction * (max - min), min, max, step);
}

/**
 * Coloca uno de los dos extremos de un rango sin que se crucen con el otro (ni se acerquen más que `minGap`).
 * `index` 0 es el inicio y 1 el final.
 */
export function clampRange(range: readonly [number, number], index: 0 | 1, value: number, min: number, max: number, step: number, minGap = 0): [number, number] {
  const v = snapToStep(value, min, max, step);
  return index === 0
    ? [Math.min(v, range[1] - minGap), range[1]]
    : [range[0], Math.max(v, range[0] + minGap)];
}

/** Qué extremo de un rango debe moverse al pulsar en la pista: el más cercano (si coinciden, el que deja hueco). */
export function nearestThumb(range: readonly [number, number], value: number): 0 | 1 {
  const d0 = Math.abs(value - range[0]); const d1 = Math.abs(value - range[1]);
  if (d0 === d1) return value > range[1] ? 1 : 0;
  return d0 < d1 ? 0 : 1;
}
