import { DEFAULT_LOCALE, formatNumber } from '../internal/intl';
import { MobileScheduleActions } from './internal/MobileScheduleActions';
import * as React from 'react';
import { formatMessage } from '../i18n/format';
import type { Messages } from '../i18n/messages';
import { cn } from '../utils';
import {
  aFecha,
  dias,
  esFinde,
  sumarDias,
} from '../internal/fechas';
import { useI18n, useMessages } from '../i18n/I18nProvider';
import { UiIcon } from '../icons';
import { useIsMobile } from '../hooks/useMediaQuery';
import { motionDisabled } from '../motion/dom';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { GANTT_SCALES, applyDrag, dependencyPath, groupSummary, nextScale, progressFromDrag, type GanttDragMode } from './internal/gantt';

export type GanttScale = 'day' | 'week' | 'month' | 'quarter';

/** Estado de una tarea. Decide el color de la barra si no se indica otro. */
export type GanttStatus = 'pendiente' | 'en-curso' | 'hecha' | 'bloqueada';

export interface GanttTask {
  id: string;
  name: string;
  /** Inicio y fin, inclusive. Si coinciden se pinta como hito (rombo). */
  start: Date | string;
  end: Date | string;
  /** 0..1. Pinta el relleno de avance dentro de la barra. */
  progress?: number;
  status?: GanttStatus;
  /** Color propio; manda sobre el del estado. */
  color?: string;
  /** Color del texto sobre `color`. Solo hace falta con un color propio. */
  textColor?: string;
  /** Ids de las tareas de las que depende; se dibuja la flecha. */
  dependencies?: string[];
  /** Agrupa en una fila de encabezado (proyecto, fase, persona…). */
  group?: string;
  /** Ni se mueve ni se redimensiona. */
  locked?: boolean;
  /** Texto a la derecha de la barra (responsable, horas…). Las barras cortas ponen ahí también su nombre. */
  meta?: React.ReactNode;
}

export interface GanttChange {
  start: Date;
  end: Date;
}

export interface GanttProps {
  tasks: GanttTask[];
  scale?: GanttScale;
  /** Con `toolbar` o Ctrl + rueda, la escala cambia sola y avisa aquí. */
  onScaleChange?: (scale: GanttScale) => void;
  /** Barra con la escala y «Hoy». También activa el zoom con Ctrl o ⌘ + rueda, que deja en el centro la misma fecha. */
  toolbar?: boolean;
  /** Primer y último día visibles. Por defecto, los de las tareas con margen. */
  rangeStart?: Date | string;
  rangeEnd?: Date | string;
  /** Arrastrar para mover o cambiar duración. Sin esto, es solo lectura. */
  onTaskChange?: (task: GanttTask, change: GanttChange) => void;
  /** Arrastrar el punto de avance de la barra (o flechas sobre él), al 5 %. Sin esto, el avance es solo lectura. */
  onProgressChange?: (task: GanttTask, progress: number) => void;
  onTaskClick?: (task: GanttTask) => void;
  /** Ancho en píxeles de la columna de nombres. Default 220. */
  labelWidth?: number;
  /** Alto de cada fila. Default 34. */
  rowHeight?: number;
  /** Marca vertical del día de hoy. Default true. */
  showToday?: boolean;
  /** Dónde arranca el scroll horizontal: en hoy (por defecto) o en el principio. */
  initialScroll?: 'today' | 'start';
  /** Los grupos se pliegan, dejando su barra resumen. Default true. */
  collapsibleGroups?: boolean;
  /** Fecha que se considera «hoy»; útil para pruebas. */
  today?: Date | string;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

/** Píxeles por día en cada escala. */
const PX_POR_DIA: Record<GanttScale, number> = {
  day: 34,
  week: 13,
  month: 4.2,
  quarter: 1.6,
};

/**
 * Color de la barra y el texto que se lee ENCIMA de ese color. El segundo no
 * es siempre blanco: sobre el verde de «hecha» el blanco no llega al mínimo
 * legible, y para eso están los tokens `--k-*-on`.
 */
const COLOR_ESTADO: Record<GanttStatus, { bg: string; fg: string }> = {
  // `--k-ink-500` y no `--fg-subtle`: el segundo se invierte con el modo, y en
  // oscuro se volvía un gris claro que dejaba el texto blanco en 2.89:1. La
  // escala de tinta es fija, así que aguanta en los dos modos (4.57:1).
  pendiente: { bg: 'var(--k-ink-500, #64748b)', fg: '#ffffff' },
  'en-curso': { bg: 'rgb(var(--color-accent-rgb))', fg: 'var(--k-accent-on)' },
  hecha: { bg: 'var(--k-success)', fg: 'var(--k-success-on)' },
  bloqueada: { bg: 'var(--k-danger)', fg: 'var(--k-danger-on)' },
};

interface Tramo {
  inicio: Date;
  /** Días que ocupa. */
  ancho: number;
  etiqueta: string;
  /** Marca de fin de semana, para sombrear la columna. */
  finde?: boolean;
}

/**
 * Garantiza que los tramos cubren hasta el último día visible. Los bucles
 * avanzan de semana o de mes y paran en cuanto el inicio se pasa de `hasta`,
 * de modo que el último tramo puede quedarse corto y dejar la regla y la
 * rejilla sin pintar el tramo final — un hueco visible al desplazarse al final.
 */
function cubrir(tramos: Tramo[], hasta: Date): Tramo[] {
  if (tramos.length === 0) return tramos;
  const ultimo = tramos[tramos.length - 1];
  const finCubierto = sumarDias(ultimo.inicio, ultimo.ancho);
  const faltan = dias(finCubierto, hasta) + 1;
  if (faltan > 0) ultimo.ancho += faltan;
  return tramos;
}

/** Divisiones menores del encabezado, según la escala. */
function tramosMenores(desde: Date, hasta: Date, scale: GanttScale, dn: Messages['dates']): Tramo[] {
  const salida: Tramo[] = [];
  if (scale === 'day') {
    for (let d = new Date(desde); d <= hasta; d = sumarDias(d, 1)) {
      salida.push({
        inicio: new Date(d),
        ancho: 1,
        etiqueta: String(d.getDate()),
        finde: esFinde(d),
      });
    }
    return cubrir(salida, hasta);
  }
  if (scale === 'week') {
    // Empieza el lunes anterior al primer día visible.
    const d = new Date(desde);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    for (; d <= hasta; d.setDate(d.getDate() + 7)) {
      salida.push({ inicio: new Date(d), ancho: 7, etiqueta: formatMessage(dn.dayMonthShort, { day: d.getDate(), month: dn.monthsShort[d.getMonth()] }) });
    }
    return cubrir(salida, hasta);
  }
  const paso = scale === 'month' ? 1 : 3;
  const d = new Date(desde);
  d.setDate(1);
  for (; d <= hasta; d.setMonth(d.getMonth() + paso)) {
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + paso);
    salida.push({
      inicio: new Date(d),
      ancho: dias(d, fin),
      etiqueta:
        scale === 'month'
          ? dn.monthsShort[d.getMonth()]
          : formatMessage(dn.quarterShort, { quarter: Math.floor(d.getMonth() / 3) + 1 }),
    });
  }
  return cubrir(salida, hasta);
}

