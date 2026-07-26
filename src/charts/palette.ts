/**
 * Paleta de series para gráficos.
 *
 * El **orden es el mecanismo de seguridad**, no un adorno: se eligió entre
 * varias candidatas ejecutando el validador de paletas, y solo se conservó una
 * que superase todas las comprobaciones (banda de luminosidad, suelo de croma,
 * separación para daltonismo, suelo de visión normal y contraste) en los dos
 * modos. Resultado registrado:
 *
 *   claro  (superficie #ffffff) → peor par adyacente ΔE 10.7 · TODO PASA
 *   oscuro (superficie #1a2535) → peor par adyacente ΔE 13.0 · TODO PASA
 *   oscuro (superficie #2b1e38, el fondo más claro que genera un tema) → TODO PASA
 *
 * Reglas que se derivan de esto y que el componente `Chart` aplica solo:
 *
 * - Los colores se asignan **en orden y sin ciclar**. Una novena serie no
 *   inventa un tono: se agrupa en «Otros» o se separa en varios gráficos.
 * - El color va ligado a la **entidad**, nunca a su posición en un ranking:
 *   filtrar no debe repintar las series que quedan.
 * - En claro, `warning` y `magenta` quedan por debajo de 3:1 sobre blanco, así
 *   que los gráficos llevan leyenda y etiquetas visibles: el color nunca es el
 *   único canal.
 * - Los pasos oscuros están **elegidos** para el fondo oscuro, no obtenidos
 *   invirtiendo los claros.
 *
 * Si se cambia cualquier valor, hay que volver a pasar el validador.
 */

export type ChartMode = 'light' | 'dark';

/** Nombre de cada ranura, para poder referirse a ellas sin usar el índice. */
export const CHART_SERIES_SLOTS = [
  'teal',
  'orange',
  'blue',
  'yellow',
  'magenta',
  'green',
  'violet',
  'red',
] as const;

export type ChartSeriesSlot = (typeof CHART_SERIES_SLOTS)[number];

export const CHART_SERIES: Record<ChartMode, string[]> = {
  light: ['#0d9488', '#eb6834', '#2a78d6', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#0fa89a', '#d95926', '#3987e5', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/**
 * Roles semánticos. Son colores **reservados**: no se reparten como si fueran
 * una serie más, porque «rojo» tiene que seguir significando lo mismo en todos
 * los gráficos. Se acompañan siempre de etiqueta, nunca van solos.
 */
export const CHART_ROLES = {
  positive: { light: '#15803d', dark: '#4ade80' },
  negative: { light: '#b91c1c', dark: '#fca5a5' },
  warning: { light: '#b45309', dark: '#fbbf24' },
  neutral: { light: '#94a3b8', dark: '#64748b' },
} as const;

export type ChartRole = keyof typeof CHART_ROLES;

/** Rampa de un solo tono para magnitudes continuas (mapas de calor, intensidad). */
export const CHART_SEQUENTIAL: Record<ChartMode, string[]> = {
  light: ['#ccefed', '#93d5cf', '#54bab0', '#1f9e91', '#0d7d72', '#075c54'],
  dark: ['#073d38', '#0a5c54', '#0d7d72', '#12a094', '#4cc2b7', '#93d5cf'],
};

/** Ejes, rejilla y superficie del tooltip, leídos del tema activo. */
export const CHART_CHROME = {
  axis: 'var(--fg-subtle, #94a3b8)',
  grid: 'var(--border-subtle, #f1f5f9)',
  tooltipBg: 'var(--bg-card, #ffffff)',
  tooltipBorder: 'var(--border-default, #e2e8f0)',
  tooltipText: 'var(--fg-default, #0a1628)',
} as const;

function isRole(value: string): value is ChartRole {
  return value in CHART_ROLES;
}

/**
 * Color definitivo de una serie.
 *
 * @param index posición de la serie; **no** su puesto en un ranking.
 * @param color rol semántico, hex explícito, o nada para usar la ranura.
 */
export function seriesColor(index: number, mode: ChartMode, color?: string): string {
  if (color) {
    if (isRole(color)) return CHART_ROLES[color][mode];
    return color;
  }
  const slots = CHART_SERIES[mode];
  // Sin ciclar: a partir de la octava, todas comparten la ranura neutra, que es
  // la señal de que hay demasiadas series y toca agrupar en «Otros».
  return index < slots.length ? slots[index] : CHART_ROLES.neutral[mode];
}

/** Número de series a partir del cual conviene agrupar en «Otros». */
export const MAX_SERIES = CHART_SERIES.light.length;
