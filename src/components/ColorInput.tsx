import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';
import { isValidHex, normalizeHex } from '../theme/derive';

export interface ColorInputProps {
  /** Color en `#rrggbb`, o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  error?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  /** Campo de texto con el hex junto a la muestra. Default true. */
  showHex?: boolean;
  /** Paleta de acceso rápido bajo el campo. */
  presets?: string[];
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  className?: string;
  containerClassName?: string;
}

const SWATCH_SIZES = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' };
const FIELD_SIZES = { sm: 'px-2 py-1 text-[11px]', md: 'px-2.5 py-1.5 text-[12px]', lg: 'px-3 py-2 text-[13px]' };

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  disabled = false,
  showHex = true,
  presets,
  clearable = false,
  size = 'md',
  id,
  name,
  className,
  containerClassName,
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  // Buffer para poder teclear un hex incompleto sin que se normalice a medias.
  const [draft, setDraft] = React.useState<string | null>(null);
  const hex = normalizeHex(value || '#000000');
  const shown = draft ?? (value ? normalizeHex(value).slice(1) : '');

  const commit = (raw: string) => {
    const candidate = normalizeHex(raw);
    if (isValidHex(candidate)) onChange(candidate);
    setDraft(null);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]"
        >
          {label}
        </label>
      )}

      <div className={cn('flex items-center gap-2', className)}>
        {/* El <input type="color"> nativo va oculto: el cuadro visible es la
            etiqueta, para poder darle el estilo del sistema de diseño. */}
        <label
          className={cn(
            'relative shrink-0 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] overflow-hidden transition-colors',
            SWATCH_SIZES[size],
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--k-ink-400)]',
            error && 'border-[var(--k-danger)]',
          )}
          style={{ background: value ? hex : undefined }}
          title={value || 'Sin color'}
        >
          {!value && (
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--k-surface)] dark:bg-slate-800">
              <span className="h-full w-px rotate-45 bg-[var(--k-danger)]/60" />
            </span>
          )}
          <input
            id={inputId}
            name={name}
            type="color"
            value={hex}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="sr-only"
          />
        </label>

        {showHex && (
          <div
            className={cn(
              'flex items-center rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] transition-colors focus-within:border-accent',
              disabled && 'opacity-50',
              error && 'border-[var(--k-danger)]',
            )}
          >
            <span className="pl-2 font-mono text-[12px] text-[var(--fg-subtle,#94a3b8)] select-none">#</span>
            <input
              type="text"
              inputMode="text"
              spellCheck={false}
              maxLength={6}
              disabled={disabled}
              value={shown}
              aria-label="Código hexadecimal"
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
              }}
              className={cn(
                'w-[8ch] bg-transparent font-mono uppercase text-[var(--fg-default,#0a1628)] focus:outline-none',
                FIELD_SIZES[size],
                'pl-1',
              )}
            />
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label="Quitar color"
                className="px-1.5 text-[var(--fg-subtle,#94a3b8)] hover:text-[var(--k-danger-fg)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => {
            const normalized = normalizeHex(preset);
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => onChange(normalized)}
                aria-label={preset}
                title={preset}
                className={cn(
                  'h-5 w-5 rounded-[var(--k-radius-xs,2px)] border transition-transform hover:scale-110',
                  normalizeHex(value) === normalized
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-[var(--border-default,#e2e8f0)]',
                )}
                style={{ background: normalized }}
              />
            );
          })}
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-[var(--k-danger-fg)]">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-[var(--fg-subtle,#94a3b8)]">{helperText}</p>
      )}
    </div>
  );
};
