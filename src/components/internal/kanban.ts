/** Matemática del tablero, sin React. Probada en `scripts/schedule.test.cjs`. */

/**
 * Posición `pos` entre las tarjetas de un carril → índice en la columna entera. `lanes` es el carril de cada tarjeta
 * de la columna, en orden. Más allá de la última del carril se inserta justo después de ella (o al final si el carril
 * está vacío), para que la tarjeta no salte a otro carril al hacer `splice`.
 */
export function laneToColumnIndex(lanes: readonly string[], lane: string, pos: number): number {
  const own: number[] = [];
  lanes.forEach((l, i) => { if (l === lane) own.push(i); });
  if (pos < own.length) return own[Math.max(0, pos)];
  return own.length ? own[own.length - 1] + 1 : lanes.length;
}

/**
 * Índice final al soltar. El destino se calcula sobre la lista tal y como se ve, que en la misma columna todavía
 * incluye la tarjeta arrastrada: al moverla hacia abajo hay que restar uno. `null` si queda donde estaba.
 */
export function finalIndex(fromColumn: string, fromIndex: number, toColumn: string, toIndex: number): number | null {
  const same = fromColumn === toColumn;
  const index = same && toIndex > fromIndex ? toIndex - 1 : toIndex;
  return same && index === fromIndex ? null : index;
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Urgencia de una fecha de vencimiento: vencida, hoy, en los próximos `soonDays` días o más adelante. */
export function dueState(due: Date, today: Date, soonDays = 2): DueState {
  const days = Math.round((dayStart(due) - dayStart(today)) / 86400000);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return days <= soonDays ? 'soon' : 'later';
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «Hoy», «Mañana», «Ayer» o «12 ago». */
export function dueLabel(due: Date, today: Date): string {
  const days = Math.round((dayStart(due) - dayStart(today)) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  return `${due.getDate()} ${MONTHS[due.getMonth()]}`;
}

/**
 * Siguiente destino con teclado. `pos` es la posición final (ya sin la tarjeta) dentro de la celda; en la celda de
 * origen hay una tarjeta menos donde elegir. Devuelve el índice «tal y como se ve» que usa el arrastre con puntero.
 */
export function keyboardTarget(pos: number, cellLength: number, sameCell: boolean, fromIndex: number): number {
  const max = sameCell ? cellLength - 1 : cellLength;
  const clamped = Math.max(0, Math.min(max, pos));
  return sameCell && clamped >= fromIndex ? clamped + 1 : clamped;
}
