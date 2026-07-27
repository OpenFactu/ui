import * as React from 'react';
import { cn } from '../utils';
import {
  DIAS_SEMANA,
  MESES,
  aFecha,
  dias,
  esFinde,
  sumarDias,
} from '../internal/fechas';

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
  /** Texto a la derecha de la barra (responsable, horas…). */
  meta?: React.ReactNode;
}

export interface GanttChange {
  start: Date;
  end: Date;
}

export interface GanttProps {
  tasks: GanttTask[];
  scale?: GanttScale;
  /** Primer y último día visibles. Por defecto, los de las tareas con margen. */
  rangeStart?: Date | string;
  rangeEnd?: Date | string;
  /** Arrastrar para mover o cambiar duración. Sin esto, es solo lectura. */
  onTaskChange?: (task: GanttTask, change: GanttChange) => void;
  onTaskClick?: (task: GanttTask) => void;
  /** Ancho en píxeles de la columna de nombres. Default 220. */
  labelWidth?: number;
  /** Alto de cada fila. Default 34. */
  rowHeight?: number;
  /** Marca vertical del día de hoy. Default true. */
  showToday?: boolean;
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
function tramosMenores(desde: Date, hasta: Date, scale: GanttScale): Tramo[] {
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
      salida.push({ inicio: new Date(d), ancho: 7, etiqueta: `${d.getDate()} ${MESES[d.getMonth()]}` });
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
          ? MESES[d.getMonth()]
          : `T${Math.floor(d.getMonth() / 3) + 1}`,
    });
  }
  return cubrir(salida, hasta);
}

