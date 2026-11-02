/** Cuentas del Gantt, sin DOM: arrastres, flechas de dependencia, resumen de grupo y escalas. */
import { dias, sumarDias } from '../../internal/fechas';

export type GanttDragMode = 'mover' | 'inicio' | 'fin';
export type GanttScaleId = 'day' | 'week' | 'month' | 'quarter';

/** De más detalle a menos: el orden en que se acerca o se aleja el zoom. */
export const GANTT_SCALES: readonly GanttScaleId[] = ['day', 'week', 'month', 'quarter'];

/** La escala vecina (`1`: ver más tiempo; `-1`: más detalle), o la misma si ya está en el extremo. */
export function nextScale(scale: GanttScaleId, direction: 1 | -1): GanttScaleId {
  const index = GANTT_SCALES.indexOf(scale) + direction;
  return GANTT_SCALES[Math.max(0, Math.min(GANTT_SCALES.length - 1, index))];
}

/** Las fechas tras mover o estirar `days` días. Una tarea nunca acaba antes de empezar: el borde se queda en el otro. */
export function applyDrag(start: Date, end: Date, mode: GanttDragMode, days: number): { start: Date; end: Date } {
  if (mode === 'mover') return { start: sumarDias(start, days), end: sumarDias(end, days) };
  if (mode === 'inicio') { const next = sumarDias(start, days); return { start: next > end ? new Date(end) : next, end }; }
  const next = sumarDias(end, days);
  return { start, end: next < start ? new Date(start) : next };
}

/** El avance (0-1) tras arrastrar `dx` píxeles sobre una barra de ese ancho, ajustado a `step`. */
export function progressFromDrag(base: number, dx: number, width: number, step = 0.05): number {
  const raw = base + dx / Math.max(1, width);
  return Math.max(0, Math.min(1, Math.round(raw / step) * step));
}

/** Línea quebrada con las esquinas redondeadas; los tramos de longitud cero se ignoran. */
function roundedPolyline(points: ReadonlyArray<readonly [number, number]>, radius: number): string {
  const clean = points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  let path = `M ${clean[0][0]} ${clean[0][1]}`;
  for (let i = 1; i < clean.length; i += 1) {
    const [x, y] = clean[i];
    if (i === clean.length - 1) { path += ` L ${x} ${y}`; break; }
    const [px, py] = clean[i - 1]; const [nx, ny] = clean[i + 1];
    const inLength = Math.hypot(x - px, y - py); const outLength = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const ax = x - ((x - px) / inLength) * r; const ay = y - ((y - py) / inLength) * r;
    const bx = x + ((nx - x) / outLength) * r; const by = y + ((ny - y) / outLength) * r;
    path += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`;
  }
  return path;
}

/**
 * La flecha entre el final de una tarea y el principio de otra. Si hay sitio, un codo; si la segunda empieza antes de que
 * acabe la primera, da la vuelta por el medio para no pasar por encima de las barras.
 */
export function dependencyPath(x1: number, y1: number, x2: number, y2: number, radius = 4): string {
  if (x2 - x1 >= 16) {
    const mid = x2 - 8;
    return roundedPolyline([[x1, y1], [mid, y1], [mid, y2], [x2, y2]], radius);
  }
  const between = y1 === y2 ? y1 + 12 : (y1 + y2) / 2;
  return roundedPolyline([[x1, y1], [x1 + 8, y1], [x1 + 8, between], [x2 - 8, between], [x2 - 8, y2], [x2, y2]], radius);
}

/** Inicio, fin y avance (pesado por la duración de cada tarea) de un grupo. */
export function groupSummary(tasks: ReadonlyArray<{ start: Date; end: Date; progress?: number }>): { start: Date; end: Date; progress: number } | null {
  if (tasks.length === 0) return null;
  let start = tasks[0].start; let end = tasks[0].end; let done = 0; let total = 0;
  for (const task of tasks) {
    if (task.start < start) start = task.start;
    if (task.end > end) end = task.end;
    const length = dias(task.start, task.end) + 1;
    total += length; done += length * Math.max(0, Math.min(1, task.progress ?? 0));
  }
  return { start, end, progress: total ? done / total : 0 };
}
