import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';
import {
  DIAS_SEMANA,
  MESES_LARGOS,
  aFecha,
  aInstante,
  conHoraDe,
  esFinde,
  hhmm,
  horaDecimal,
  inicioDeMes,
  inicioDeSemana,
  mismoDia,
  sumarDias,
  sumarMinutos,
} from '../internal/fechas';

export type CalendarView = 'week' | 'month';

/** Estado del evento. Decide el color del bloque si no se indica otro. */
export type CalendarStatus = 'pendiente' | 'en-curso' | 'hecha' | 'bloqueada';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  /** Va a la banda superior, sin hora. */
  allDay?: boolean;
  status?: CalendarStatus;
  /** Color propio; manda sobre el del estado. */
  color?: string;
  /** Texto sobre `color`. Solo hace falta con un color propio. */
  textColor?: string;
  /** Ni se mueve ni se redimensiona. */
  locked?: boolean;
  /** Segunda línea dentro del bloque. */
  meta?: React.ReactNode;
}

export interface CalendarChange {
  start: Date;
  end: Date;
}

export interface CalendarProps {
  events: CalendarEvent[];
  view?: CalendarView;
  onViewChange?: (v: CalendarView) => void;
  /** Día de referencia: define la semana o el mes que se ve. */
  date?: Date | string;
  onDateChange?: (d: Date) => void;
  /** Barra con «‹ Hoy ›» y el selector de vista. Default true. */
  toolbar?: boolean;
  /** Primera y última hora de la rejilla. Default 6 y 22. */
  hourStart?: number;
  hourEnd?: number;
  /** Alto en píxeles de cada hora. Default 36. */
  hourHeight?: number;
  /** Qué día se considera hoy. Fijable para que las pruebas no dependan del reloj. */
  today?: Date | string;
  /** Arrastrar para mover o cambiar duración. Sin esto es solo lectura. */
  onEventChange?: (e: CalendarEvent, c: CalendarChange) => void;
  onEventClick?: (e: CalendarEvent) => void;
  /** Pulsar un hueco vacío: crear rápido. */
  onSlotClick?: (start: Date) => void;
  /** Tarjetas sin fecha; arrastrarlas al calendario las programa. */
  unscheduled?: CalendarEvent[];
  onSchedule?: (e: CalendarEvent, start: Date) => void;
  unscheduledLabel?: React.ReactNode;
  /** Cuántos eventos caben en una casilla del mes antes del «+N más». */
  maxPorDia?: number;
  emptyMessage?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

/**
 * Color del bloque y el texto que se lee encima. El segundo no es siempre
 * blanco: sobre el verde de «hecha» el blanco no llega al mínimo legible, y
 * para eso están los tokens `--k-*-on`.
 */
const COLOR_ESTADO: Record<CalendarStatus, { bg: string; fg: string }> = {
  // `--k-ink-500` y no `--fg-subtle`: el segundo se invierte con el modo, y en
  // oscuro se volvía un gris claro que dejaba el texto blanco en 2.89:1. La
  // escala de tinta es fija, así que aguanta en los dos modos (4.57:1).
  pendiente: { bg: 'var(--k-ink-500, #64748b)', fg: '#ffffff' },
  'en-curso': { bg: 'rgb(var(--color-accent-rgb))', fg: 'var(--k-accent-on)' },
  hecha: { bg: 'var(--k-success)', fg: 'var(--k-success-on)' },
  bloqueada: { bg: 'var(--k-danger)', fg: 'var(--k-danger-on)' },
};

const colorDe = (e: CalendarEvent) => {
  const tono = COLOR_ESTADO[e.status ?? 'pendiente'];
  return {
    bg: e.color ?? tono.bg,
    fg: e.textColor ?? (e.color ? '#ffffff' : tono.fg),
  };
};

/** Minutos a los que se ajusta un arrastre. Media hora es lo que se agenda. */
const PASO_MIN = 30;

interface Normalizado extends CalendarEvent {
  _inicio: Date;
  _fin: Date;
}

const normalizar = (e: CalendarEvent): Normalizado => ({
  ...e,
  _inicio: aInstante(e.start),
  _fin: aInstante(e.end),
});

type Arrastre = {
  id: string;
  modo: 'mover' | 'fin';
  /** Coordenadas del puntero al empezar. */
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  /** Viene del panel de «sin programar». */
  desdeCola?: boolean;
};

/**
 * Calendario de semana y de mes.
 *
 * La vista de semana coloca los eventos por su hora sobre una rejilla horaria;
 * la de mes los apila dentro de la casilla del día. Arrastrando un bloque se
 * mueve de día y de hora, y por su borde inferior cambia de duración: durante
 * el gesto solo se mueve la vista, y al soltar se avisa **una vez** con las
 * fechas nuevas — así quien lo usa decide si guarda, y no hay una petición por
 * píxel arrastrado.
 *
 * ```tsx
 * <Calendar
 *   events={tareas}
 *   unscheduled={sinFecha}
 *   onEventChange={(e, { start, end }) => guardar(e.id, start, end)}
 *   onSchedule={(e, start) => programar(e.id, start)}
 * />
 * ```
 */
export const Calendar: React.FC<CalendarProps> = ({
  events,
  view: viewProp,
  onViewChange,
  date: dateProp,
  onDateChange,
  toolbar = true,
  hourStart = 6,
  hourEnd = 22,
  hourHeight = 36,
  today: todayProp,
  onEventChange,
  onEventClick,
  onSlotClick,
  unscheduled,
  onSchedule,
  unscheduledLabel = 'Sin programar',
  maxPorDia = 3,
  emptyMessage = 'No hay nada en estas fechas.',
  className,
  'aria-label': ariaLabel = 'Calendario',
}) => {
  const hoy = React.useMemo(() => aFecha(todayProp ?? new Date()), [todayProp]);

  // Vista y fecha admiten ser controladas o no: la mayoría de pantallas solo
  // quieren un calendario que funcione sin cablear dos estados.
  const [viewInterna, setViewInterna] = React.useState<CalendarView>(viewProp ?? 'week');
  const view = viewProp !== undefined && onViewChange !== undefined ? viewProp : viewInterna;
  const viewControlada = viewProp !== undefined && onViewChange !== undefined;
  const cambiarView = (v: CalendarView) => {
    if (!viewControlada) setViewInterna(v);
    onViewChange?.(v);
  };

  // `date` manda solo si además se recoge `onDateChange`. Con `date` a secas la
  // barra quedaría muerta —las flechas no harían nada y no habría forma de
  // saber por qué—, así que en ese caso se toma como valor inicial.
  const controlada = dateProp !== undefined && onDateChange !== undefined;
  const [fechaInterna, setFechaInterna] = React.useState<Date>(() => aFecha(dateProp ?? hoy));
  const fecha = controlada ? aFecha(dateProp!) : fechaInterna;
  const irA = (d: Date) => {
    if (!controlada) setFechaInterna(d);
    onDateChange?.(d);
  };

  const [arrastre, setArrastre] = React.useState<Arrastre | null>(null);
  const rejillaRef = React.useRef<HTMLDivElement>(null);

  const normalizados = React.useMemo(() => events.map(normalizar), [events]);
  const horas = React.useMemo(
    () => Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i),
    [hourStart, hourEnd],
  );

