import { ControlField, describedBy } from './internal/ControlField';
import { capitalizar, isoDate } from '../internal/fechas';
import * as React from 'react';
import { adaptivePortal } from './internal/MobileOverlay';
import { resolveMobilePresentation, type MobilePresentation } from './internal/mobilePresentation';
import { useIsMobile } from '../hooks/useMediaQuery';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';
import { useI18n } from '../i18n/I18nProvider';

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
  mobilePresentation?: MobilePresentation;
  /** Fecha en ISO 'YYYY-MM-DD' o null. */
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  /** Nombre accesible cuando no se muestra una etiqueta encima. */
  ariaLabel?: string;
  /** Marca visible junto a la etiqueta y `aria-required` en el control. */
  required?: boolean;
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
  /** id del control (para enlazarlo desde una etiqueta propia o `Field`). */
  id?: string;
}


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

const toISO = isoDate;

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
  'p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-muted,#52606f)] hover:text-accent hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30 disabled:pointer-events-none';

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  ariaLabel,
  required,
  error,
  helperText,
  placeholder: placeholderProp,
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
  mobilePresentation = 'auto',
  id,
}) => {
  const { messages: m, format } = useI18n();
  const dp = m.datePicker;
  const placeholder = placeholderProp ?? dp.placeholder;
  const mobile = useIsMobile();
  const presentation = resolveMobilePresentation(mobile, mobilePresentation, 'sheet');
  // Los textos salen del catálogo (`dates`, `common`); la prop `locale` (objeto de textos) sigue ganando.
  const t = React.useMemo<DatePickerLocale>(() => ({
    months: m.dates.months.map(capitalizar),
    monthsShort: m.dates.monthsShort.map(capitalizar),
    weekdays: [...m.dates.weekdaysMin.slice(1), m.dates.weekdaysMin[0]],
    today: m.dates.today,
    clear: m.common.clear,
    ...locale,
  }), [locale, m]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [view, setView] = React.useState<DatePickerView>(initialView);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const selected = parseISO(value);
  const [viewYear, setViewYear] = React.useState(selected?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selected?.m ?? today.getMonth() + 1);
  /** Día con el foco de teclado dentro de la rejilla. */
  const [focusedDay, setFocusedDay] = React.useState<number | null>(null);

  const autoId = React.useId();
  const generatedId = id ?? autoId;
  const gridRef = React.useRef<HTMLDivElement>(null);

  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLDivElement>({
    open: isOpen && !mobile,
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
          className="rounded-[var(--k-radius-xs,2px)] px-1 py-0.5 text-[12px] font-semibold text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover)] hover:text-accent transition-colors"
          aria-label={format(dp.changeMonth, { month: t.months[viewMonth - 1] })}
        >
          {t.months[viewMonth - 1]}
        </button>
      )}
      {view !== 'years' && (
        <button
          type="button"
          onClick={() => setView('years')}
          className="rounded-[var(--k-radius-xs,2px)] px-1 py-0.5 font-mono text-[12px] font-semibold text-[var(--fg-muted,#52606f)] hover:bg-[var(--bg-hover)] hover:text-accent transition-colors"
          aria-label={format(dp.changeYear, { year: viewYear })}
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
                      'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)]',
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
                    'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)]',
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
                    'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)]',
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
    (isOpen || mounted) &&
    adaptivePortal(
      <div
        ref={popoverRef}
          {...(mobile ? undefined : popoverProps)}
        role="dialog"
        aria-label={dp.calendar}
        className={cn(
          'z-[var(--k-z-popover,999999)] w-[280px] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-3 shadow-lg k-appear',
          !ready && !mobile && 'invisible',
        )}
        style={style}
      >
        <div className="flex items-center justify-between gap-1 mb-2">
          <button
            type="button"
            onClick={stepBack}
            disabled={stepBackDisabled}
            aria-label={view === 'days' ? m.dates.previousMonth : view === 'months' ? dp.previousYear : dp.previousDecade}
            className={navButton}
          >
            <UiIcon slot="chevron-left" className="h-4 w-4" />
          </button>
          {headerLabel}
          <button
            type="button"
            onClick={stepForward}
            disabled={stepForwardDisabled}
            aria-label={view === 'days' ? m.dates.nextMonth : view === 'months' ? dp.nextYear : dp.nextDecade}
            className={navButton}
          >
            <UiIcon slot="chevron-right" className="h-4 w-4" />
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
      { open: isOpen, onClose: close, title: label ?? ariaLabel ?? 'Seleccionar fecha', presentation, anchorRef },
    );

  return (
    <ControlField id={generatedId} label={label} helperText={helperText} error={error} required={required} className={className}>
      <div ref={anchorRef} className="relative">
        <button
          id={generatedId}
          data-k-control="select"
          type="button"
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(generatedId, error, helperText)}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => (isOpen ? close() : openCalendar())}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2 text-[13px] transition-colors',
            disabled
              ? 'cursor-not-allowed opacity-50 bg-[var(--bg-muted)]'
              : 'cursor-pointer hover:border-[var(--border-strong)]',
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
              <UiIcon slot="x"
                role="button"
                aria-label={dp.clearDate}
                tabIndex={0}
                className="h-3.5 w-3.5 text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <UiIcon slot="calendar" className="h-3.5 w-3.5 text-[var(--fg-subtle,#657486)]" />
          </span>
        </button>
      </div>
      {calendar}
    </ControlField>
  );
};
