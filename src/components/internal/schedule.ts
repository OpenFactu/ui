/**
 * Matemática del calendario, sin React: reparto de eventos que se solapan, carriles de los de todo el día, rangos al
 * arrastrar en un hueco y movimientos con teclado. Probado en `scripts/controls.test.cjs`.
 */

export interface TimedItem {
  id: string;
  /** Inicio y fin en cualquier unidad comparable (minutos, milisegundos…). */
  start: number;
  end: number;
}

export interface OverlapSlot {
  /** Columna que ocupa dentro de su grupo de solapes. */
  col: number;
  /** Columnas del grupo. */
  cols: number;
  /** Cuántas columnas puede ocupar hacia la derecha sin tapar a nadie. */
  span: number;
}

/**
 * Reparte en columnas los eventos que coinciden en el tiempo, como Google Calendar: cada grupo de eventos
 * encadenados por solapes se divide en tantas columnas como haga falta, cada evento va a la primera libre y luego se
 * ensancha hacia la derecha mientras no pise a otro.
 */
export function layoutOverlaps(items: readonly TimedItem[]): Map<string, OverlapSlot> {
  const sorted = [...items].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const out = new Map<string, OverlapSlot>();
  let group: { item: TimedItem; col: number }[] = [];
  let columns: number[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    const cols = columns.length;
    for (const { item, col } of group) {
      let span = 1;
      for (let c = col + 1; c < cols; c++) {
        if (group.some((o) => o.col === c && o.item.start < item.end && o.item.end > item.start)) break;
        span += 1;
      }
      out.set(item.id, { col, cols, span });
    }
    group = []; columns = []; groupEnd = -Infinity;
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) flush();
    let col = columns.findIndex((end) => end <= item.start);
    if (col === -1) { col = columns.length; columns.push(item.end); } else columns[col] = item.end;
    group.push({ item, col });
    groupEnd = Math.max(groupEnd, item.end);
  }
  flush();
  return out;
}

export interface SpanItem {
  id: string;
  /** Primer y último día (índices, ambos incluidos). */
  from: number;
  to: number;
}

/** Carril de cada evento de varios días: los más largos primero, cada uno en el primer carril donde cabe. */
export function layoutLanes(items: readonly SpanItem[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from));
  const lanes: number[] = [];
  const out = new Map<string, number>();
  for (const item of sorted) {
    let lane = lanes.findIndex((to) => to < item.from);
    if (lane === -1) { lane = lanes.length; lanes.push(item.to); } else lanes[lane] = item.to;
    out.set(item.id, lane);
  }
  return out;
}

/** Rango, en minutos, que se crea arrastrando de `a` a `b` en cualquier sentido, ajustado a `step`. */
export function rangeFromDrag(a: number, b: number, step: number, max = Infinity): { from: number; to: number } {
  const from = Math.max(0, Math.floor(Math.min(a, b) / step) * step);
  let to = Math.min(max, Math.ceil(Math.max(a, b) / step) * step);
  if (to - from < step) to = Math.min(max, from + step);
  return { from, to };
}

/**
 * Movimiento con teclado: ↑/↓ mueve `step` minutos, ←/→ un día, y con Mayús ↑/↓ cambia la duración (nunca por
 * debajo de `step`). `null` si la tecla no hace nada.
 */
export function nudgeEvent(start: Date, end: Date, key: string, resize: boolean, step: number): { start: Date; end: Date } | null {
  const ms = step * 60000;
  const shift = (d: Date, delta: number) => new Date(d.getTime() + delta);
  const days = (d: Date, n: number) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
  if (resize && (key === 'ArrowUp' || key === 'ArrowDown')) {
    const next = shift(end, key === 'ArrowDown' ? ms : -ms);
    return next.getTime() - start.getTime() < ms ? null : { start, end: next };
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const delta = key === 'ArrowDown' ? ms : -ms;
    return { start: shift(start, delta), end: shift(end, delta) };
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const n = key === 'ArrowRight' ? 1 : -1;
    return { start: days(start, n), end: days(end, n) };
  }
  return null;
}