  const diasSemana = React.useMemo(() => {
    const lunes = inicioDeSemana(fecha);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }, [fecha]);

  const diasMes = React.useMemo(() => {
    const primero = inicioDeMes(fecha);
    const arranque = inicioDeSemana(primero);
    return Array.from({ length: 42 }, (_, i) => sumarDias(arranque, i));
  }, [fecha]);

  // ── Arrastre ──────────────────────────────────────────────────────────
  // Se traduce el desplazamiento del puntero a días y minutos con las mismas
  // medidas con las que se pinta, de modo que lo que se ve mientras se arrastra
  // es exactamente lo que se guardará.

  const anchoDia = () => {
    const el = rejillaRef.current;
    if (!el) return 1;
    return el.getBoundingClientRect().width / 7;
  };

  const desplazamiento = (a: Arrastre) => {
    const dDias = Math.round(a.dx / anchoDia());
    const brutoMin = (a.dy / hourHeight) * 60;
    const dMin = Math.round(brutoMin / PASO_MIN) * PASO_MIN;
    return { dDias, dMin };
  };

  /** Desfase que aplica el arrastre en curso a un evento concreto. */
  const desfase = (id: string, borde: 'inicio' | 'fin') => {
    if (!arrastre || arrastre.id !== id) return { dDias: 0, dMin: 0 };
    const d = desplazamiento(arrastre);
    if (arrastre.modo === 'mover') return d;
    // Redimensionando solo se mueve el final, y nunca de día.
    return borde === 'fin' ? { dDias: 0, dMin: d.dMin } : { dDias: 0, dMin: 0 };
  };

