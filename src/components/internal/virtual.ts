/** Cálculo de la ventana visible de una lista virtual, con alturas fijas o variables. Puro para poder probarlo. */

/** Posición de inicio de cada fila (prefijos acumulados) y altura total. `offsets[i]` es donde empieza la fila `i`. */
export function buildOffsets(count: number, heightOf: (index: number) => number): { offsets: Float64Array; total: number } {
  const offsets = new Float64Array(count + 1);
  for (let i = 0; i < count; i += 1) offsets[i + 1] = offsets[i] + heightOf(i);
  return { offsets, total: offsets[count] };
}

/** Primera fila cuyo final pasa de `y` (búsqueda binaria sobre los prefijos). */
export function indexAt(offsets: Float64Array, count: number, y: number): number {
  let lo = 0; let hi = Math.max(0, count - 1);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] <= y) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/**
 * Filas a pintar para un desplazamiento y una altura de ventana, con `overscan` filas de margen por cada lado.
 * `end` es exclusivo.
 */
export function computeRange(offsets: Float64Array, count: number, scrollTop: number, viewport: number, overscan = 4): { start: number; end: number } {
  if (count === 0) return { start: 0, end: 0 };
  const first = indexAt(offsets, count, Math.max(0, scrollTop));
  const last = indexAt(offsets, count, Math.max(0, scrollTop + viewport - 1));
  return { start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) };
}

/** Desplazamiento para ver una fila: arriba, centrada, abajo o lo mínimo para que se vea (`auto`). */
export function scrollOffsetFor(offsets: Float64Array, index: number, viewport: number, current: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto'): number {
  const top = offsets[index]; const bottom = offsets[index + 1];
  if (align === 'start') return top;
  if (align === 'end') return bottom - viewport;
  if (align === 'center') return top - (viewport - (bottom - top)) / 2;
  if (top < current) return top;
  if (bottom > current + viewport) return bottom - viewport;
  return current;
}
