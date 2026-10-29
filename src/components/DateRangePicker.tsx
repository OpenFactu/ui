import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';
import { useIsMobile } from '../hooks/useMediaQuery';
import { adaptivePortal } from './internal/MobileOverlay';
import { resolveMobilePresentation, type MobilePresentation } from './internal/mobilePresentation';
import { ControlField, describedBy } from './internal/ControlField';
import { capitalizar } from '../internal/fechas';
import {
  rangePresets, addDays, inRange, isoOf, monthGrid, normalizeRange, parseIso, shiftMonth,
  type DateRange, type RangePreset,
} from './internal/calendar';
import { useI18n } from '../i18n/I18nProvider';

export type { DateRange, RangePreset } from './internal/calendar';
export { DEFAULT_RANGE_PRESETS } from './internal/calendar';

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Atajos a la izquierda («Últimos 7 días»…). `false` los quita. Por defecto, los habituales de un ERP. */
  presets?: readonly RangePreset[] | false;
  /** Meses visibles a la vez en escritorio. Default 2 (en móvil, siempre 1). */
  months?: 1 | 2;
  min?: string;
  max?: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Muestra el botón para vaciar el rango. Default true. */
  clearable?: boolean;
  mobilePresentation?: MobilePresentation;
  id?: string;
  className?: string;
}