  const aplicar = (base: Date, borde: 'inicio' | 'fin', id: string) => {
    const { dDias, dMin } = desfase(id, borde);
    return sumarMinutos(sumarDias(base, dDias), dMin);
  };

  const empezar = (
    e: React.PointerEvent,
    id: string,
    modo: Arrastre['modo'],
    desdeCola = false,
  ) => {
    if (!onEventChange && !desdeCola) return;
    if (desdeCola && !onSchedule) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setArrastre({ id, modo, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, desdeCola });
  };

  const mover = (e: React.PointerEvent) => {
    if (!arrastre) return;
    setArrastre({ ...arrastre, dx: e.clientX - arrastre.x0, dy: e.clientY - arrastre.y0 });
  };

  const soltar = (e: React.PointerEvent) => {
    if (!arrastre) return;
    const actual = arrastre;
    setArrastre(null);

    if (actual.desdeCola) {
      const evento = unscheduled?.find((u) => u.id === actual.id);
      const destino = huecoEn(e.clientX, e.clientY);
      if (evento && destino) onSchedule?.(evento, destino);
      return;
    }

    const ev = normalizados.find((n) => n.id === actual.id);
    if (!ev || !onEventChange) return;
    const { dDias, dMin } = desplazamiento(actual);
    if (dDias === 0 && dMin === 0) return;
    const inicio = actual.modo === 'fin' ? ev._inicio : sumarMinutos(sumarDias(ev._inicio, dDias), dMin);
    const fin = sumarMinutos(sumarDias(ev._fin, actual.modo === 'fin' ? 0 : dDias), dMin);
    // Un arrastre no puede dejar el final antes del principio.
    if (fin <= inicio) return;
    onEventChange(ev, { start: inicio, end: fin });
  };

  /** Qué instante hay bajo unas coordenadas de pantalla. */
  const huecoEn = (clientX: number, clientY: number): Date | null => {
    const el = rejillaRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const col = Math.floor(((clientX - r.left) / r.width) * (view === 'week' ? 7 : 7));
    if (view === 'month') {
      const fila = Math.floor(((clientY - r.top) / r.height) * 6);
      return diasMes[Math.min(41, Math.max(0, fila * 7 + col))];
    }
    const minutos = ((clientY - r.top) / hourHeight) * 60;
    const ajustados = Math.round(minutos / PASO_MIN) * PASO_MIN;
    const dia = diasSemana[Math.min(6, Math.max(0, col))];
    const salida = new Date(dia.getTime());
    salida.setHours(hourStart, 0, 0, 0);
    return sumarMinutos(salida, ajustados);
  };

  // ── Navegación ────────────────────────────────────────────────────────

  const paso = (signo: 1 | -1) => {
    if (view === 'week') {
      irA(sumarDias(fecha, 7 * signo));
      return;
    }
    const d = aFecha(fecha);
    d.setMonth(d.getMonth() + signo);
    irA(d);
  };