/** Divisiones mayores: mes sobre los días, año sobre los meses. */
function tramosMayores(desde: Date, hasta: Date, scale: GanttScale): Tramo[] {
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
        : `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
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

/** Aplana el catálogo en filas, insertando un encabezado por grupo. */
function filas(tasks: GanttTask[]): Fila[] {
  const salida: Fila[] = [];
  const vistos = new Set<string>();
  for (const t of tasks) {
    if (t.group && !vistos.has(t.group)) {
      vistos.add(t.group);
      salida.push({ kind: 'grupo', key: `g:${t.group}`, name: t.group });
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
  modo: 'mover' | 'inicio' | 'fin';
  xInicial: number;
  desplazamiento: number;
};

/**
 * Diagrama de Gantt.
 *
 * Las tareas llegan con fecha de inicio y de fin; el componente calcula la
 * escala, pinta la rejilla y coloca las barras. Arrastrando una barra se mueve
 * y arrastrando sus bordes cambia de duración: mientras dura el gesto solo se
 * mueve la vista, y al soltar se avisa una vez con las fechas nuevas — así
 * quien lo usa decide si guarda, y no hay veinte peticiones por arrastre.
 *
 * ```tsx
 * <Gantt
 *   scale="week"
 *   tasks={tareas}
 *   onTaskChange={(t, { start, end }) => guardar(t.id, start, end)}
 * />
 * ```
 */
export const Gantt: React.FC<GanttProps> = ({
  tasks,
  scale = 'week',
  rangeStart,
  rangeEnd,
  onTaskChange,
  onTaskClick,
  labelWidth = 220,
  rowHeight = 34,
  showToday = true,
  today,
  emptyMessage = 'No hay tareas que mostrar.',
  className,
  'aria-label': ariaLabel = 'Diagrama de Gantt',
}) => {
  const pxDia = PX_POR_DIA[scale];
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
    const aire = scale === 'day' ? 2 : scale === 'week' ? 7 : 31;
    return [
      aFecha(rangeStart ?? sumarDias(min, -aire)),
      aFecha(rangeEnd ?? sumarDias(max, aire)),
    ];
  }, [normalizadas, rangeStart, rangeEnd, scale, hoy]);

  const totalDias = Math.max(1, dias(desde, hasta) + 1);
  const anchoLinea = totalDias * pxDia;
  const menores = React.useMemo(() => tramosMenores(desde, hasta, scale), [desde, hasta, scale]);
  const mayores = React.useMemo(() => tramosMayores(desde, hasta, scale), [desde, hasta, scale]);
  const lista = React.useMemo(() => filas(normalizadas), [normalizadas]);

  const x = (d: Date) => dias(desde, d) * pxDia;

  /** Desplazamiento en días que aplica el arrastre en curso a una tarea. */
  const delta = (id: string, borde: 'inicio' | 'fin') => {
    if (!arrastre || arrastre.id !== id) return 0;
    const d = Math.round(arrastre.desplazamiento / pxDia);
    if (arrastre.modo === 'mover') return d;
    return arrastre.modo === borde ? d : 0;
  };

  const empezarArrastre = (
    e: React.PointerEvent,
    task: GanttTask,
    modo: Arrastre['modo'],
  ) => {
    if (!onTaskChange || task.locked) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setArrastre({ id: task.id, modo, xInicial: e.clientX, desplazamiento: 0 });
  };

  const moverArrastre = (e: React.PointerEvent) => {
    if (!arrastre) return;
    setArrastre({ ...arrastre, desplazamiento: e.clientX - arrastre.xInicial });
  };

  const soltarArrastre = () => {
    if (!arrastre) return;
    const t = normalizadas.find((n) => n.id === arrastre.id);
    const d = Math.round(arrastre.desplazamiento / pxDia);
    setArrastre(null);
    if (!t || d === 0 || !onTaskChange) return;
    const inicio = arrastre.modo === 'fin' ? t._inicio : sumarDias(t._inicio, d);
    const fin = arrastre.modo === 'inicio' ? t._fin : sumarDias(t._fin, d);
    // Un arrastre no puede dejar el fin antes del inicio.
    if (fin < inicio) return;
    onTaskChange(t, { start: inicio, end: fin });
  };

  /** Fila (índice vertical) de cada tarea, para dibujar las dependencias. */
  const indicePorId = React.useMemo(() => {
    const m = new Map<string, number>();
    lista.forEach((f, i) => {
      if (f.task) m.set(f.task.id, i);
    });
    return m;
  }, [lista]);

  const altoCuerpo = lista.length * rowHeight;

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-8 text-center text-[13px] text-[var(--fg-muted,#52606f)]',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      role="table"
      aria-label={ariaLabel}
      className={cn(
        'flex overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
        className,
      )}
    >
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
            className={cn(
              'flex items-center gap-2 border-b border-[var(--border-subtle,#f1f5f9)] px-3 text-[12px] last:border-b-0',
              f.kind === 'grupo'
                ? 'bg-[var(--bg-muted)] font-semibold uppercase tracking-wide text-[var(--fg-subtle,#657486)] text-[10px]'
                : 'text-[var(--fg-body,#2d3a4a)]',
            )}
            style={{ height: rowHeight }}
          >
            <span className={cn('truncate', f.kind === 'tarea' && f.task?.group && 'pl-2')}>
              {f.name}
            </span>
          </div>
        ))}
      </div>

      {/* Línea de tiempo. */}
      <div className="min-w-0 flex-1 overflow-x-auto">
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
                  className="absolute top-0 truncate border-r border-[var(--border-default,#e2e8f0)] px-2 text-[11px] font-semibold leading-[26px] text-[var(--fg-body,#2d3a4a)]"
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
                    'absolute top-0 truncate border-r border-[var(--border-subtle,#f1f5f9)] text-center font-mono text-[10px] leading-[26px]',
                    t.finde
                      ? 'bg-[var(--bg-hover)] text-[var(--fg-subtle,#657486)]'
                      : 'text-[var(--fg-muted,#52606f)]',
                  )}
                  style={{ left: x(t.inicio), width: t.ancho * pxDia, height: 26 }}
                  title={scale === 'day' ? `${DIAS_SEMANA[t.inicio.getDay()]} ${t.etiqueta}` : undefined}
                >
                  {t.etiqueta}
                </div>
              ))}
            </div>
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
                  className={cn(
                    'absolute left-0 right-0 border-b border-[var(--border-subtle,#f1f5f9)]',
                    f.kind === 'grupo' && 'bg-[var(--bg-muted)]',
                  )}
                  style={{ top: i * rowHeight, height: rowHeight }}
                />
              ))}
            </div>

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
                  const x1 = x(sumarDias(origen._fin, 1 + delta(origen.id, 'fin')));
                  const y1 = fi * rowHeight + rowHeight / 2;
                  const x2 = x(sumarDias(t._inicio, delta(t.id, 'inicio')));
                  const y2 = fj * rowHeight + rowHeight / 2;
                  const medio = x2 - 8;
                  return (
                    <path
                      key={`${depId}->${t.id}`}
                      d={`M ${x1} ${y1} H ${Math.max(medio, x1 + 8)} V ${y2} H ${x2}`}
                      fill="none"
                      stroke="var(--border-strong)"
                      strokeWidth={1.5}
                      markerEnd="url(#k-gantt-punta)"
                    />
                  );
                }),
              )}
              <defs>
                <marker
                  id="k-gantt-punta"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-strong)" />
                </marker>
              </defs>
            </svg>

            {/* Marca de hoy. */}
            {showToday && hoy >= desde && hoy <= hasta && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--k-danger)]"
                style={{ left: x(hoy) + pxDia / 2 }}
                aria-hidden="true"
              />
            )}

            {/* Barras. */}
            {lista.map((f, i) =>
              f.task ? (
                <Barra
                  key={f.key}
                  task={f.task}
                  inicio={sumarDias(aFecha(f.task.start), delta(f.task.id, 'inicio'))}
                  fin={sumarDias(aFecha(f.task.end), delta(f.task.id, 'fin'))}
                  top={i * rowHeight}
                  rowHeight={rowHeight}
                  pxDia={pxDia}
                  x={x}
                  editable={Boolean(onTaskChange) && !f.task.locked}
                  arrastrando={arrastre?.id === f.task.id}
                  onEmpezar={empezarArrastre}
                  onClick={onTaskClick}
                />
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BarraProps {
  task: GanttTask;
  inicio: Date;
  fin: Date;
  top: number;
  rowHeight: number;
  pxDia: number;
  x: (d: Date) => number;
  editable: boolean;
  arrastrando: boolean;
  onEmpezar: (e: React.PointerEvent, task: GanttTask, modo: Arrastre['modo']) => void;
  onClick?: (task: GanttTask) => void;
}

const Barra: React.FC<BarraProps> = ({
  task,
  inicio,
  fin,
  top,
  rowHeight,
  pxDia,
  x,
  editable,
  arrastrando,
  onEmpezar,
  onClick,
}) => {
  const tono = COLOR_ESTADO[task.status ?? 'pendiente'];
  const color = task.color ?? tono.bg;
  const textoColor = task.textColor ?? (task.color ? '#ffffff' : tono.fg);
  const duracion = dias(inicio, fin) + 1;
  const hito = duracion <= 1 && dias(aFecha(task.start), aFecha(task.end)) === 0;
  const izquierda = x(inicio);
  const ancho = Math.max(pxDia * 0.6, duracion * pxDia - 2);
  const alto = Math.max(12, rowHeight - 14);
  const etiqueta = `${task.name}, del ${inicio.toLocaleDateString('es-ES')} al ${fin.toLocaleDateString('es-ES')}`;

  if (hito) {
    const lado = Math.min(alto, 14);
    return (
      <div
        role="img"
        aria-label={`${etiqueta} (hito)`}
        title={etiqueta}
        onClick={() => onClick?.(task)}
        onPointerDown={(e) => onEmpezar(e, task, 'mover')}
        className={cn('absolute', editable && 'cursor-grab', arrastrando && 'cursor-grabbing')}
        style={{
          left: izquierda + pxDia / 2 - lado / 2,
          top: top + (rowHeight - lado) / 2,
          width: lado,
          height: lado,
          background: color,
          transform: 'rotate(45deg)',
          borderRadius: 2,
        }}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={() => onClick?.(task)}
      onPointerDown={(e) => onEmpezar(e, task, 'mover')}
      className={cn(
        'group absolute flex items-center overflow-hidden rounded-[var(--k-radius-xs,2px)] shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        editable ? 'cursor-grab' : 'cursor-default',
        arrastrando && 'cursor-grabbing opacity-80 ring-1 ring-accent',
      )}
      style={{
        left: izquierda,
        top: top + (rowHeight - alto) / 2,
        width: ancho,
        height: alto,
        background: color,
      }}
    >
      {/* Avance: una franja al pie, no un velo sobre toda la barra — un velo
          oscurece justo donde va el texto y se lo carga. */}
      {task.progress !== undefined && (
        <span
          className="absolute bottom-0 left-0 h-[3px] bg-black/35"
          style={{ width: `${Math.max(0, Math.min(1, task.progress)) * 100}%` }}
          aria-hidden="true"
        />
      )}

      <span
        className="relative truncate px-1.5 text-[10px] font-medium"
        style={{ color: textoColor }}
      >
        {ancho > 44 ? task.name : ''}
      </span>

      {editable && (
        <>
          <span
            onPointerDown={(e) => onEmpezar(e, task, 'inicio')}
            className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: 'rgba(255,255,255,0.6)' }}
            aria-hidden="true"
          />
          <span
            onPointerDown={(e) => onEmpezar(e, task, 'fin')}
            className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: 'rgba(255,255,255,0.6)' }}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
};