/** Divisiones mayores: mes sobre los días, año sobre los meses. */
function tramosMayores(desde: Date, hasta: Date, scale: GanttScale, dn: Messages['dates']): Tramo[] {
  const salida: Tramo[] = [];
  const porAnio = scale === 'month' || scale === 'quarter';
  const d = new Date(desde);
  if (porAnio) d.setMonth(0, 1);
  else d.setDate(1);
  for (; d <= hasta; porAnio ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1)) {
    const fin = new Date(d);
    if (porAnio) fin.setFullYear(fin.getFullYear() + 1);
    else fin.setMonth(fin.getMonth() + 1);
    salida.push({
      inicio: new Date(d),
      ancho: dias(d, fin),
      etiqueta: porAnio
        ? String(d.getFullYear())
        : `${dn.monthsShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return cubrir(salida, hasta);
}

interface Fila {
  kind: 'grupo' | 'tarea';
  key: string;
  name: string;
  task?: GanttTask;
}

/** Aplana el catálogo en filas, insertando un encabezado por grupo (sin las tareas de los grupos plegados). */
function filas(tasks: GanttTask[], plegados: ReadonlySet<string>): Fila[] {
  const salida: Fila[] = [];
  const vistos = new Set<string>();
  for (const t of tasks) {
    if (t.group && !vistos.has(t.group)) {
      vistos.add(t.group);
      salida.push({ kind: 'grupo', key: `g:${t.group}`, name: t.group });
      if (plegados.has(t.group)) continue;
      for (const s of tasks) {
        if (s.group === t.group) salida.push({ kind: 'tarea', key: s.id, name: s.name, task: s });
      }
      continue;
    }
    if (!t.group) salida.push({ kind: 'tarea', key: t.id, name: t.name, task: t });
  }
  return salida;
}

type Arrastre = {
  id: string;
  modo: GanttDragMode | 'avance';
  xInicial: number;
  desplazamiento: number;
  /** Scroll de la línea de tiempo al empezar: desplazarse mientras se arrastra también mueve la barra. */
  scroll0: number;
  /** Solo con `avance`: de dónde parte y sobre qué ancho se mide. */
  base: number;
  anchoBarra: number;
};

/**
 * Diagrama de Gantt.
 *
 * Las tareas llegan con fecha de inicio y de fin; el componente calcula la
 * escala, pinta la rejilla y coloca las barras. Arrastrando una barra se mueve
 * y arrastrando sus bordes cambia de duración: mientras dura el gesto solo se
 * mueve la vista (con un chip que cuenta las fechas y el hueco de donde estaba),
 * y al soltar se avisa una vez con las fechas nuevas — así quien lo usa decide
 * si guarda, y no hay veinte peticiones por arrastre. Con el teclado: las flechas
 * mueven un día, Mayús + flechas cambia el fin y Alt + flechas el inicio.
 *
 * ```tsx
 * <Gantt
 *   toolbar
 *   tasks={tareas}
 *   onTaskChange={(t, { start, end }) => guardar(t.id, start, end)}
 *   onProgressChange={(t, avance) => guardarAvance(t.id, avance)}
 * />
 * ```
 */
export const Gantt: React.FC<GanttProps> = ({
  tasks,
  scale = 'week',
  onScaleChange,
  toolbar = false,
  rangeStart,
  rangeEnd,
  onTaskChange,
  onProgressChange,
  onTaskClick,
  labelWidth = 220,
  rowHeight = 34,
  showToday = true,
  initialScroll = 'today',
  collapsibleGroups = true,
  today,
  emptyMessage: emptyMessageProp,
  className,
  'aria-label': ariaLabelProp,
}) => {
  const dn = useMessages('dates');
  const ganttTexts = useMessages('gantt');
  const { format } = useI18n();
  const mobile = useIsMobile();
  const emptyMessage = emptyMessageProp ?? ganttTexts.empty;
  const ariaLabel = ariaLabelProp ?? ganttTexts.label;
  const [escala, setEscala] = React.useState<GanttScale>(scale);
  React.useEffect(() => setEscala(scale), [scale]);
  const pxDia = PX_POR_DIA[escala];
  const hoy = React.useMemo(() => aFecha(today ?? new Date()), [today]);

  const normalizadas = React.useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        _inicio: aFecha(t.start),
        _fin: aFecha(t.end),
      })),
    [tasks],
  );

  const [arrastre, setArrastre] = React.useState<Arrastre | null>(null);
  const [activa, setActiva] = React.useState<string | null>(null);
  const [plegados, setPlegados] = React.useState<ReadonlySet<string>>(() => new Set());
  const [anuncio, setAnuncio] = React.useState('');
  const linea = React.useRef<HTMLDivElement>(null);
  const punteroX = React.useRef<number | null>(null);
  // Tras un arrastre de verdad, el clic que llega al soltar no debe abrir la tarea.
  const huboMovimiento = React.useRef(false);

  const [desde, hasta] = React.useMemo(() => {
    if (rangeStart && rangeEnd) return [aFecha(rangeStart), aFecha(rangeEnd)];
    if (normalizadas.length === 0) return [sumarDias(hoy, -7), sumarDias(hoy, 21)];
    let min = normalizadas[0]._inicio;
    let max = normalizadas[0]._fin;
    for (const t of normalizadas) {
      if (t._inicio < min) min = t._inicio;
      if (t._fin > max) max = t._fin;
    }
    // Un poco de aire a cada lado para que las barras no toquen el borde.
    const aire = escala === 'day' ? 2 : escala === 'week' ? 7 : 31;
    return [
      aFecha(rangeStart ?? sumarDias(min, -aire)),
      aFecha(rangeEnd ?? sumarDias(max, aire)),
    ];
  }, [normalizadas, rangeStart, rangeEnd, escala, hoy]);

  const totalDias = Math.max(1, dias(desde, hasta) + 1);
  const anchoLinea = totalDias * pxDia;
  const menores = React.useMemo(() => tramosMenores(desde, hasta, escala, dn), [desde, hasta, escala, dn]);
  const mayores = React.useMemo(() => tramosMayores(desde, hasta, escala, dn), [desde, hasta, escala, dn]);
  const lista = React.useMemo(() => filas(normalizadas, plegados), [normalizadas, plegados]);

  const x = (d: Date) => dias(desde, d) * pxDia;

  // ── Escala y scroll ──────────────────────────────────────────────────

  // Al cambiar de escala, la fecha que estaba en el centro de la vista sigue en el centro.
  const centro = React.useRef<Date | null>(null);
  const cambiarEscala = (siguiente: GanttScale) => {
    if (siguiente === escala) return;
    const el = linea.current;
    if (el) centro.current = sumarDias(desde, Math.round((el.scrollLeft + el.clientWidth / 2) / pxDia));
    setEscala(siguiente);
    onScaleChange?.(siguiente);
  };
  React.useLayoutEffect(() => {
    const el = linea.current;
    if (!el || !centro.current) return;
    el.scrollLeft = x(centro.current) - el.clientWidth / 2;
    centro.current = null;
  }, [escala]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoyVisible = hoy >= desde && hoy <= hasta;
  const irAHoy = (suave: boolean) => {
    const el = linea.current;
    if (!el || !hoyVisible) return;
    el.scrollTo({ left: x(hoy) + pxDia / 2 - el.clientWidth / 2, behavior: suave && !motionDisabled(el) ? 'smooth' : 'auto' });
  };
  React.useLayoutEffect(() => { if (initialScroll === 'today' && showToday) irAHoy(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl o ⌘ + rueda acerca o aleja (solo con la barra de herramientas: sin ella, la escala es cosa de quien la usa).
  const zoom = React.useRef({ escala, cambiarEscala });
  zoom.current = { escala, cambiarEscala };
  React.useEffect(() => {
    const el = linea.current;
    if (!el || !toolbar) return;
    let acumulado = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      acumulado += event.deltaY;
      if (Math.abs(acumulado) < 60) return;
      zoom.current.cambiarEscala(nextScale(zoom.current.escala, acumulado > 0 ? 1 : -1));
      acumulado = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toolbar, tasks.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Arrastre ─────────────────────────────────────────────────────────

  const diasArrastrados = arrastre ? Math.round(arrastre.desplazamiento / pxDia) : 0;
  /** Las fechas de una tarea con el arrastre en curso aplicado. */
  const rango = (t: { id: string; _inicio: Date; _fin: Date }) =>
    arrastre?.id === t.id && arrastre.modo !== 'avance'
      ? applyDrag(t._inicio, t._fin, arrastre.modo, diasArrastrados)
      : { start: t._inicio, end: t._fin };

  const empezarArrastre = (e: React.PointerEvent, task: GanttTask, modo: Arrastre['modo'], base = 0, anchoBarra = 1) => {
    if (e.button !== 0) return;
    const permitido = modo === 'avance' ? onProgressChange : onTaskChange;
    // En móvil se cambian las fechas desde su menú: el dedo es para desplazarse.
    if (!permitido || task.locked || (mobile && e.pointerType === 'touch')) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    huboMovimiento.current = false;
    punteroX.current = e.clientX;
    setArrastre({ id: task.id, modo, xInicial: e.clientX, desplazamiento: 0, scroll0: linea.current?.scrollLeft ?? 0, base, anchoBarra });
  };

  const moverArrastre = (e: React.PointerEvent) => {
    if (!arrastre) {
      // Señalar una fila: se ilumina también en la columna de nombres, y se encienden sus dependencias.
      const r = e.currentTarget.getBoundingClientRect();
      const fila = lista[Math.floor((e.clientY - r.top) / rowHeight)];
      if (e.pointerType === 'mouse' && (fila?.key ?? null) !== activa) setActiva(fila?.key ?? null);
      return;
    }
    punteroX.current = e.clientX;
    const desplazamiento = e.clientX - arrastre.xInicial + ((linea.current?.scrollLeft ?? 0) - arrastre.scroll0);
    if (Math.abs(desplazamiento) > 3) huboMovimiento.current = true;
    setArrastre({ ...arrastre, desplazamiento });
  };

  const soltarArrastre = (e: React.PointerEvent) => {
    if (!arrastre) return;
    const a = arrastre;
    const t = normalizadas.find((n) => n.id === a.id);
    setArrastre(null);
    punteroX.current = null;
    if (!t || e.type === 'pointercancel') return;
    if (a.modo === 'avance') {
      const avance = progressFromDrag(a.base, a.desplazamiento, a.anchoBarra);
      if (avance !== (t.progress ?? 0)) onProgressChange?.(t, avance);
      return;
    }
    const d = Math.round(a.desplazamiento / pxDia);
    if (d === 0 || !onTaskChange) return;
    const { start, end } = applyDrag(t._inicio, t._fin, a.modo, d);
    if (start.getTime() === t._inicio.getTime() && end.getTime() === t._fin.getTime()) return;
    onTaskChange(t, { start, end });
  };

  // Cerca de los bordes de la línea de tiempo, se desplaza sola: así se puede llevar una barra más allá de lo visible.
  const enArrastre = arrastre !== null;
  React.useEffect(() => {
    if (!enArrastre) return;
    let raf = 0;
    const tick = () => {
      const el = linea.current; const p = punteroX.current;
      if (el && p !== null) {
        const r = el.getBoundingClientRect(); const borde = 48;
        const v = p < r.left + borde ? -(1 - (p - r.left) / borde) : p > r.right - borde ? 1 - (r.right - p) / borde : 0;
        if (v) {
          const antes = el.scrollLeft;
          el.scrollLeft += Math.max(-1, Math.min(1, v)) * 10;
          if (el.scrollLeft !== antes) setArrastre((a) => (a ? { ...a, desplazamiento: p - a.xInicial + (el.scrollLeft - a.scroll0) } : a));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enArrastre]);

  /** Fila (índice vertical) de cada tarea, para dibujar las dependencias. */
  const indicePorId = React.useMemo(() => {
    const m = new Map<string, number>();
    lista.forEach((f, i) => {
      if (f.task) m.set(f.task.id, i);
    });
    return m;
  }, [lista]);

  const altoCuerpo = lista.length * rowHeight;
  const fecha = (d: Date) => format(dn.dayMonthShort, { day: d.getDate(), month: dn.monthsShort[d.getMonth()] });
  const plegarGrupo = (grupo: string) => setPlegados((actuales) => {
    const siguiente = new Set(actuales);
    if (siguiente.has(grupo)) siguiente.delete(grupo); else siguiente.add(grupo);
    return siguiente;
  });

  /** Con el teclado: las flechas mueven un día; Mayús, el fin; Alt, el inicio. */
  const teclaBarra = (event: React.KeyboardEvent, task: GanttTask) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTaskClick?.(task); return; }
    if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || !onTaskChange || task.locked) return;
    event.preventDefault();
    const t = normalizadas.find((n) => n.id === task.id);
    if (!t) return;
    const modo: GanttDragMode = event.shiftKey ? 'fin' : event.altKey ? 'inicio' : 'mover';
    const { start, end } = applyDrag(t._inicio, t._fin, modo, event.key === 'ArrowRight' ? 1 : -1);
    if (start.getTime() === t._inicio.getTime() && end.getTime() === t._fin.getTime()) return;
    onTaskChange(t, { start, end });
    setAnuncio(format(ganttTexts.moved, { name: t.name, start: fecha(start), end: fecha(end) }));
  };

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-8 text-center text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const arrastrada = arrastre ? normalizadas.find((n) => n.id === arrastre.id) : undefined;
  const filaArrastrada = arrastre ? indicePorId.get(arrastre.id) : undefined;
  const avanceEnCurso = arrastre?.modo === 'avance' ? progressFromDrag(arrastre.base, arrastre.desplazamiento, arrastre.anchoBarra) : null;

  const tabla = (
    <>{onTaskChange && <MobileScheduleActions items={tasks.map(task => ({ ...task, title: task.name }))} onChange={(id, start, end) => { const task = tasks.find(task => task.id === id); if (task) onTaskChange(task, { start, end }); }} />}<div data-k-mobile="Gantt"
      role="table"
      aria-label={ariaLabel}
      data-dragging={enArrastre || undefined}
      onPointerLeave={() => setActiva(null)}
      className={cn(
        'flex overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
        className,
      )}
    >
      <span className="sr-only" aria-live="polite">{anuncio}</span>
      {/* Columna de nombres: fija, no se desplaza con la línea de tiempo. */}
      <div
        className="shrink-0 border-r border-[var(--border-default,#e2e8f0)]"
        style={{ width: labelWidth }}
      >
        <div
          className="border-b border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted)]"
          style={{ height: 52 }}
        />
        {lista.map((f) => (
          <div
            key={f.key}
            role="row"
            data-active={activa === f.key || undefined}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !enArrastre) setActiva(f.key); }}
            className={cn(
              'k-gantt-row flex items-center gap-2 border-b border-[var(--border-subtle,#f1f5f9)] px-3 text-[length:calc(12px*var(--k-text-scale,1))] last:border-b-0',
              f.kind === 'grupo'
                ? 'bg-[var(--bg-muted)] font-semibold uppercase tracking-wide text-[var(--fg-subtle,#657486)] text-[length:calc(10px*var(--k-text-scale,1))]'
                : 'text-[var(--fg-body,#2d3a4a)]',
            )}
            style={{ height: rowHeight }}
          >
            {f.kind === 'grupo' && collapsibleGroups && (
              <button
                type="button"
                className="k-gantt-fold"
                aria-expanded={!plegados.has(f.name)}
                aria-label={format(plegados.has(f.name) ? ganttTexts.unfold : ganttTexts.fold, { group: f.name })}
                onClick={() => plegarGrupo(f.name)}
              >
                <UiIcon slot="chevron-down" size={13} />
              </button>
            )}
            {f.task && <span className="k-gantt-dot" aria-hidden="true" style={{ background: f.task.color ?? COLOR_ESTADO[f.task.status ?? 'pendiente'].bg }} />}
            <span className={cn('truncate', f.kind === 'tarea' && f.task?.group && 'pl-0.5')}>
              {f.name}
            </span>
          </div>
        ))}
      </div>

      {/* Línea de tiempo. */}
      <div ref={linea} className="min-w-0 flex-1 overflow-x-auto">
        <div style={{ width: anchoLinea }}>
          {/* Encabezado de dos alturas: periodo grande y subdivisión.
              Cada tramo se coloca por SU FECHA, no en flujo: un tramo puede
              empezar antes del primer día visible (la semana arranca en lunes)
              y en flujo eso desplazaba toda la regla respecto a las barras. */}
          <div
            className="sticky top-0 z-10 bg-[var(--bg-muted)]"
            style={{ height: 52, width: anchoLinea }}
          >
            <div
              className="relative border-b border-[var(--border-subtle,#f1f5f9)]"
              style={{ height: 26 }}
            >
              {mayores.map((t) => (
                <div
                  key={t.inicio.toISOString()}
                  className="absolute top-0 truncate border-r border-[var(--border-default,#e2e8f0)] px-2 text-[length:calc(11px*var(--k-text-scale,1))] font-semibold leading-[26px] text-[var(--fg-body,#2d3a4a)]"
                  style={{ left: x(t.inicio), width: t.ancho * pxDia, height: 26 }}
                >
                  {t.etiqueta}
                </div>
              ))}
            </div>
            <div
              className="relative border-b border-[var(--border-default,#e2e8f0)]"
              style={{ height: 26 }}
            >
              {menores.map((t) => (
                <div
                  key={t.inicio.toISOString()}
                  className={cn(
                    'absolute top-0 truncate border-r border-[var(--border-subtle,#f1f5f9)] text-center font-mono text-[length:calc(10px*var(--k-text-scale,1))] leading-[26px]',
                    t.finde
                      ? 'bg-[var(--bg-hover)] text-[var(--fg-subtle,#657486)]'
                      : 'text-[var(--fg-muted,#52606f)]',
                  )}
                  style={{ left: x(t.inicio), width: t.ancho * pxDia, height: 26 }}
                  title={escala === 'day' ? `${dn.weekdaysShort[t.inicio.getDay()]} ${t.etiqueta}` : undefined}
                >
                  {t.etiqueta}
                </div>
              ))}
            </div>
            {showToday && hoyVisible && <span className="k-gantt-today-pill" style={{ left: x(hoy) + pxDia / 2 }}>{ganttTexts.today}</span>}
          </div>

          {/* Cuerpo. */}
          <div
            className="relative"
            style={{ height: altoCuerpo }}
            onPointerMove={moverArrastre}
            onPointerUp={soltarArrastre}
            onPointerCancel={soltarArrastre}
          >
            {/* Rejilla vertical, por debajo de todo y alineada con la regla. */}
            <div className="pointer-events-none absolute inset-0">
              {menores.map((t) => (
                <div
                  key={t.inicio.toISOString()}
                  className={cn(
                    'absolute top-0 bottom-0 border-r border-[var(--border-subtle,#f1f5f9)]',
                    t.finde && 'bg-[var(--bg-hover)]',
                  )}
                  style={{ left: x(t.inicio), width: t.ancho * pxDia }}
                />
              ))}
            </div>

            {/* Separadores de fila. Sin ellos la columna de nombres tiene
                líneas y la línea de tiempo es una caja vacía: al desplazarse a
                la derecha no hay forma de saber a qué fila pertenece cada
                barra. Las filas de grupo van tintadas, como en la columna. */}
            <div className="pointer-events-none absolute inset-0">
              {lista.map((f, i) => (
                <div
                  key={`sep:${f.key}`}
                  data-fila={i}
                  data-active={activa === f.key || undefined}
                  className={cn(
                    'k-gantt-sep absolute left-0 right-0 border-b border-[var(--border-subtle,#f1f5f9)]',
                    f.kind === 'grupo' && 'bg-[var(--bg-muted)]',
                  )}
                  style={{ top: i * rowHeight, height: rowHeight }}
                />
              ))}
            </div>

            {/* Barra resumen de cada grupo: de dónde a dónde va y cuánto lleva. */}
            {lista.map((f, i) => {
              if (f.kind !== 'grupo') return null;
              const resumen = groupSummary(normalizadas.filter((t) => t.group === f.name).map((t) => ({ ...rango(t), progress: t.progress })));
              if (!resumen) return null;
              return (
                <div
                  key={`res:${f.key}`}
                  className="k-gantt-summary"
                  aria-hidden="true"
                  style={{ left: x(resumen.start), width: (dias(resumen.start, resumen.end) + 1) * pxDia, top: i * rowHeight + rowHeight / 2 - 3 }}
                >
                  <span style={{ width: `${resumen.progress * 100}%` }} />
                </div>
              );
            })}

            {/* Flechas de dependencia. */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={anchoLinea}
              height={altoCuerpo}
              aria-hidden="true"
            >
              {normalizadas.flatMap((t) =>
                (t.dependencies ?? []).map((depId) => {
                  const origen = normalizadas.find((n) => n.id === depId);
                  const fi = indicePorId.get(depId);
                  const fj = indicePorId.get(t.id);
                  if (!origen || fi === undefined || fj === undefined) return null;
                  const x1 = x(sumarDias(rango(origen).end, 1));
                  const y1 = fi * rowHeight + rowHeight / 2;
                  const x2 = x(rango(t).start);
                  const y2 = fj * rowHeight + rowHeight / 2;
                  const suya = activa !== null && (activa === t.id || activa === depId);
                  return (
                    <path
                      key={`${depId}->${t.id}`}
                      d={dependencyPath(x1, y1, x2, y2)}
                      className="k-gantt-link"
                      data-state={activa === null || !indicePorId.has(activa) ? undefined : suya ? 'on' : 'off'}
                      markerEnd={suya ? 'url(#k-gantt-punta-activa)' : 'url(#k-gantt-punta)'}
                    />
                  );
                }),
              )}
              <defs>
                <marker id="k-gantt-punta" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-strong)" />
                </marker>
                <marker id="k-gantt-punta-activa" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-accent, #0d9488)" />
                </marker>
              </defs>
            </svg>

            {/* Marca de hoy. */}
            {showToday && hoyVisible && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--k-danger)]"
                style={{ left: x(hoy) + pxDia / 2 }}
                aria-hidden="true"
              />
            )}

            {/* De dónde sale la barra que se arrastra. */}
            {arrastrada && filaArrastrada !== undefined && arrastre?.modo !== 'avance' && diasArrastrados !== 0 && (
              <div
                className="k-gantt-ghost"
                aria-hidden="true"
                style={{
                  left: x(arrastrada._inicio),
                  width: (dias(arrastrada._inicio, arrastrada._fin) + 1) * pxDia - 2,
                  top: filaArrastrada * rowHeight + 7,
                  height: Math.max(12, rowHeight - 14),
                }}
              />
            )}

            {/* Barras. */}
            {lista.map((f, i) => {
              if (!f.task) return null;
              const t = normalizadas.find((n) => n.id === f.task!.id)!;
              const { start, end } = rango(t);
              return (
                <Barra
                  key={f.key}
                  task={f.task}
                  orden={Math.min(i, 24)}
                  inicio={start}
                  fin={end}
                  hoy={hoy}
                  top={i * rowHeight}
                  rowHeight={rowHeight}
                  pxDia={pxDia}
                  x={x}
                  editable={Boolean(onTaskChange) && !f.task.locked}
                  arrastrable={!mobile}
                  conAvance={Boolean(onProgressChange) && !f.task.locked}
                  avance={arrastre?.id === f.task.id && avanceEnCurso !== null ? avanceEnCurso : f.task.progress}
                  arrastrando={arrastre?.id === f.task.id}
                  huboMovimiento={huboMovimiento}
                  onEmpezar={empezarArrastre}
                  onClick={onTaskClick}
                  onTecla={teclaBarra}
                  onAvanceTeclado={onProgressChange}
                />
              );
            })}

            {/* Lo que dice el arrastre, sobre la barra (o debajo si está en la primera fila). */}
            {arrastrada && filaArrastrada !== undefined && huboMovimiento.current && (() => {
              const { start, end } = rango(arrastrada);
              const izquierda = x(start); const ancho = (dias(start, end) + 1) * pxDia;
              const texto = avanceEnCurso !== null
                ? formatNumber(avanceEnCurso, DEFAULT_LOCALE, { style: 'percent' })
                : format(ganttTexts.dragRange, { start: fecha(start), end: fecha(end), days: format(ganttTexts.days, { count: dias(start, end) + 1 }) });
              return (
                <span
                  className="k-gantt-chip"
                  style={{ left: izquierda + ancho / 2, top: filaArrastrada === 0 ? rowHeight - 2 : filaArrastrada * rowHeight - 14 }}
                >
                  {texto}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
    </div></>
  );

  if (!toolbar) return tabla;
  return (
    <div className="k-gantt-root">
      <div className="k-gantt-toolbar">
        <SegmentedControl
          size="sm"
          aria-label={ganttTexts.scale}
          value={escala}
          onChange={(v) => cambiarEscala(v as GanttScale)}
          options={GANTT_SCALES.map((value) => ({ value, label: ganttTexts.scales[value] }))}
        />
        {showToday && hoyVisible && <Button size="sm" variant="secondary" onClick={() => irAHoy(true)}>{ganttTexts.goToday}</Button>}
      </div>
      {tabla}
    </div>
  );
};

interface BarraProps {
  task: GanttTask;
  orden: number;
  inicio: Date;
  fin: Date;
  hoy: Date;
  top: number;
  rowHeight: number;
  pxDia: number;
  x: (d: Date) => number;
  editable: boolean;
  arrastrable: boolean;
  conAvance: boolean;
  avance?: number;
  arrastrando: boolean;
  huboMovimiento: React.RefObject<boolean>;
  onEmpezar: (e: React.PointerEvent, task: GanttTask, modo: Arrastre['modo'], base?: number, anchoBarra?: number) => void;
  onClick?: (task: GanttTask) => void;
  onTecla: (e: React.KeyboardEvent, task: GanttTask) => void;
  onAvanceTeclado?: (task: GanttTask, progress: number) => void;
}

const Barra: React.FC<BarraProps> = ({
  task,
  orden,
  inicio,
  fin,
  hoy,
  top,
  rowHeight,
  pxDia,
  x,
  editable,
  arrastrable,
  conAvance,
  avance,
  arrastrando,
  huboMovimiento,
  onEmpezar,
  onClick,
  onTecla,
  onAvanceTeclado,
}) => {
  const { messages: { gantt: texts }, format } = useI18n();
  const tono = COLOR_ESTADO[task.status ?? 'pendiente'];
  const color = task.color ?? tono.bg;
  const textoColor = task.textColor ?? (task.color ? '#ffffff' : tono.fg);
  const duracion = dias(inicio, fin) + 1;
  const hito = duracion <= 1 && dias(aFecha(task.start), aFecha(task.end)) === 0;
  const izquierda = x(inicio);
  const ancho = Math.max(pxDia * 0.6, duracion * pxDia - 2);
  const alto = Math.max(12, rowHeight - 14);
  const etiqueta = format(texts.task, { name: task.name, start: inicio.toLocaleDateString(DEFAULT_LOCALE), end: fin.toLocaleDateString(DEFAULT_LOCALE) });
  const hecho = task.status === 'hecha' || (task.progress ?? 0) >= 1;
  const tarde = !hito && !hecho && fin < hoy;
  const clic = () => {
    if (huboMovimiento.current) { huboMovimiento.current = false; return; }
    onClick?.(task);
  };

  if (hito) {
    const lado = Math.min(alto, 14);
    return (
      <>
        <div
          role="img"
          aria-label={format(texts.milestone, { task: etiqueta })}
          title={etiqueta}
          onClick={clic}
          onPointerDown={(e) => onEmpezar(e, task, 'mover')}
          className={cn('k-gantt-milestone absolute', editable && 'cursor-grab', arrastrando && 'cursor-grabbing')}
          style={{
            left: izquierda + pxDia / 2 - lado / 2,
            top: top + (rowHeight - lado) / 2,
            width: lado,
            height: lado,
            background: color,
            transform: 'rotate(45deg)',
            borderRadius: 'var(--k-radius-xs, 2px)',
            '--i': orden,
          } as React.CSSProperties}
        />
        <span className="k-gantt-outside" aria-hidden="true" style={{ left: izquierda + pxDia / 2 + lado, top, height: rowHeight }}>
          <span className="k-gantt-outside-name">{task.name}</span>{task.meta}
        </span>
      </>
    );
  }

  const nombreDentro = ancho > 44;
  const progreso = avance === undefined ? undefined : Math.max(0, Math.min(1, avance));
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={tarde ? `${etiqueta}, ${texts.late}` : etiqueta}
        title={etiqueta}
        data-dragging={arrastrando || undefined}
        data-late={tarde || undefined}
        onClick={clic}
        onKeyDown={(e) => { if (e.target === e.currentTarget) onTecla(e, task); }}
        onPointerDown={(e) => onEmpezar(e, task, 'mover')}
        className={cn(
          'k-gantt-bar group absolute flex items-center rounded-[var(--k-radius-xs,2px)] shadow-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          editable ? 'cursor-grab' : 'cursor-default',
          arrastrando && 'cursor-grabbing ring-1 ring-accent',
        )}
        style={{
          left: izquierda,
          top: top + (rowHeight - alto) / 2,
          width: ancho,
          height: alto,
          background: color,
          color: textoColor,
          touchAction: editable && arrastrable ? 'pan-y' : undefined,
          '--i': orden,
        } as React.CSSProperties}
      >
        <span className="k-gantt-bar-inner" aria-hidden="true">
          {/* Avance: una franja al pie, no un velo sobre toda la barra — un velo
              oscurece justo donde va el texto y se lo carga. */}
          {progreso !== undefined && <span className="k-gantt-progress" style={{ width: `${progreso * 100}%` }} />}
          {editable && (
            <>
              <span data-side="start" className="k-gantt-handle" onPointerDown={(e) => onEmpezar(e, task, 'inicio')} />
              <span data-side="end" className="k-gantt-handle" onPointerDown={(e) => onEmpezar(e, task, 'fin')} />
            </>
          )}
        </span>

        <span
          className="relative truncate px-2 text-[length:calc(10px*var(--k-text-scale,1))] font-medium"
          style={{ color: textoColor }}
        >
          {nombreDentro ? task.name : ''}
        </span>
      </div>

      {conAvance && progreso !== undefined && ancho >= 40 && (
        <span
          role="slider"
          tabIndex={0}
          aria-label={format(texts.progress, { name: task.name })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progreso * 100)}
          className="k-gantt-progress-thumb"
          style={{ left: izquierda + ancho * progreso, top: top + (rowHeight - alto) / 2 + alto - 6 }}
          onPointerDown={(e) => onEmpezar(e, task, 'avance', progreso, ancho)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            onAvanceTeclado?.(task, progressFromDrag(progreso, (e.key === 'ArrowRight' ? 0.05 : -0.05) * ancho, ancho));
          }}
        />
      )}

      {(!nombreDentro || task.meta) && (
        <span className="k-gantt-outside" aria-hidden="true" style={{ left: izquierda + ancho + 6, top, height: rowHeight }}>
          {!nombreDentro && <span className="k-gantt-outside-name">{task.name}</span>}
          {task.meta}
        </span>
      )}
    </>
  );
};
