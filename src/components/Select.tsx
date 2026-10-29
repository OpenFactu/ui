import { ControlField, describedBy } from './internal/ControlField';
import * as React from 'react';
import { adaptivePortal } from './internal/MobileOverlay';
import { resolveMobilePresentation, type MobilePresentation } from './internal/mobilePresentation';
import { useIsMobile } from '../hooks/useMediaQuery';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select con dropdown estilizado (sin buscador). Para listas largas con
 * búsqueda usa SearchableSelect.
 */
export interface SelectProps {
  mobilePresentation?: MobilePresentation;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /**
   * Marca visible junto a la etiqueta y `aria-required` en el control. Hace
   * falta explícito porque esto no es un `<select>` nativo: sin él, migrar un
   * `<select required>` perdía la obligatoriedad sin que se notara.
   */
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
  /** Optional styling for the portaled dropdown (for independently themed surfaces). */
  dropdownClassName?: string;
  dropdownStyle?: React.CSSProperties;
  id?: string;
  /** Nombre accesible cuando no hay `label` visible. */
  ariaLabel?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  required,
  error,
  helperText,
  disabled = false,
  containerClassName,
  className,
  dropdownClassName,
  dropdownStyle,
  id,
  ariaLabel,
  mobilePresentation = 'auto',
}) => {
  const mobile = useIsMobile();
  const presentation = resolveMobilePresentation(mobile, mobilePresentation, 'sheet');
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;
  const listRef = React.useRef<HTMLDivElement>(null);

  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLButtonElement>({
    open: isOpen && !mobile,
    onClose: () => setIsOpen(false),
    matchAnchorWidth: true,
    estimatedMaxHeight: 260,
    scrollStrategy: 'reposition',
  });

  const selectedOption = options.find((opt) => opt.value === value);

  // Al abrir, resaltar la opción seleccionada (o la primera habilitada).
  React.useEffect(() => {
    if (!isOpen) return;
    const selectedIdx = options.findIndex((opt) => opt.value === value && !opt.disabled);
    setHighlightedIndex(
      selectedIdx !== -1 ? selectedIdx : options.findIndex((opt) => !opt.disabled),
    );
  }, [isOpen, options, value]);

  React.useEffect(() => {
    if (highlightedIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-opt-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    if (mobile && el instanceof HTMLElement) el.focus({ preventScroll: true });
  }, [highlightedIndex, mobile]);

  const selectOption = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  const moveHighlight = (delta: 1 | -1) => {
    const enabled = options.map((opt, i) => (opt.disabled ? -1 : i)).filter((i) => i !== -1);
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(highlightedIndex);
    const next =
      pos === -1
        ? delta === 1
          ? enabled[0]
          : enabled[enabled.length - 1]
        : enabled[(pos + delta + enabled.length) % enabled.length];
    setHighlightedIndex(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        event.preventDefault();
        setHighlightedIndex(options.findIndex((o) => !o.disabled));
        break;
      case 'End': {
        event.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) selectOption(opt);
        break;
      }
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const dropdown =
    (isOpen || mounted) &&
    adaptivePortal(
      <div
        ref={popoverRef}
          {...(mobile ? undefined : popoverProps)}
        className={cn(
          'z-[var(--k-z-popover,999999)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg k-appear flex flex-col',
          !ready && !mobile && 'invisible',
          dropdownClassName,
        )}
        style={{ ...dropdownStyle, ...style }}
      >
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-[240px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[var(--border-default)]"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const highlighted = idx === highlightedIndex;
            return (
              <div
                key={opt.value}
                id={`${listboxId}-opt-${idx}`}
                data-opt-index={idx}
                role="option"
                tabIndex={mobile ? highlighted ? 0 : -1 : undefined}
                onKeyDown={mobile ? handleKeyDown : undefined}
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onClick={() => selectOption(opt)}
                onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-[var(--k-radius-xs,2px)] px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-accent text-[color:var(--k-accent-on,#0f172a)] font-semibold'
                    : highlighted
                      ? 'bg-[var(--bg-hover)] text-[var(--fg-body,#2d3a4a)]'
                      : 'text-[var(--fg-body,#2d3a4a)]',
                  opt.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <UiIcon slot="check" className="h-3.5 w-3.5 shrink-0" />}
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-[10px] font-bold text-[var(--fg-subtle)] uppercase tracking-widest">
                Sin opciones
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body,
      { open: isOpen, onClose: () => setIsOpen(false), title: typeof label === 'string' ? label : ariaLabel ?? placeholder, presentation, anchorRef },
    );

  return (
    <ControlField id={selectId} label={label} helperText={helperText} error={error} required={required} className={containerClassName}>
      <button
        ref={anchorRef}
        id={selectId}
        type="button"
        role="combobox"
        data-k-control="select"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, error, helperText)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2 text-[13px] text-left transition-colors',
          'focus-visible:outline-none focus-visible:border-accent',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-[var(--bg-muted)]'
            : 'cursor-pointer hover:border-[var(--border-strong)]',
          isOpen && 'border-accent',
          error && 'border-[var(--k-danger)] focus-visible:border-[var(--k-danger)]',
          className,
        )}
      >
        <span
          className={cn(
            'truncate',
            selectedOption
              ? 'text-[var(--fg-default,#0a1628)]'
              : 'text-[var(--fg-subtle,#657486)]',
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <UiIcon slot="chevron-down"
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle,#657486)] transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {dropdown}
    </ControlField>
  );
};