  const titulo =
    view === 'week'
      ? `Semana del ${diasSemana[0].getDate()} de ${MESES_LARGOS[diasSemana[0].getMonth()]} al ${diasSemana[6].getDate()} de ${MESES_LARGOS[diasSemana[6].getMonth()]}`
      : `${MESES_LARGOS[fecha.getMonth()]} de ${fecha.getFullYear()}`;

  /**
   * Un evento de todo el día ocupa TODOS los días de su rango, no solo el de
   * inicio: una tarea que va del lunes al miércoles tiene que verse los tres
   * días, que es justo para lo que se mira un calendario de planificación. La
   * comparación es por día natural, no por instante, para que un rango que
   * termina a las 00:00 no pierda su último día.
   */
  const abarcaDia = (e: (typeof normalizados)[number], d: Date) => {
    if (mismoDia(e._inicio, d)) return true;
    const soloDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dia = soloDia(d);
    return dia >= soloDia(e._inicio) && dia <= soloDia(e._fin);
  };

  // Los eventos CON hora se quedan en su día de inicio: su posición vertical
  // sale de la hora, así que repetirlos en los días siguientes los pintaría en
  // una franja horaria que no significa nada.
  const todoElDia = (d: Date) => normalizados.filter((e) => e.allDay && abarcaDia(e, d));
  const conHora = (d: Date) => normalizados.filter((e) => !e.allDay && mismoDia(e._inicio, d));
  const deDia = (d: Date) => [...todoElDia(d), ...conHora(d)];

  const altoRejilla = horas.length * hourHeight;