/**
 * Selector de un rango de fechas: dos meses a la vista, atajos («Este mes», «Últimos 30 días»…), vista previa del
 * rango al pasar por encima y teclado (flechas, RePág/AvPág, Intro). En móvil se abre en la hoja común.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value, onChange, presets: presetsProp, months = 2, min, max, label, helperText, error, required,
  placeholder: placeholderProp, disabled, clearable = true, mobilePresentation = 'auto', id, className,
}) => {
  const { messages: texts, format } = useI18n();
  const drp = texts.dateRangePicker;
  const placeholder = placeholderProp ?? drp.placeholder;
  const presets = React.useMemo(() => presetsProp ?? rangePresets(texts.dates.presets), [presetsProp, texts]);
  const weekdays = [...texts.dates.weekdaysMin.slice(1), texts.dates.weekdaysMin[0]];
  const short = (iso: string) => { const p = parseIso(iso)!; return format(texts.dates.dayMonthYearShort, { day: p.d, month: texts.dates.monthsShort[p.m - 1], year: p.y }); };
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const mobile = useIsMobile();
  const presentation = resolveMobilePresentation(mobile, mobilePresentation, 'sheet');
  const [open, setOpen] = React.useState(false);
  const today = isoOf(new Date());
  const anchorStart = value.start ?? today;
  const [view, setView] = React.useState(() => { const p = parseIso(anchorStart)!; return { y: p.y, m: p.m }; });
  const [pending, setPending] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState<string>(anchorStart);
  const grid = React.useRef<HTMLDivElement>(null);
  const shown = mobile ? 1 : months;

  const close = () => { setOpen(false); setPending(null); setHover(null); };
  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLButtonElement>({
    open: open && !mobile, onClose: close, estimatedMaxHeight: 380,
  });

  const openPicker = () => {
    if (disabled) return;
    const p = parseIso(value.start ?? today)!;
    setView({ y: p.y, m: p.m });
    setFocused(value.start ?? today);
    setOpen(true);
  };

  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const pick = (iso: string) => {
    if (!allowed(iso)) return;
    if (!pending) { setPending(iso); setFocused(iso); return; }
    onChange(normalizeRange(pending, iso));
    close();
  };
  const applyPreset = (preset: RangePreset) => { onChange(preset.range(today)); close(); };

  // Lo que se pinta como rango: el elegido o, mientras se elige el final, el que se formaría.
  const preview: DateRange = pending ? normalizeRange(pending, hover ?? pending) : value;

  // El foco del teclado sigue al día enfocado, y la vista cambia de mes si hace falta.
  React.useEffect(() => {
    if (!open) return;
    const p = parseIso(focused)!;
    const last = shiftMonth(view.y, view.m, shown - 1);
    const before = p.y * 12 + p.m < view.y * 12 + view.m;
    const after = p.y * 12 + p.m > last.y * 12 + last.m;
    if (before) setView({ y: p.y, m: p.m });
    else if (after) setView(shiftMonth(p.y, p.m, -(shown - 1)));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`)?.focus());
  }, [focused, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onGridKey = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) { event.preventDefault(); const next = addDays(focused, moves[event.key]); setFocused(next); if (pending) setHover(next); return; }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const p = parseIso(focused)!; const t = shiftMonth(p.y, p.m, event.key === 'PageUp' ? -1 : 1);
      const day = Math.min(p.d, new Date(t.y, t.m, 0).getDate());
      setFocused(`${t.y}-${String(t.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(focused); }
  };

  const text = value.start && value.end ? (value.start === value.end ? short(value.start) : `${short(value.start)} – ${short(value.end)}`) : '';
  const monthsToShow = Array.from({ length: shown }, (_, i) => shiftMonth(view.y, view.m, i));

  const panel = (
    <div
      ref={popoverRef as React.Ref<HTMLDivElement>}
      {...(mobile ? undefined : popoverProps)}
      role="dialog"
      aria-label={drp.dialog}
      data-k-mobile="DateRangePicker"
      className={cn('k-range-panel k-appear', !ready && !mobile && 'invisible')}
      style={mobile ? undefined : style}
    >
      {presets && presets.length > 0 && (
        <div className="k-range-presets" role="group" aria-label={drp.presets}>
          {presets.map((preset) => {
            const r = preset.range(today);
            const active = r.start === value.start && r.end === value.end;
            return <button key={preset.id} type="button" data-active={active || undefined} onClick={() => applyPreset(preset)}>{preset.label}</button>;
          })}
        </div>
      )}
      <div className="k-range-calendars">
        <div className="k-range-nav">
          <button type="button" aria-label={texts.dates.previousMonth} onClick={() => setView(shiftMonth(view.y, view.m, -1))}><UiIcon slot="chevron-left" size={16} /></button>
          <span aria-live="polite">{pending ? drp.pickEnd : drp.pickStart}</span>
          <button type="button" aria-label={texts.dates.nextMonth} onClick={() => setView(shiftMonth(view.y, view.m, 1))}><UiIcon slot="chevron-right" size={16} /></button>
        </div>
        <div ref={grid} className="k-range-months" onKeyDown={onGridKey} onMouseLeave={() => setHover(null)}>
          {monthsToShow.map(({ y, m }) => (
            <div key={`${y}-${m}`} className="k-range-month">
              <div className="k-range-month-title">{capitalizar(texts.dates.months[m - 1])} {y}</div>
              <div role="grid" aria-label={`${capitalizar(texts.dates.months[m - 1])} ${y}`} className="k-range-grid">
                <div role="row" className="k-range-row">{weekdays.map((d, i) => <span key={i} role="columnheader" className="k-range-weekday">{d}</span>)}</div>
                {monthGrid(y, m).map((week, w) => (
                  <div key={w} role="row" className="k-range-row">
                    {week.map((cell) => {
                      if (cell.outside) return <span key={cell.iso} role="gridcell" className="k-range-day" data-outside />;
                      const start = cell.iso === preview.start; const end = cell.iso === preview.end;
                      const within = inRange(cell.iso, preview);
                      return (
                        <span key={cell.iso} role="gridcell" aria-selected={within || undefined}>
                          <button
                            type="button"
                            data-iso={cell.iso}
                            tabIndex={cell.iso === focused ? 0 : -1}
                            disabled={!allowed(cell.iso)}
                            className="k-range-day"
                            data-in-range={within || undefined}
                            data-start={start || undefined}
                            data-end={end || undefined}
                            data-today={cell.iso === today || undefined}
                            aria-label={format(texts.dates.longDate, { day: cell.d, month: texts.dates.months[cell.m - 1], year: cell.y })}
                            onClick={() => pick(cell.iso)}
                            onMouseEnter={() => pending && setHover(cell.iso)}
                          >
                            {cell.d}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <ControlField id={fieldId} label={label} helperText={helperText} error={error} required={required} className={className}>
      <div className="relative flex items-center">
        <button
          ref={anchorRef}
          id={fieldId}
          type="button"
          data-k-control="select"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, helperText)}
          disabled={disabled}
          onClick={() => (open ? close() : openPicker())}
          className={cn(
            'flex w-full items-center gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2 text-left text-[13px] transition-colors',
            'focus-visible:outline-none focus-visible:border-accent hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50',
            open && 'border-accent',
            error && 'border-[var(--k-danger)]',
            clearable && text && 'pr-9',
          )}
        >
          <UiIcon slot="calendar" size={14} className="shrink-0 text-[var(--fg-subtle,#657486)]" />
          <span className={cn('truncate', text ? 'text-[var(--fg-default,#0a1628)]' : 'text-[var(--fg-subtle,#657486)]')}>{text || placeholder}</span>
        </button>
        {clearable && text && !disabled && (
          <button type="button" aria-label={drp.clear} className="absolute right-1.5 grid h-7 w-7 place-items-center rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:bg-[var(--bg-hover,#f1f5f9)]" onClick={() => onChange({ start: null, end: null })}>
            <UiIcon slot="x" size={14} />
          </button>
        )}
      </div>
      {(open || mounted) && adaptivePortal(panel, document.body, { open, onClose: close, title: typeof label === 'string' ? label : 'Elegir fechas', presentation, anchorRef })}
    </ControlField>
  );
};
