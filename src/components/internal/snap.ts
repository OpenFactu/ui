/** Puntos de anclaje de una hoja inferior (`BottomSheet`), puros para poder probarlos. */

/** Un anclaje: fracción de la altura disponible (≤ 1), píxeles (> 1) o `'auto'`, la altura de su propio contenido. */
export type SnapPoint = number | 'auto';

/**
 * Pasa los anclajes a alturas en píxeles, ordenadas de menor a mayor y sin duplicados. `'auto'` vale `content` (la
 * altura natural de la hoja con todo su contenido), limitada a lo disponible.
 */
export function resolveSnapPoints(points: readonly SnapPoint[], available: number, content = available): number[] {
  const heights = points
    .map((p) => (p === 'auto' ? content : p <= 1 ? p * available : p))
    .map((h) => Math.round(Math.min(available, Math.max(0, h))))
    .filter((h) => h > 0);
  return [...new Set(heights)].sort((a, b) => a - b);
}

/**
 * Anclaje al que va la hoja al soltarla. `height` es la altura visible en ese momento y `velocity` la velocidad del
 * dedo en px/ms, positiva hacia **arriba** (la hoja crece).
 *
 * Se proyecta adónde llegaría por inercia y se elige el anclaje más cercano a esa proyección. Un lanzamiento claro
 * avanza al menos un anclaje en su sentido. Devuelve `-1` si la hoja debe cerrarse: lanzada hacia abajo desde el
 * primero, o soltada bastante por debajo de él.
 */
export function pickSnap(height: number, velocity: number, heights: readonly number[], options: { flick?: number; dismissible?: boolean; deceleration?: number } = {}): number {
  const { flick = 0.5, dismissible = true, deceleration = 0.997 } = options;
  if (!heights.length) return -1;
  // Distancia que recorrería frenando de forma exponencial: v·d/(1−d) por milisegundo.
  const projected = height + (velocity * deceleration) / (1 - deceleration);
  const lowest = heights[0];
  if (dismissible && (projected < lowest * 0.5 || (velocity < -flick && height <= lowest + 8))) return -1;
  let best = 0;
  for (let i = 1; i < heights.length; i += 1) if (Math.abs(heights[i] - projected) < Math.abs(heights[best] - projected)) best = i;
  // Un lanzamiento claro nunca se queda en el mismo sitio: avanza al menos uno.
  const current = nearestIndex(height, heights);
  if (velocity > flick && best <= current && current < heights.length - 1) best = current + 1;
  if (velocity < -flick && best >= current && current > 0) best = current - 1;
  return best;
}

/** Índice del anclaje más cercano a una altura. */
export function nearestIndex(height: number, heights: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < heights.length; i += 1) if (Math.abs(heights[i] - height) < Math.abs(heights[best] - height)) best = i;
  return best;
}
