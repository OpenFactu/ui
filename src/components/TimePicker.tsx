import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';
import { ControlField, describedBy } from './internal/ControlField';
import { useMessages } from '../i18n/I18nProvider';

export interface TimePickerProps {
  /** `HH:mm` (24 h) o `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Minutos entre opciones de la lista. Default 15. */
  step?: number;
  /** Primera y última hora de la lista (`HH:mm`). Default todo el día. */
  min?: string;
  max?: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMinutes = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

/**
 * Lo que alguien escribe a mano, como hora `HH:mm`: «9» → 09:00, «930» → 09:30, «9.5» y «9,30» → 09:30, «21h» → 21:00.
 * `null` si no se entiende o no es una hora válida.
 */
export function parseTime(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/h$/, '');
  if (!t) return null;
  let h: number; let m: number;
  const sep = /^(\d{1,2})[:.,\s](\d{1,2})$/.exec(t);
  const compact = /^(\d{1,4})$/.exec(t);
  if (sep) { h = Number(sep[1]); m = Number(sep[2].length === 1 ? sep[2] + '0' : sep[2]); }
  else if (compact) {
    const digits = compact[1];
    if (digits.length <= 2) { h = Number(digits); m = 0; } else { h = Number(digits.slice(0, -2)); m = Number(digits.slice(-2)); }
  } else return null;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Hora con lista de opciones y escritura libre: se puede escribir «930» o «9:30» y se entiende, o elegir de la lista
 * (flechas, Intro, Escape). La lista se abre con la hora actual a la vista.
 */
export const TimePicker: React.FC<TimePickerProps> = ({
  value, onChange, step = 15, min = '00:00', max = '23:59', label, helperText, error, required, placeholder: placeholderProp, disabled, id, className,
}) => {
  const timeTexts = useMessages('timePicker');
  const placeholder = placeholderProp ?? timeTexts.placeholder;
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-list`;
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value ?? '');
  const [active, setActive] = React.useState(-1);
  const listRef = React.useRef<HTMLUListElement>(null);
  const options = React.useMemo(() => {
    const out: string[] = [];
    for (let n = toMinutes(min); n <= toMinutes(max); n += Math.max(1, step)) out.push(fromMinutes(n));
    return out;
  }, [min, max, step]);

  React.useEffect(() => { setText(value ?? ''); }, [value]);
  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLDivElement>({ open, onClose: () => setOpen(false), matchAnchorWidth: true, estimatedMaxHeight: 240 });

  // Al abrir, la lista se coloca en la hora elegida (o en la más cercana a la actual).
  React.useEffect(() => {
    if (!open) return;
    const target = value ?? fromMinutes(new Date().getHours() * 60 + new Date().getMinutes());
    let index = options.findIndex((o) => o >= target);
    if (index === -1) index = options.length - 1;
    setActive(index);
    requestAnimationFrame(() => listRef.current?.children[index]?.scrollIntoView({ block: 'center' }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next: string | null) => { onChange(next); setText(next ?? ''); setOpen(false); };
  const commitText = () => {
    if (!text.trim()) { if (value !== null) onChange(null); return; }
    const parsed = parseTime(text);
    if (parsed) { if (parsed !== value) onChange(parsed); setText(parsed); } else setText(value ?? '');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const next = Math.max(0, Math.min(options.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && active >= 0) commit(options[active]); else commitText();
    }
  };

  return (
    <ControlField id={fieldId} label={label} helperText={helperText} error={error} required={required} className={className}>
      <div ref={anchorRef} className="relative flex items-center">
        <UiIcon slot="clock" size={14} className="pointer-events-none absolute left-3 text-[var(--fg-subtle,#657486)]" />
        <input
          id={fieldId}
          data-k-control="input"
          role="combobox"
          inputMode="numeric"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, helperText)}
          aria-required={required || undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onChange={(e) => { setText(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { commitText(); }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] py-2 pl-8 pr-3 text-[13px] font-mono tabular-nums text-[var(--fg-default,#0a1628)]',
            'placeholder:text-[var(--fg-subtle,#657486)] focus-visible:outline-none focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--k-danger)]',
          )}
        />
      </div>
      {(open || mounted) && !disabled && (
        <ul
          ref={(el) => { listRef.current = el; (popoverRef as React.MutableRefObject<HTMLElement | null>).current = el; }}
          id={listId}
          role="listbox"
          aria-label={timeTexts.hours}
          {...popoverProps}
          className={cn('k-time-list k-appear', !ready && 'invisible')}
          style={style}
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((option, i) => (
            <li
              key={option}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option === value}
              data-active={i === active || undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </ControlField>
  );
};
