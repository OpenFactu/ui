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

/** Lo que tiene que pasarse la hoja de un anclaje para que el siguiente lanzamiento cuente a partir de él (px). */
const SNAP_MARGIN = 8;

export interface PickSnapOptions {
  /** Velocidad (px/ms) a partir de la que soltar es un lanzamiento. Default 0,5. */
  flick?: number;
  /** Velocidad (px/ms) a partir de la que un lanzamiento va al extremo o cierra. Default 2,5. */
  jump?: number;
  dismissible?: boolean;
  /** Frenada de la inercia al soltar sin lanzar, como `decelerationRate` en iOS. Default 0,997. */
  deceleration?: number;
}

/**
 * Anclaje al que va la hoja al soltarla. `height` es la altura visible en ese momento y `velocity` la velocidad del
 * dedo en px/ms, positiva hacia **arriba** (la hoja crece). Devuelve `-1` si la hoja debe cerrarse.
 *
 * - **Soltar sin lanzar:** el anclaje más cercano a donde llegaría por inercia. Se cierra si acaba bastante por debajo
 *   del primero.
 * - **Lanzamiento normal:** un solo anclaje en su sentido, contando desde donde está la hoja. Hacia abajo desde el
 *   primero, se cierra. Proyectar aquí no sirve: cada px/ms son unos 330 px, así que un gesto corriente rebasaría
 *   anclajes enteros y podría cerrar una hoja abierta del todo.
 * - **Lanzamiento muy fuerte:** al anclaje más alto o, hacia abajo, se cierra.
 *
 * Si la hoja no se puede cerrar, donde tocaría cerrar se queda en el primero.
 */
export function pickSnap(height: number, velocity: number, heights: readonly number[], options: PickSnapOptions = {}): number {
  const { flick = 0.5, jump = 2.5, dismissible = true, deceleration = 0.997 } = options;
  if (!heights.length) return -1;
  const last = heights.length - 1;
  const closed = dismissible ? -1 : 0;
  if (velocity >= jump) return last;
  if (velocity <= -jump) return closed;
  if (velocity > flick) {
    const next = heights.findIndex((h) => h > height + SNAP_MARGIN);
    return next === -1 ? last : next;
  }
  if (velocity < -flick) {
    for (let i = last; i >= 0; i -= 1) if (heights[i] < height - SNAP_MARGIN) return i;
    return closed;
  }
  // Distancia que recorrería frenando de forma exponencial: v·d/(1−d) por milisegundo.
  const projected = height + (velocity * deceleration) / (1 - deceleration);
  if (dismissible && projected < heights[0] * 0.5) return -1;
  return nearestIndex(projected, heights);
}

/** Índice del anclaje más cercano a una altura. */
export function nearestIndex(height: number, heights: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < heights.length; i += 1) if (Math.abs(heights[i] - height) < Math.abs(heights[best] - height)) best = i;
  return best;
}
