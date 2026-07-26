import * as React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';

export type DatePickerView = 'days' | 'months' | 'years';

export interface DatePickerLocale {
  /** 12 nombres completos, empezando por enero. */
  months: string[];
  /** 12 abreviaturas. */
  monthsShort: string[];
  /** 7 iniciales, empezando en lunes (se rotan según `weekStartsOn`). */
  weekdays: string[];
  today: string;
  clear: string;
}

export interface DatePickerProps {
  /** Fecha en ISO 'YYYY-MM-DD' o null. */
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  /** ISO 'YYYY-MM-DD', inclusive. */
  min?: string;
  /** ISO 'YYYY-MM-DD', inclusive. */
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Vista con la que se abre el calendario. Default 'days'. */
  initialView?: DatePickerView;
  /** Años navegables. Default: derivado de `min`/`max`, o [año-100, año+20]. */
  yearRange?: [number, number];
  /** 0 = domingo, 1 = lunes. Default 1. */
  weekStartsOn?: 0 | 1;
  /** Sustituye los literales en español. */
  locale?: Partial<DatePickerLocale>;
  /** Oculta el pie con «Hoy» y «Limpiar». */
  hideFooter?: boolean;
  /** Se dispara al cambiar el mes/año visible (no la selección). */
  onViewChange?: (year: number, month: number) => void;
  className?: string;
}

const DEFAULT_LOCALE: DatePickerLocale = {
  months: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  today: 'Hoy',
  clear: 'Limpiar',
};

/** Años por página en la vista de años (3 columnas × 4 filas). */
const YEARS_PER_PAGE = 12;

