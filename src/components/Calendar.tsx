import { MobileScheduleActions } from './internal/MobileScheduleActions';
import * as React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Button } from './Button';
import { Modal } from './Modal';
import { DatePicker } from './DatePicker';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import {
  DIA_MS,
  aFecha,
  aInstante,
  capitalizar,
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
import { layoutLanes, layoutOverlaps, nudgeEvent, rangeFromDrag } from './internal/schedule';
import { useI18n } from '../i18n/I18nProvider';

export type CalendarView = 'day' | 'week' | 'month';

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
  /** Texto sobre `color` en el estilo `solid`. En `soft` el texto es siempre el del tema. */
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
  /**
   * En móvil: `calendar` (por defecto) adapta las vistas a la pantalla — día con su rejilla horaria, semana como tira
   * de días más la rejilla del día elegido, y mes con puntos y la lista del día elegido debajo —; `agenda` las
   * sustituye por una lista de eventos por día.
   */
  mobileView?: 'agenda' | 'calendar';
  events: CalendarEvent[];
  view?: CalendarView;
  onViewChange?: (v: CalendarView) => void;
  /** Vistas que ofrece el selector. Default día, semana y mes. */
  views?: readonly CalendarView[];
  /** Día de referencia: define el día, la semana o el mes que se ve. */
  date?: Date | string;
  onDateChange?: (d: Date) => void;
  /** Barra con «‹ Hoy ›» y el selector de vista. Default true. */
  toolbar?: boolean;
  /** Primera y última hora de la rejilla. Default 6 y 22. */
  hourStart?: number;
  hourEnd?: number;
  /** Alto en píxeles de cada hora. Default 44. */
  hourHeight?: number;
  /**
   * `soft` (por defecto): fondo tintado con una barra del color a la izquierda; el texto es el del tema y se lee
   * igual en claro y en oscuro. `solid`: relleno de color entero.
   */
  eventStyle?: 'soft' | 'solid';
  /** Qué día se considera hoy. Fijable para que las pruebas no dependan del reloj. */
  today?: Date | string;
  /** Arrastrar (o flechas con el bloque enfocado) para mover o cambiar duración. Sin esto es solo lectura. */
  onEventChange?: (e: CalendarEvent, c: CalendarChange) => void;
  onEventClick?: (e: CalendarEvent) => void;
  /** Pulsar un hueco vacío: crear rápido. */
  onSlotClick?: (start: Date) => void;
  /** Arrastrar en un hueco vacío selecciona un rango (ajustado a media hora): crear con su duración. */
  onSlotSelect?: (range: CalendarChange) => void;
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
 * Color del estado y texto sobre el relleno (estilo `solid`). En `soft` el texto es el del tema, así que el
 * contraste no depende del color. `--k-ink-500` y no `--fg-subtle` para «pendiente»: el segundo se invierte con el
 * modo y en oscuro dejaba el texto blanco en 2.89:1.
 */
const COLOR_ESTADO: Record<CalendarStatus, { bg: string; fg: string }> = {
  pendiente: { bg: 'var(--k-ink-500, #64748b)', fg: '#ffffff' },
  'en-curso': { bg: 'rgb(var(--color-accent-rgb, 13 148 136))', fg: 'var(--k-accent-on, #0f172a)' },
  hecha: { bg: 'var(--k-success, #16a34a)', fg: 'var(--k-success-on, #0f172a)' },
  bloqueada: { bg: 'var(--k-danger, #dc2626)', fg: 'var(--k-danger-on, #ffffff)' },
};

const tonoDe = (e: CalendarEvent): React.CSSProperties => {
  const tono = COLOR_ESTADO[e.status ?? 'pendiente'];
  return {
    '--k-ev': e.color ?? tono.bg,
    '--k-ev-on': e.textColor ?? (e.color ? '#ffffff' : tono.fg),
  } as React.CSSProperties;
};

/** Minutos a los que se ajusta un arrastre. Media hora es lo que se agenda. */
const PASO_MIN = 30;
/** Duración mínima con la que se pinta un evento (uno de 0 minutos sería invisible). */
const MIN_VISIBLE = 20;
/** Por debajo de este alto el bloque pasa a una sola línea. */
const ALTO_COMPACTO = 42;

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

/** Selección de un rango arrastrando en un hueco: minutos desde el inicio de la rejilla. */
type Seleccion = { dia: number; a: number; b: number; top: number; movida: boolean };

const soloDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

/**
 * Calendario de día, semana y mes.
 *
 * Las vistas de día y semana colocan los eventos por su hora sobre una rejilla horaria (los que coinciden se
 * reparten en columnas); la de mes los apila dentro de la casilla del día. Arrastrando un bloque se mueve de día y
 * de hora, y por su borde inferior cambia de duración: durante el gesto solo se mueve la vista, y al soltar se avisa
 * **una vez** con las fechas nuevas — así quien lo usa decide si guarda, y no hay una petición por píxel
 * arrastrado. Con el bloque enfocado, las flechas lo mueven y Mayús + ↑/↓ cambia su duración.
 *
 * ```tsx
 * <Calendar
 *   events={tareas}
 *   unscheduled={sinFecha}
 *   onEventChange={(e, { start, end }) => guardar(e.id, start, end)}
 *   onSlotSelect={({ start, end }) => crear(start, end)}
 *   onSchedule={(e, start) => programar(e.id, start)}
 * />
 * ```
 */
export const Calendar: React.FC<CalendarProps> = ({
  events,
  view: viewProp,
  onViewChange,
  views = ['day', 'week', 'month'],
  date: dateProp,
  onDateChange,
  toolbar = true,
  hourStart = 6,
  hourEnd = 22,
  hourHeight = 44,
  eventStyle = 'soft',
  today: todayProp,
  onEventChange,
  onEventClick,
  onSlotClick,
  onSlotSelect,
  unscheduled,
  onSchedule,
  unscheduledLabel: unscheduledLabelProp,
  maxPorDia = 3,
  emptyMessage: emptyMessageProp,
  className,
  'aria-label': ariaLabelProp,
  mobileView = 'calendar',
}) => {
  const { messages: m, format } = useI18n();
  const c = m.calendar;
  const dn = m.dates;
  const unscheduledLabel = unscheduledLabelProp ?? c.unscheduled;
  const emptyMessage = emptyMessageProp ?? c.empty;
  const ariaLabel = ariaLabelProp ?? c.label;
  /** «jueves 23». */
  const diaSemana = (d: Date) => format(c.weekdayDay, { weekday: dn.weekdays[d.getDay()], day: d.getDate() });
  /** «jueves, 23 de julio». */
  const fechaLarga = (d: Date) => format(dn.weekdayDayMonth, { weekday: dn.weekdays[d.getDay()], day: d.getDate(), month: dn.months[d.getMonth()] });
  /** «23 de julio». */
  const diaMes = (d: Date) => format(dn.dayMonth, { day: d.getDate(), month: dn.months[d.getMonth()] });
  const mobile = useIsMobile();
  /** Móvil con rejilla: la semana se ve día a día y el mes con puntos. */
  const compacto = mobile && mobileView !== 'agenda';
  const hoy = React.useMemo(() => aFecha(todayProp ?? new Date()), [todayProp]);

  // Vista y fecha admiten ser controladas o no: la mayoría de pantallas solo
  // quieren un calendario que funcione sin cablear dos estados.
  const [viewInterna, setViewInterna] = React.useState<CalendarView>(viewProp ?? 'week');
  const viewControlada = viewProp !== undefined && onViewChange !== undefined;
  const view = viewControlada ? viewProp : viewInterna;
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
  const [seleccion, setSeleccion] = React.useState<Seleccion | null>(null);
  const [scheduling, setScheduling] = React.useState<CalendarEvent | null>(null);
  const [scheduleDate, setScheduleDate] = React.useState<string | null>(null);
  const [anuncio, setAnuncio] = React.useState('');
  const rejillaRef = React.useRef<HTMLDivElement>(null);
  // Tras un arrastre de verdad el clic que llega al soltar no debe abrir el evento.
  const huboArrastre = React.useRef(false);
  // Un cambio con teclado puede llevar el bloque a otra columna (otro padre): se le devuelve el foco.
  const focoPendiente = React.useRef<string | null>(null);

  // La línea de «ahora» avanza sola, una vez por minuto.
  const [reloj, setReloj] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setReloj(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const ahora = todayProp ? conHoraDe(hoy, reloj) : reloj;

  // Navegación con flechas por el mes en móvil: al cambiar de día, el foco va a su casilla.
  const focoDia = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!focoDia.current) return;
    focoDia.current = false;
    rejillaRef.current?.querySelector<HTMLElement>('[data-k-cal-selected]')?.focus();
  });

  React.useLayoutEffect(() => {
    if (!focoPendiente.current) return;
    rejillaRef.current?.querySelector<HTMLElement>(`[data-evento="${CSS.escape(focoPendiente.current)}"]`)?.focus();
    focoPendiente.current = null;
  });

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

  /** Días de la rejilla horaria: uno en la vista de día, siete en la de semana. */
  const dias = React.useMemo(
    () => (view === 'day' || (compacto && view === 'week') ? [aFecha(fecha)] : diasSemana),
    [view, fecha, diasSemana, compacto],
  );
  const columnas = view === 'month' ? 7 : dias.length;
  const minutosRejilla = (hourEnd - hourStart) * 60;

  // ── Arrastre ──────────────────────────────────────────────────────────
  // Se traduce el desplazamiento del puntero a días y minutos con las mismas
  // medidas con las que se pinta, de modo que lo que se ve mientras se arrastra
  // es exactamente lo que se guardará.

  const anchoDia = () => {
    const el = rejillaRef.current;
    if (!el) return 1;
    return el.getBoundingClientRect().width / columnas;
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
    huboArrastre.current = false;
    setArrastre({ id, modo, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, desdeCola });
  };

  /** Pulsar en un hueco vacío de un día empieza una selección de rango. */
  const empezarSeleccion = (e: React.PointerEvent<HTMLDivElement>, dia: number) => {
    if (!onSlotSelect && !onSlotClick) return;
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-evento]')) return;
    const r = e.currentTarget.getBoundingClientRect();
    const min = ((e.clientY - r.top) / hourHeight) * 60;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSeleccion({ dia, a: min, b: min, top: r.top, movida: false });
  };

  const mover = (e: React.PointerEvent) => {
    if (seleccion) {
      const b = Math.max(0, Math.min(minutosRejilla, ((e.clientY - seleccion.top) / hourHeight) * 60));
      setSeleccion({ ...seleccion, b, movida: seleccion.movida || Math.abs(b - seleccion.a) * (hourHeight / 60) > 6 });
      return;
    }
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x0;
    const dy = e.clientY - arrastre.y0;
    if (Math.hypot(dx, dy) > 4) huboArrastre.current = true;
    setArrastre({ ...arrastre, dx, dy });
  };

  const inicioDeRejilla = (d: Date) => {
    const x = new Date(d.getTime());
    x.setHours(hourStart, 0, 0, 0);
    return x;
  };

  const soltar = (e: React.PointerEvent) => {
    if (seleccion) {
      const s = seleccion;
      setSeleccion(null);
      const base = inicioDeRejilla(dias[s.dia]);
      if (!s.movida) {
        const desde = Math.floor(s.a / PASO_MIN) * PASO_MIN;
        if (onSlotClick) onSlotClick(sumarMinutos(base, desde));
        else onSlotSelect?.({ start: sumarMinutos(base, desde), end: sumarMinutos(base, Math.min(minutosRejilla, desde + 60)) });
        return;
      }
      const { from, to } = rangeFromDrag(s.a, s.b, PASO_MIN, minutosRejilla);
      if (onSlotSelect) onSlotSelect({ start: sumarMinutos(base, from), end: sumarMinutos(base, to) });
      else onSlotClick?.(sumarMinutos(base, from));
      return;
    }
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
    const col = Math.min(columnas - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * columnas)));
    if (view === 'month') {
      const fila = Math.floor(((clientY - r.top) / r.height) * 6);
      return diasMes[Math.min(41, Math.max(0, fila * 7 + col))];
    }
    const minutos = ((clientY - r.top) / hourHeight) * 60;
    const ajustados = Math.round(minutos / PASO_MIN) * PASO_MIN;
    return sumarMinutos(inicioDeRejilla(dias[col]), ajustados);
  };

  /**
   * Crear sin arrastrar (teclado, lector de pantalla o quien no quiera arrastrar): una hora en el día que se ve, desde la
   * próxima media hora si es hoy o a las 9:00 si es otro día, dentro del horario de la rejilla.
   */
  const crearAhora = () => {
    const dia = aFecha(fecha);
    const base = inicioDeRejilla(dia);
    let desde = mismoDia(dia, hoy)
      ? Math.ceil(((horaDecimal(ahora) - hourStart) * 60) / PASO_MIN) * PASO_MIN
      : (9 - hourStart) * 60;
    desde = Math.max(0, Math.min(minutosRejilla - 60, desde));
    const start = sumarMinutos(base, desde);
    if (onSlotSelect) onSlotSelect({ start, end: sumarMinutos(start, 60) });
    else onSlotClick?.(start);
  };

  /** Flechas sobre un bloque enfocado: lo mueve (o con Mayús cambia su duración) y lo anuncia. */
  const teclaEvento = (evt: React.KeyboardEvent, e: Normalizado) => {
    if (evt.key === 'Enter') { evt.preventDefault(); onEventClick?.(e); return; }
    if (!onEventChange || e.locked) return;
    const siguiente = nudgeEvent(e._inicio, e._fin, evt.key, evt.shiftKey, PASO_MIN);
    if (!siguiente) return;
    evt.preventDefault();
    focoPendiente.current = e.id;
    onEventChange(e, siguiente);
    setAnuncio(format(c.moved, { title: e.title, date: diaSemana(siguiente.start), start: hhmm(siguiente.start), end: hhmm(siguiente.end) }));
  };

  // ── Navegación ────────────────────────────────────────────────────────

  const paso = (signo: 1 | -1) => {
    if (view === 'day') { irA(sumarDias(fecha, signo)); return; }
    if (view === 'week') { irA(sumarDias(fecha, 7 * signo)); return; }
    const d = aFecha(fecha);
    d.setMonth(d.getMonth() + signo);
    irA(d);
  };

  const verDia = (d: Date) => {
    if (!views.includes('day')) return;
    irA(d);
    cambiarView('day');
  };

  const titulo =
    view === 'day' || (compacto && view === 'week')
      ? capitalizar(fechaLarga(fecha))
      : view === 'week'
        ? format(c.weekTitle, { startDay: diasSemana[0].getDate(), startMonth: dn.months[diasSemana[0].getMonth()], endDay: diasSemana[6].getDate(), endMonth: dn.months[diasSemana[6].getMonth()] })
        : format(dn.monthYear, { month: dn.months[fecha.getMonth()], year: fecha.getFullYear() });

  /**
   * Un evento de todo el día ocupa TODOS los días de su rango, no solo el de
   * inicio: una tarea que va del lunes al miércoles tiene que verse los tres
   * días, que es justo para lo que se mira un calendario de planificación. La
   * comparación es por día natural, no por instante, para que un rango que
   * termina a las 00:00 no pierda su último día.
   */
  const abarcaDia = (e: Normalizado, d: Date) => {
    if (mismoDia(e._inicio, d)) return true;
    const dia = soloDia(d);
    return dia >= soloDia(e._inicio) && dia <= soloDia(e._fin);
  };

  // Los eventos CON hora se quedan en su día de inicio: su posición vertical
  // sale de la hora, así que repetirlos en los días siguientes los pintaría en
  // una franja horaria que no significa nada.
  const todoElDia = (d: Date) => normalizados.filter((e) => e.allDay && abarcaDia(e, d));
  const conHora = (d: Date) => normalizados.filter((e) => !e.allDay && mismoDia(e._inicio, d));
  const deDia = (d: Date) => [...todoElDia(d), ...conHora(d)];

  /** Barras de todo el día de la rejilla horaria: una por evento, de su primer a su último día visible. */
  const barras = React.useMemo(() => {
    const base = soloDia(dias[0]);
    const indice = (d: Date) => Math.round((soloDia(d) - base) / DIA_MS);
    const visibles = normalizados
      .filter((e) => e.allDay)
      .map((e) => ({ e, desde: indice(e._inicio), hasta: indice(e._fin) }))
      .filter((b) => b.hasta >= 0 && b.desde <= dias.length - 1);
    const carriles = layoutLanes(visibles.map((b) => ({ id: b.e.id, from: Math.max(0, b.desde), to: Math.min(dias.length - 1, b.hasta) })));
    return visibles.map((b) => ({ ...b, carril: carriles.get(b.e.id) ?? 0 }));
  }, [normalizados, dias]);

  const altoRejilla = horas.length * hourHeight;
  const hoyVisible = dias.some((d) => mismoDia(d, hoy));
  const horaAhora = horaDecimal(ahora);
  const lineaAhora = view !== 'month' && hoyVisible && horaAhora >= hourStart && horaAhora <= hourEnd
    ? (horaAhora - hourStart) * hourHeight
    : null;

  /** Bloques con hora de un día, con su columna de solape. */
  const bloquesDe = (d: Date) => {
    const suyos = conHora(d);
    const huecos = layoutOverlaps(suyos.map((e) => ({
      id: e.id,
      start: e._inicio.getTime(),
      end: Math.max(e._fin.getTime(), e._inicio.getTime() + MIN_VISIBLE * 60000),
    })));
    return suyos.map((e) => ({ e, hueco: huecos.get(e.id) ?? { col: 0, cols: 1, span: 1 } }));
  };

  const rangoAgenda = view === 'month' ? diasMes.filter((day) => day.getMonth() === fecha.getMonth()) : dias;
  const textoHora = (e: Normalizado) => (e.allDay ? c.allDay : `${hhmm(e._inicio)} – ${hhmm(e._fin)}`);

  return (
    <div data-k-mobile="Calendar"
      aria-label={ariaLabel}
      // Los manejadores van en la raíz y no en la rejilla: al arrastrar una
      // tarjeta de «sin programar», la captura de puntero reencamina los
      // eventos a la propia tarjeta, que cuelga del panel de abajo. Colgados de
      // la rejilla no llegaban nunca y el gesto no hacía nada.
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={() => { setSeleccion(null); setArrastre(null); }}
      data-event-style={eventStyle}
      data-compact={compacto || undefined}
      className={cn('k-cal', className)}
    >
      {onEventChange && <MobileScheduleActions allowZeroDuration={false} items={events} onChange={(id, start, end) => { const event = events.find(event => event.id === id); if (event) onEventChange(event, { start, end }); }} />}
      <span className="sr-only" aria-live="polite">{anuncio}</span>

      {toolbar && (
        <div className="k-cal-toolbar">
          <div className="flex min-w-0 items-center gap-1">
            <button type="button" className="k-cal-nav" aria-label={c.previous[view]} onClick={() => paso(-1)}>
              <UiIcon slot="chevron-left" size={16} />
            </button>
            <button type="button" className="k-cal-today" onClick={() => irA(hoy)}>{dn.today}</button>
            <button type="button" className="k-cal-nav" aria-label={c.next[view]} onClick={() => paso(1)}>
              <UiIcon slot="chevron-right" size={16} />
            </button>
            <span className="k-cal-title">{titulo}</span>
          </div>

          <div className="k-cal-toolbar-end">
            {(onSlotSelect || onSlotClick) && (
              <button type="button" className="k-cal-new" onClick={crearAhora}>
                <UiIcon slot="plus" size={14} />
                {c.newEvent}
              </button>
            )}
            {views.length > 1 && (
              <div role="radiogroup" aria-label={c.viewsLabel} className="k-cal-views">
                {views.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => cambiarView(v)}>
                    {c.views[v]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mobile && mobileView === 'agenda' ? <div className="k-mobile-agenda" role="list" aria-label={c.agenda}>{rangoAgenda.filter(day => deDia(day).length > 0).map(day => <section key={day.toISOString()} role="listitem"><h3>{fechaLarga(day)}</h3>{deDia(day).map(event => <div key={event.id} className="k-mobile-agenda-event">{onEventClick ? <button type="button" onClick={() => onEventClick(event)}><strong>{event.title}</strong><span>{textoHora(event)}</span></button> : <><strong>{event.title}</strong><span>{textoHora(event)}</span></>}</div>)}</section>)}{onSlotClick && <Button variant="secondary" onClick={() => onSlotClick(fecha)}>{c.addEvent}</Button>}</div> : (view !== 'month' ? (
        <div className="k-cal-time" data-view={view}>
          {compacto && view === 'week' && (
            <div className="k-cal-weekstrip" role="tablist" aria-label={c.weekDays}>
              {diasSemana.map((d) => {
                const elegido = mismoDia(d, fecha);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    role="tab"
                    aria-selected={elegido}
                    aria-label={diaSemana(d)}
                    data-today={mismoDia(d, hoy) || undefined}
                    data-weekend={esFinde(d) || undefined}
                    onClick={() => irA(d)}
                  >
                    <span>{dn.weekdaysMin[d.getDay()]}</span>
                    <strong>{d.getDate()}</strong>
                    <i aria-hidden="true" data-on={deDia(d).length > 0 || undefined} />
                  </button>
                );
              })}
            </div>
          )}
          {/* Cabecera de días + banda de todo el día. */}
          <div className="k-cal-head" hidden={compacto && view === 'week'} style={{ '--k-cal-cols': dias.length } as React.CSSProperties}>
            <div className="k-cal-gutter" />
            <div className="k-cal-days">
              {dias.map((d) => {
                const esHoy = mismoDia(d, hoy);
                return (
                  <div key={d.toISOString()} className="k-cal-dayhead" data-weekend={esFinde(d) || undefined} data-today={esHoy || undefined}>
                    <span className="k-cal-weekday">{dn.weekdaysShort[d.getDay()]}</span>
                    {view === 'week' && views.includes('day') ? (
                      <button type="button" className="k-cal-daynum" aria-label={format(c.viewDay, { date: diaSemana(d) })} onClick={() => verDia(d)}>
                        {d.getDate()}
                      </button>
                    ) : (
                      <span className="k-cal-daynum">{d.getDate()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {barras.length > 0 && (
            <div className="k-cal-allday-row" style={{ '--k-cal-cols': dias.length } as React.CSSProperties}>
              <div className="k-cal-gutter"><span>{c.allDay}</span></div>
              <div className="k-cal-allday">
                {barras.map(({ e, desde, hasta, carril }) => (
                  <button
                    key={e.id}
                    type="button"
                    data-evento-dia={e.id}
                    data-status={e.status ?? 'pendiente'}
                    data-cut-start={desde < 0 || undefined}
                    data-cut-end={hasta > dias.length - 1 || undefined}
                    className="k-cal-bar"
                    style={{
                      ...tonoDe(e),
                      gridColumn: `${Math.max(0, desde) + 1} / ${Math.min(dias.length - 1, hasta) + 2}`,
                      gridRow: carril + 1,
                    }}
                    onClick={() => onEventClick?.(e)}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rejilla horaria. */}
          <div className="k-cal-body">
            <div className="k-cal-gutter k-cal-hours" style={{ height: altoRejilla }}>
              {horas.slice(1).map((h) => (
                <span key={h} style={{ top: (h - hourStart) * hourHeight }}>{String(h).padStart(2, '0')}:00</span>
              ))}
              {lineaAhora !== null && (
                <span className="k-cal-now-label" style={{ top: lineaAhora }}>{hhmm(ahora)}</span>
              )}
            </div>

            <div
              ref={rejillaRef}
              className="k-cal-grid"
              style={{ height: altoRejilla, '--k-cal-cols': dias.length, '--k-cal-hour': `${hourHeight}px` } as React.CSSProperties}
            >
              {lineaAhora !== null && <div className="k-cal-now-track" aria-hidden="true" style={{ top: lineaAhora }} />}
              {dias.map((d, indiceDia) => {
                const esHoy = mismoDia(d, hoy);
                return (
                  <div
                    key={d.toISOString()}
                    className="k-cal-col"
                    data-weekend={esFinde(d) || undefined}
                    data-today={esHoy || undefined}
                    data-selectable={onSlotSelect || onSlotClick ? true : undefined}
                    onPointerDown={(evt) => empezarSeleccion(evt, indiceDia)}
                  >
                    {/* Bloques del día, colocados por hora y repartidos si coinciden. */}
                    {bloquesDe(d).map(({ e, hueco }) => {
                      const inicio = aplicar(e._inicio, 'inicio', e.id);
                      const fin = aplicar(e._fin, 'fin', e.id);
                      const desde = Math.max(hourStart, horaDecimal(inicio));
                      const hasta = Math.min(hourEnd, Math.max(horaDecimal(fin), horaDecimal(inicio) + MIN_VISIBLE / 60));
                      if (hasta <= hourStart || desde >= hourEnd) return null;
                      const editable = Boolean(onEventChange) && !e.locked;
                      const arrastrando = arrastre?.id === e.id && !arrastre.desdeCola;
                      const alto = Math.max(18, (hasta - desde) * hourHeight - 2);
                      const compacto = alto < ALTO_COMPACTO;
                      const { dDias } = arrastrando ? desfase(e.id, 'inicio') : { dDias: 0 };
                      // Mientras se arrastra va a todo el ancho y por encima: el reparto es de donde estaba.
                      const col = arrastrando ? 0 : hueco.col;
                      const span = arrastrando ? hueco.cols : hueco.span;
                      const izquierda = (col / hueco.cols) * 100;
                      const ancho = (span / hueco.cols) * 100;
                      const origenTop = (Math.max(hourStart, horaDecimal(e._inicio)) - hourStart) * hourHeight + 1;
                      return (
                        <React.Fragment key={e.id}>
                          {arrastrando && huboArrastre.current && (
                            <div
                              className="k-cal-origin"
                              aria-hidden="true"
                              style={{ top: origenTop, height: Math.max(18, (horaDecimal(e._fin) - horaDecimal(e._inicio)) * hourHeight - 2), left: `calc(${(hueco.col / hueco.cols) * 100}% + 2px)`, width: `calc(${(hueco.span / hueco.cols) * 100}% - 4px)` }}
                            />
                          )}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={format(editable ? c.eventEditable : c.event, { title: e.title, start: hhmm(inicio), end: hhmm(fin) })}
                            title={`${hhmm(inicio)}–${hhmm(fin)} · ${e.title}`}
                            data-evento={e.id}
                            data-status={e.status ?? 'pendiente'}
                            data-compact={compacto || undefined}
                            data-tall={alto >= 58 || undefined}
                            data-dragging={arrastrando || undefined}
                            data-editable={editable || undefined}
                            onClick={() => { if (!huboArrastre.current) onEventClick?.(e); huboArrastre.current = false; }}
                            onKeyDown={(evt) => teclaEvento(evt, e)}
                            onPointerDown={(evt) => empezar(evt, e.id, 'mover')}
                            style={{
                              ...tonoDe(e),
                              top: (desde - hourStart) * hourHeight + 1,
                              height: alto,
                              left: `calc(${izquierda}% + 2px)`,
                              width: `calc(${ancho}% - 4px)`,
                              transform: dDias ? `translateX(${dDias * 100}%)` : undefined,
                              zIndex: arrastrando ? 30 : 1 + hueco.col,
                            }}
                            className="k-cal-event"
                          >
                            <span className="k-cal-event-title">{e.title}</span>
                            <span className="k-cal-event-time">{hhmm(inicio)}{compacto ? '' : ` – ${hhmm(fin)}`}</span>
                            {e.meta && alto >= 58 && <span className="k-cal-event-meta">{e.meta}</span>}
                            {editable && (
                              <span
                                onPointerDown={(evt) => empezar(evt, e.id, 'fin')}
                                className="k-cal-event-resize"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {seleccion?.dia === indiceDia && seleccion.movida && (() => {
                      const { from, to } = rangeFromDrag(seleccion.a, seleccion.b, PASO_MIN, minutosRejilla);
                      const base = inicioDeRejilla(d);
                      return (
                        <div className="k-cal-ghost" aria-hidden="true" style={{ top: (from / 60) * hourHeight + 1, height: ((to - from) / 60) * hourHeight - 2 }}>
                          <strong>{c.newEvent}</strong>
                          <span>{hhmm(sumarMinutos(base, from))} – {hhmm(sumarMinutos(base, to))}</span>
                        </div>
                      );
                    })()}

                    {/* Línea de la hora actual: fuerte en el día de hoy, tenue en el resto de la semana. */}
                    {esHoy && lineaAhora !== null && (
                      <div data-ahora className="k-cal-now" aria-hidden="true" style={{ top: lineaAhora }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="k-cal-month">
          <div className="k-cal-month-head">
            {diasSemana.map((d) => (
              <div key={d.toISOString()} data-weekend={esFinde(d) || undefined}>{dn.weekdaysShort[d.getDay()]}</div>
            ))}
          </div>
          <div ref={rejillaRef} className="k-cal-month-grid grid grid-cols-7 grid-rows-6">
            {diasMes.map((d) => {
              const delMes = d.getMonth() === fecha.getMonth();
              const esHoy = mismoDia(d, hoy);
              const suyos = deDia(d);
              const visibles = suyos.slice(0, maxPorDia);
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => (compacto ? irA(d) : onSlotClick?.(d))}
                  className="k-cal-cell"
                  data-outside={!delMes || undefined}
                  data-weekend={esFinde(d) || undefined}
                  data-today={esHoy || undefined}
                  data-selected={(compacto && mismoDia(d, fecha)) || undefined}
                  data-selectable={onSlotClick || compacto ? true : undefined}
                  role={compacto ? 'button' : undefined}
                  // Un solo día enfocable a la vez (el elegido); las flechas se mueven por la rejilla.
                  tabIndex={compacto ? (mismoDia(d, fecha) ? 0 : -1) : undefined}
                  data-k-cal-selected={(compacto && mismoDia(d, fecha)) || undefined}
                  onKeyDown={compacto ? (evt) => {
                    const salto: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                    if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); irA(d); return; }
                    if (salto[evt.key] === undefined) return;
                    evt.preventDefault();
                    focoDia.current = true;
                    irA(sumarDias(d, salto[evt.key]));
                  } : undefined}
                  aria-label={compacto ? (suyos.length ? format(c.dayWithEvents, { date: fechaLarga(d), count: suyos.length }) : fechaLarga(d)) : undefined}
                >
                  <span className="k-cal-cell-num">{d.getDate()}</span>
                  {compacto ? (
                    suyos.length > 0 && (
                      <span className="k-cal-dots" aria-hidden="true">
                        {suyos.slice(0, 3).map((e) => <i key={e.id} style={tonoDe(e)} />)}
                      </span>
                    )
                  ) : visibles.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      data-evento={e.id}
                      data-status={e.status ?? 'pendiente'}
                      data-all-day={e.allDay || undefined}
                      className="k-cal-chip"
                      style={tonoDe(e)}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onEventClick?.(e);
                      }}
                    >
                      {!e.allDay && <span className="k-cal-chip-time">{hhmm(e._inicio)}</span>}
                      <span className="k-cal-chip-title">{e.title}</span>
                    </button>
                  ))}
                  {!compacto && suyos.length > visibles.length && (
                    <button
                      type="button"
                      className="k-cal-more"
                      onClick={(evt) => { evt.stopPropagation(); verDia(d); }}
                      disabled={!views.includes('day')}
                    >
                      {format(c.more, { count: suyos.length - visibles.length })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {compacto && (
            <section className="k-cal-dayagenda" aria-label={format(c.dayEvents, { date: diaMes(fecha) })}>
              <h3>{capitalizar(fechaLarga(fecha))}</h3>
              {deDia(fecha).length === 0 ? <p className="k-cal-dayagenda-empty">{c.nothingThisDay}</p> : deDia(fecha).map((e) => (
                <button key={e.id} type="button" className="k-cal-agenda-item" data-evento={e.id} style={tonoDe(e)} onClick={() => onEventClick?.(e)}>
                  <span className="k-cal-agenda-time">{e.allDay ? c.allDay : hhmm(e._inicio)}</span>
                  <span className="k-cal-agenda-title">{e.title}</span>
                </button>
              ))}
              {onSlotClick && <Button size="sm" variant="secondary" onClick={() => onSlotClick(fecha)}>{c.addEvent}</Button>}
            </section>
          )}
        </div>
      ))}

      {(events.length === 0 || (mobile && mobileView === 'agenda' && !rangoAgenda.some(day => deDia(day).length))) && (
        <div className="k-cal-empty">{emptyMessage}</div>
      )}

      {unscheduled && (
        <div className="k-cal-tray">
          <div className="k-cal-tray-head">
            <span>{unscheduledLabel}</span>
            <span className="k-cal-tray-count">{unscheduled.length}</span>
          </div>
          {unscheduled.length === 0 ? (
            <p className="k-cal-tray-empty">{c.trayEmpty}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map((e) => (
                <div
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  data-sin-programar={e.id}
                  data-status={e.status ?? 'pendiente'}
                  data-dragging={arrastre?.id === e.id || undefined}
                  aria-label={format(c.unscheduledItem, { title: e.title })}
                  onPointerDown={(evt) => { if (!mobile) empezar(evt, e.id, 'mover', true); }}
                  onClick={() => { if (mobile && onSchedule) { setScheduling(e); setScheduleDate(null); } }}
                  onKeyDown={(evt) => { if (onSchedule && (evt.key === 'Enter' || evt.key === ' ')) { evt.preventDefault(); setScheduling(e); setScheduleDate(null); } }}
                  style={{
                    ...tonoDe(e),
                    ...(arrastre?.id === e.id && arrastre.desdeCola ? { transform: `translate(${arrastre.dx}px, ${arrastre.dy}px)` } : null),
                  }}
                  className="k-cal-chip k-cal-tray-item"
                  data-draggable={onSchedule ? true : undefined}
                >
                  {onSchedule && <UiIcon slot="grip-vertical" size={12} className="k-cal-tray-grip" aria-hidden="true" />}
                  <span className="k-cal-chip-title">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Modal isOpen={!!scheduling} onClose={() => setScheduling(null)} title={c.scheduleTitle} hideCancel>
        <form onSubmit={event => { event.preventDefault(); if (scheduling && scheduleDate) { onSchedule?.(scheduling, aFecha(scheduleDate)); setScheduling(null); } }}>
          <DatePicker label={c.date} value={scheduleDate} onChange={setScheduleDate} />
          <Button type="submit" disabled={!scheduleDate}>{c.schedule}</Button>
        </form>
      </Modal>
    </div>
  );
};
