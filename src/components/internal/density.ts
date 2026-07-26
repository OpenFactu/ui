/**
 * Escala de densidad compartida por Table, List y sus esqueletos de carga.
 *
 * Vive en `internal/` para que Skeleton pueda consumirla sin importar Table
 * (que a su vez importa Skeleton), evitando el ciclo.
 */
export type Density = 'compact' | 'normal' | 'comfy';

export interface DensitySpec {
  /** Padding de celda/fila. */
  cell: string;
  /** Tamaño de texto del contenido. */
  text: string;
  /** Alto de la barra del esqueleto, en px. */
  bar: number;
}

export const densityClasses: Record<Density, DensitySpec> = {
  compact: { cell: 'px-4 py-2', text: 'text-[12px]', bar: 10 },
  normal: { cell: 'px-4 py-3', text: 'text-[13px]', bar: 12 },
  comfy: { cell: 'px-4 py-4', text: 'text-[13px]', bar: 14 },
};

/**
 * Ancho pseudoaleatorio pero estable para una celda de esqueleto.
 * Determinista a propósito: con `Math.random()` las barras cambiarían de
 * tamaño en cada render y el bloque parpadearía.
 */
export function skeletonWidth(row: number, col: number, minPct = 45, maxPct = 90): string {
  const hash = (row * 31 + col * 17 + 7) % 100;
  return `${minPct + Math.round((hash / 99) * (maxPct - minPct))}%`;
}