// Parseo/formato manual del ISO — nunca new Date('YYYY-MM-DD'), que
// interpreta la cadena como UTC y desplaza el día según el huso horario.
function parseISO(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(iso: string | null): string {
  const parsed = parseISO(iso);
  if (!parsed) return '';
  return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Posición del día 1 en la rejilla, según el día en que empiece la semana. */
function firstWeekdayOffset(y: number, m: number, weekStartsOn: 0 | 1): number {
  return (new Date(y, m - 1, 1).getDay() - weekStartsOn + 7) % 7;
}

/** Suma meses a un (año, mes) normalizando el desbordamiento. */
function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

const gridButton =
  'flex items-center justify-center rounded-[var(--k-radius-xs,2px)] text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none';
const navButton =
  'p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-muted,#52606f)] hover:text-accent hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none';

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  placeholder = 'dd/mm/aaaa',
  min,
  max,
  disabled = false,
  clearable = false,
  initialView = 'days',
  yearRange,
  weekStartsOn = 1,
  locale,
  hideFooter = false,
  onViewChange,
  className,
}) => {
  const t = React.useMemo(() => ({ ...DEFAULT_LOCALE, ...locale }), [locale]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [view, setView] = React.useState<DatePickerView>(initialView);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const selected = parseISO(value);
  const [viewYear, setViewYear] = React.useState(selected?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selected?.m ?? today.getMonth() + 1);
  /** Día con el foco de teclado dentro de la rejilla. */
  const [focusedDay, setFocusedDay] = React.useState<number | null>(null);

  const generatedId = React.useId();
  const gridRef = React.useRef<HTMLDivElement>(null);

  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLDivElement>({
    open: isOpen,
    onClose: () => setIsOpen(false),
    minWidth: 280,
    estimatedMaxHeight: 360,
    scrollStrategy: 'reposition',
  });

  const minParsed = parseISO(min);
  const maxParsed = parseISO(max);

  const [firstYear, lastYear] = React.useMemo<[number, number]>(() => {
    if (yearRange) return yearRange;
    const base = today.getFullYear();
    return [minParsed?.y ?? base - 100, maxParsed?.y ?? base + 20];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearRange, min, max]);

  const setVisible = React.useCallback(
    (y: number, m: number) => {
      setViewYear(y);
      setViewMonth(m);
      onViewChange?.(y, m);
    },
    [onViewChange],
  );

  const openCalendar = () => {
    if (disabled) return;
    const current = parseISO(value);
    setViewYear(current?.y ?? today.getFullYear());
    setViewMonth(current?.m ?? today.getMonth() + 1);
    setFocusedDay(current?.d ?? null);
    setView(initialView);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setFocusedDay(null);
  };

  const isDayDisabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  /** Un mes se deshabilita solo si NINGÚN día suyo entra en el rango. */
  const isMonthDisabled = (y: number, m: number) => {
    const last = toISO(y, m, daysInMonth(y, m));
    const first = toISO(y, m, 1);
    return (!!min && last < min) || (!!max && first > max);
  };

  const isYearDisabled = (y: number) => {
    if (y < firstYear || y > lastYear) return true;
    return (!!min && toISO(y, 12, 31) < min) || (!!max && toISO(y, 1, 1) > max);
  };

  const selectDay = (d: number) => {
    const iso = toISO(viewYear, viewMonth, d);
    if (isDayDisabled(iso)) return;
    onChange(iso);
    close();
  };

  const shiftMonth = (delta: number) => {
    const next = addMonths(viewYear, viewMonth, delta);
    setVisible(next.y, next.m);
  };

  // ── Navegación con teclado sobre la rejilla de días ──────────────────
  const handleGridKeyDown = (event: React.KeyboardEvent) => {
    if (view !== 'days') return;
    const total = daysInMonth(viewYear, viewMonth);
    const current = focusedDay ?? selected?.d ?? 1;

    const moveTo = (day: number) => {
      event.preventDefault();
      if (day < 1) {
        const prev = addMonths(viewYear, viewMonth, -1);
        setVisible(prev.y, prev.m);
        setFocusedDay(daysInMonth(prev.y, prev.m) + day);
      } else if (day > total) {
        const next = addMonths(viewYear, viewMonth, 1);
        setVisible(next.y, next.m);
        setFocusedDay(day - total);
      } else {
        setFocusedDay(day);
      }
    };

    switch (event.key) {
      case 'ArrowLeft':
        moveTo(current - 1);
        break;
      case 'ArrowRight':
        moveTo(current + 1);
        break;
      case 'ArrowUp':
        moveTo(current - 7);
        break;
      case 'ArrowDown':
        moveTo(current + 7);
        break;
      case 'Home':
        moveTo(1);
        break;
      case 'End':
        moveTo(total);
        break;
      case 'PageUp':
        event.preventDefault();
        shiftMonth(event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        event.preventDefault();
        shiftMonth(event.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        if (focusedDay) {
          event.preventDefault();
          selectDay(focusedDay);
        }
        break;
    }
  };

  // Mantener el foco real sobre el día resaltado al navegar con flechas.
  React.useEffect(() => {
    if (!isOpen || view !== 'days' || focusedDay == null) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focusedDay}"]`)
      ?.focus({ preventScroll: true });
  }, [isOpen, view, focusedDay, viewMonth, viewYear]);

  // ── Cabecera ────────────────────────────────────────────────────────
  const yearPageStart = Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;

  const stepBack = () => {
    if (view === 'days') shiftMonth(-1);
    else if (view === 'months') setVisible(viewYear - 1, viewMonth);
    else setVisible(viewYear - YEARS_PER_PAGE, viewMonth);
  };
  const stepForward = () => {
    if (view === 'days') shiftMonth(1);
    else if (view === 'months') setVisible(viewYear + 1, viewMonth);
    else setVisible(viewYear + YEARS_PER_PAGE, viewMonth);
  };

  // En la vista de años se corta al llegar al extremo del rango navegable.
  const stepBackDisabled = view === 'years' && yearPageStart - 1 < firstYear;
  const stepForwardDisabled = view === 'years' && yearPageStart + YEARS_PER_PAGE > lastYear;

  const headerLabel = (
    <div className="flex items-baseline gap-1.5">
      {view === 'days' && (
        <button
          type="button"
          onClick={() => setView('months')}
          className="rounded-[var(--k-radius-xs,2px)] px-1 py-0.5 text-[12px] font-semibold text-[var(--fg-default,#0a1628)] hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800 hover:text-accent transition-colors"
          aria-label={`Cambiar de mes. Mes actual: ${t.months[viewMonth - 1]}`}
        >
          {t.months[viewMonth - 1]}
        </button>
      )}
      {view !== 'years' && (
        <button
          type="button"
          onClick={() => setView('years')}
          className="rounded-[var(--k-radius-xs,2px)] px-1 py-0.5 font-mono text-[12px] font-semibold text-[var(--fg-muted,#52606f)] hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800 hover:text-accent transition-colors"
          aria-label={`Cambiar de año. Año actual: ${viewYear}`}
        >
          {viewYear}
        </button>
      )}
      {view === 'years' && (
        <span className="px-1 py-0.5 font-mono text-[12px] font-semibold text-[var(--fg-default,#0a1628)]">
          {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
        </span>
      )}
    </div>
  );

  // ── Vistas ──────────────────────────────────────────────────────────
  const weekdayLabels =
    weekStartsOn === 1 ? t.weekdays : [t.weekdays[6], ...t.weekdays.slice(0, 6)];

  const daysView = (
    <>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekdayLabels.map((day, i) => (
          <span
            key={i}
            className="h-7 flex items-center justify-center font-mono text-[10px] font-semibold uppercase text-[var(--fg-subtle,#657486)]"
          >
            {day}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        role="grid"
        onKeyDown={handleGridKeyDown}
        className="grid grid-cols-7 gap-0.5"
      >
        {Array.from({ length: firstWeekdayOffset(viewYear, viewMonth, weekStartsOn) }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth(viewYear, viewMonth) }, (_, i) => i + 1).map((d) => {
          const iso = toISO(viewYear, viewMonth, d);
          const isSelected = value === iso;
          const isToday = iso === todayISO;
          return (
            <button
              key={d}
              type="button"
              data-day={d}
              disabled={isDayDisabled(iso)}
              tabIndex={focusedDay === d || (focusedDay == null && d === 1) ? 0 : -1}
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => selectDay(d)}
              onFocus={() => setFocusedDay(d)}
              className={cn(
                gridButton,
                'h-8 w-full',
                isSelected
                  ? 'bg-accent text-[color:var(--color-accent-fg)] font-semibold'
                  : cn(
                      'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800',
                      isToday && 'font-bold text-accent',
                    ),
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </>
  );

  const monthsView = (
    <div role="grid" className="grid grid-cols-3 gap-1.5">
      {t.monthsShort.map((name, i) => {
        const m = i + 1;
        const isSelected = selected?.y === viewYear && selected?.m === m;
        const isCurrent = today.getFullYear() === viewYear && today.getMonth() + 1 === m;
        return (
          <button
            key={name}
            type="button"
            disabled={isMonthDisabled(viewYear, m)}
            aria-selected={isSelected}
            onClick={() => {
              setVisible(viewYear, m);
              setView('days');
            }}
            className={cn(
              gridButton,
              'h-12 w-full',
              isSelected
                ? 'bg-accent text-[color:var(--color-accent-fg)] font-semibold'
                : cn(
                    'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800',
                    isCurrent && 'font-bold text-accent',
                  ),
            )}
          >
            {name}
          </button>
        );
      })}
    </div>
  );

  const yearsView = (
    <div role="grid" className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i).map((y) => {
        const isSelected = selected?.y === y;
        const isCurrent = today.getFullYear() === y;
        return (
          <button
            key={y}
            type="button"
            disabled={isYearDisabled(y)}
            aria-selected={isSelected}
            onClick={() => {
              setVisible(y, viewMonth);
              setView('months');
            }}
            className={cn(
              gridButton,
              'h-12 w-full font-mono',
              isSelected
                ? 'bg-accent text-[color:var(--color-accent-fg)] font-semibold'
                : cn(
                    'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800',
                    isCurrent && 'font-bold text-accent',
                  ),
            )}
          >
            {y}
          </button>
        );
      })}
    </div>
  );

  const calendar =
    isOpen &&
    createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Calendario"
        className={cn(
          'z-[var(--k-z-popover,999999)] w-[280px] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-3 shadow-lg animate-in fade-in-50 duration-150',
          !ready && 'invisible',
        )}
        style={style}
      >
        <div className="flex items-center justify-between gap-1 mb-2">
          <button
            type="button"
            onClick={stepBack}
            disabled={stepBackDisabled}
            aria-label={view === 'days' ? 'Mes anterior' : view === 'months' ? 'Año anterior' : 'Década anterior'}
            className={navButton}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {headerLabel}
          <button
            type="button"
            onClick={stepForward}
            disabled={stepForwardDisabled}
            aria-label={view === 'days' ? 'Mes siguiente' : view === 'months' ? 'Año siguiente' : 'Década siguiente'}
            className={navButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Altura fija: sin ella, cambiar de vista movería el popover. */}
        <div className="min-h-[236px]">
          {view === 'days' ? daysView : view === 'months' ? monthsView : yearsView}
        </div>

        {!hideFooter && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-default,#e2e8f0)]">
            <button
              type="button"
              disabled={isDayDisabled(todayISO)}
              onClick={() => {
                onChange(todayISO);
                close();
              }}
              className="text-[11px] font-medium text-accent hover:underline disabled:opacity-40 disabled:pointer-events-none"
            >
              {t.today}
            </button>
            {clearable && value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  close();
                }}
                className="text-[11px] font-medium text-[var(--fg-muted,#52606f)] hover:text-[var(--k-danger-fg)] hover:underline"
              >
                {t.clear}
              </button>
            )}
          </div>
        )}
      </div>,
      document.body,
    );

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]"
        >
          {label}
        </label>
      )}
      <div ref={anchorRef} className="relative">
        <button
          id={generatedId}
          type="button"
          disabled={disabled}
          onClick={() => (isOpen ? close() : openCalendar())}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2 text-[13px] transition-colors',
            disabled
              ? 'cursor-not-allowed opacity-50 bg-[var(--k-surface)] dark:bg-slate-800'
              : 'cursor-pointer hover:border-[var(--k-ink-400)] dark:hover:border-slate-600',
            isOpen && 'border-accent',
            error && 'border-[var(--k-danger)]',
          )}
        >
          <span
            className={cn(
              value
                ? 'text-[var(--fg-default,#0a1628)] font-mono text-[12px]'
                : 'text-[var(--fg-subtle,#657486)]',
            )}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
          <span className="flex items-center gap-1">
            {clearable && value && !disabled && (
              <X
                role="button"
                aria-label="Limpiar fecha"
                tabIndex={0}
                className="h-3.5 w-3.5 text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <Calendar className="h-3.5 w-3.5 text-[var(--fg-subtle,#657486)]" />
          </span>
        </button>
      </div>
      {error && <p className="text-[11px] font-medium text-[var(--k-danger-fg)] mt-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-[var(--fg-subtle,#657486)] mt-0.5">
          {helperText}
        </p>
      )}
      {calendar}
    </div>
  );
};
