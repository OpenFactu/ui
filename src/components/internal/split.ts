/** Cálculos del `SplitPane`, puros para poder probarlos. */

/** Un tamaño en píxeles o en porcentaje del contenedor (`'30%'`). */
export type SplitSize = number | `${number}%`;

/** Pasa un tamaño a píxeles para un contenedor de `total` píxeles. */
export function toPixels(size: SplitSize | undefined, total: number, fallback: number): number {
  if (size === undefined) return fallback;
  if (typeof size === 'number') return size;
  const n = parseFloat(size);
  return Number.isFinite(n) ? (n / 100) * total : fallback;
}

/** Limita el tamaño del primer panel: entre su mínimo y su máximo, y dejando al segundo su propio mínimo. */
export function clampSplit(size: number, total: number, min: number, max: number, minOther: number): number {
  const upper = Math.min(max, total - minOther);
  return Math.max(Math.min(min, upper), Math.min(upper, size));
}

/**
 * Siguiente tamaño con el teclado. Flechas: 16 px, o el 10 % del contenedor con Mayús; Inicio y Fin van al mínimo y
 * al máximo. Devuelve `null` si la tecla no es del separador.
 */
export function keyboardSplit(key: string, size: number, total: number, min: number, max: number, minOther: number, shift: boolean, vertical: boolean): number | null {
  const step = shift ? Math.max(16, total * 0.1) : 16;
  const grow = vertical ? 'ArrowDown' : 'ArrowRight';
  const shrink = vertical ? 'ArrowUp' : 'ArrowLeft';
  if (key === grow) return clampSplit(size + step, total, min, max, minOther);
  if (key === shrink) return clampSplit(size - step, total, min, max, minOther);
  if (key === 'Home') return clampSplit(min, total, min, max, minOther);
  if (key === 'End') return clampSplit(max, total, min, max, minOther);
  return null;
}