  return (
    <div
      aria-label={ariaLabel}
      // Los manejadores van en la raíz y no en la rejilla: al arrastrar una
      // tarjeta de «sin programar», la captura de puntero reencamina los
      // eventos a la propia tarjeta, que cuelga del panel de abajo. Colgados de
      // la rejilla no llegaban nunca y el gesto no hacía nada.
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      className={cn(
        'overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
        className,
      )}
    >
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default,#e2e8f0)] px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={view === 'week' ? 'Semana anterior' : 'Mes anterior'}
              onClick={() => paso(-1)}
              className="rounded-[var(--k-radius-xs,2px)] p-1.5 text-[var(--fg-muted,#52606f)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default,#0a1628)]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => irA(hoy)}
              className="rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-2.5 py-1 text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              Hoy
            </button>
            <button
              type="button"
              aria-label={view === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
              onClick={() => paso(1)}
              className="rounded-[var(--k-radius-xs,2px)] p-1.5 text-[var(--fg-muted,#52606f)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default,#0a1628)]"
            >
              <ChevronRight size={16} />
            </button>
            <span className="ml-2 text-[13px] font-semibold text-[var(--fg-default,#0a1628)]">
              {titulo}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Vista"
            className="flex overflow-hidden rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)]"
          >
            {(['week', 'month'] as const).map((v, i) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => cambiarView(v)}
                className={cn(
                  'px-3 py-1 text-[12px] font-medium transition-colors',
                  i > 0 && 'border-l border-[var(--border-default,#e2e8f0)]',
                  view === v
                    ? 'bg-accent text-[color:var(--color-accent-fg)]'
                    : 'text-[var(--fg-muted,#52606f)] hover:bg-[var(--bg-hover)]',
                )}
              >
                {v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'week' ? (
        <div>
          {/* Cabecera de días + banda de todo el día. */}
          <div className="flex border-b border-[var(--border-default,#e2e8f0)]">
            <div className="w-14 shrink-0 border-r border-[var(--border-default,#e2e8f0)]" />
            <div className="grid flex-1 grid-cols-7">
              {diasSemana.map((d) => {
                const esHoy = mismoDia(d, hoy);
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'border-r border-[var(--border-subtle,#f1f5f9)] px-1 py-1.5 text-center last:border-r-0',
                      esFinde(d) && 'bg-[var(--bg-muted)]',
                    )}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle,#657486)]">
                      {DIAS_SEMANA[d.getDay()]}
                    </div>
                    <div
                      className={cn(
                        'text-[15px] font-bold',
                        esHoy ? 'text-accent' : 'text-[var(--fg-default,#0a1628)]',
                      )}
                    >
                      {d.getDate()}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {todoElDia(d).map((e) => {
                        const c = colorDe(e);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => onEventClick?.(e)}
                            style={{ background: c.bg, color: c.fg }}
                            className="truncate rounded-[var(--k-radius-xs,2px)] px-1 py-px text-[10px] font-medium"
                          >
                            {e.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rejilla horaria. */}
          <div className="flex">
            <div className="w-14 shrink-0 border-r border-[var(--border-default,#e2e8f0)]">
              {horas.map((h) => (
                <div
                  key={h}
                  style={{ height: hourHeight }}
                  className="border-b border-[var(--border-subtle,#f1f5f9)] pr-1.5 text-right font-mono text-[10px] leading-[1] text-[var(--fg-subtle,#657486)]"
                >
                  <span className="relative -top-1">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            <div
              ref={rejillaRef}
              className="relative grid flex-1 grid-cols-7"
              style={{ height: altoRejilla }}
            >
              {diasSemana.map((d) => (
                <div
                  key={d.toISOString()}
                  className={cn(
                    'relative border-r border-[var(--border-subtle,#f1f5f9)] last:border-r-0',
                    esFinde(d) && 'bg-[var(--bg-muted)]',
                  )}
                >
                  {horas.map((h) => (
                    <div
                      key={h}
                      onClick={() => {
                        if (!onSlotClick) return;
                        const inicio = new Date(d.getTime());
                        inicio.setHours(h, 0, 0, 0);
                        onSlotClick(inicio);
                      }}
                      style={{ height: hourHeight }}
                      className={cn(
                        'border-b border-[var(--border-subtle,#f1f5f9)]',
                        onSlotClick && 'cursor-pointer hover:bg-[var(--bg-hover)]',
                      )}
                    />
                  ))}

                  {/* Bloques del día, colocados por hora. */}
                  {conHora(d).map((e) => {
                    const inicio = aplicar(e._inicio, 'inicio', e.id);
                    const fin = aplicar(e._fin, 'fin', e.id);
                    const desde = Math.max(hourStart, horaDecimal(inicio));
                    const hasta = Math.min(hourEnd, horaDecimal(fin));
                    if (hasta <= hourStart || desde >= hourEnd) return null;
                    const c = colorDe(e);
                    const editable = Boolean(onEventChange) && !e.locked;
                    const alto = Math.max(16, (hasta - desde) * hourHeight - 2);
                    return (
                      <div
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${e.title}, ${hhmm(inicio)} a ${hhmm(fin)}`}
                        title={`${hhmm(inicio)}–${hhmm(fin)} · ${e.title}`}
                        data-evento={e.id}
                        onClick={() => onEventClick?.(e)}
                        onPointerDown={(evt) => empezar(evt, e.id, 'mover')}
                        style={{
                          top: (desde - hourStart) * hourHeight + 1,
                          height: alto,
                          background: c.bg,
                          color: c.fg,
                        }}
                        className={cn(
                          'group absolute inset-x-0.5 overflow-hidden rounded-[var(--k-radius-xs,2px)] px-1 py-0.5 text-left shadow-sm',
                          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                          editable ? 'cursor-grab' : 'cursor-default',
                          arrastre?.id === e.id && 'z-10 cursor-grabbing opacity-80 ring-1 ring-accent',
                        )}
                      >
                        <div className="truncate font-mono text-[9px] opacity-80">
                          {hhmm(inicio)}–{hhmm(fin)}
                        </div>
                        <div className="truncate text-[11px] font-medium leading-tight">
                          {e.title}
                        </div>
                        {e.meta && <div className="truncate text-[10px] opacity-90">{e.meta}</div>}

                        {editable && (
                          <span
                            onPointerDown={(evt) => empezar(evt, e.id, 'fin')}
                            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ background: 'rgba(255,255,255,0.55)' }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Línea de la hora actual, solo en el día de hoy. */}
                  {mismoDia(d, hoy) &&
                    (() => {
                      const ahora = todayProp ? conHoraDe(hoy, new Date()) : new Date();
                      const h = horaDecimal(ahora);
                      if (h < hourStart || h > hourEnd) return null;
                      return (
                        <div
                          data-ahora
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-20 h-px bg-[var(--k-danger)]"
                          style={{ top: (h - hourStart) * hourHeight }}
                        />
                      );
                    })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 border-b border-[var(--border-default,#e2e8f0)]">
            {diasSemana.map((d) => (
              <div
                key={d.toISOString()}
                className="py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle,#657486)]"
              >
                {DIAS_SEMANA[d.getDay()]}
              </div>
            ))}
          </div>
          <div ref={rejillaRef} className="grid grid-cols-7 grid-rows-6" style={{ minHeight: 420 }}>
            {diasMes.map((d) => {
              const delMes = d.getMonth() === fecha.getMonth();
              const esHoy = mismoDia(d, hoy);
              const suyos = deDia(d);
              const visibles = suyos.slice(0, maxPorDia);
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => onSlotClick?.(d)}
                  className={cn(
                    'flex min-h-[70px] flex-col gap-0.5 border-b border-r border-[var(--border-subtle,#f1f5f9)] p-1',
                    !delMes && 'bg-[var(--bg-muted)]',
                    onSlotClick && 'cursor-pointer hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <span
                    className={cn(
                      'self-end text-[11px] font-semibold',
                      esHoy
                        ? 'rounded-full bg-accent px-1.5 text-[color:var(--color-accent-fg)]'
                        : delMes
                          ? 'text-[var(--fg-body,#2d3a4a)]'
                          : 'text-[var(--fg-subtle,#657486)]',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {visibles.map((e) => {
                    const c = colorDe(e);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        data-evento={e.id}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onEventClick?.(e);
                        }}
                        style={{ background: c.bg, color: c.fg }}
                        className="truncate rounded-[var(--k-radius-xs,2px)] px-1 py-px text-left text-[10px] font-medium"
                      >
                        {e.allDay ? '' : `${hhmm(e._inicio)} `}
                        {e.title}
                      </button>
                    );
                  })}
                  {suyos.length > visibles.length && (
                    <span className="px-1 text-[10px] text-[var(--fg-subtle,#657486)]">
                      +{suyos.length - visibles.length} más
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="border-t border-[var(--border-default,#e2e8f0)] py-6 text-center text-[13px] text-[var(--fg-muted,#52606f)]">
          {emptyMessage}
        </div>
      )}

      {unscheduled && (
        <div className="border-t border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted)] p-2">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
              {unscheduledLabel}
            </span>
            <span className="font-mono text-[10px] text-[var(--fg-subtle,#657486)]">
              {unscheduled.length}
            </span>
          </div>
          {unscheduled.length === 0 ? (
            <p className="px-1 pb-1 text-[11px] italic text-[var(--fg-subtle,#657486)]">
              No queda nada sin programar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map((e) => {
                const c = colorDe(e);
                return (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    data-sin-programar={e.id}
                    aria-label={`${e.title}, sin programar`}
                    onPointerDown={(evt) => empezar(evt, e.id, 'mover', true)}
                    style={{ background: c.bg, color: c.fg }}
                    className={cn(
                      'rounded-[var(--k-radius-xs,2px)] px-2 py-1 text-[11px] font-medium shadow-sm',
                      onSchedule ? 'cursor-grab' : 'cursor-default',
                      arrastre?.id === e.id && 'cursor-grabbing opacity-70',
                    )}
                  >
                    {e.title}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
