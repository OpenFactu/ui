import { ControlField, describedBy } from './internal/ControlField';
import * as React from 'react';
import { cn } from '../utils';
import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from './internal/optionStyle';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
  /** Datos propios, para `renderOption`. */
  [key: string]: any;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  /** name compartido de los inputs radio. Default: useId(). */
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** id del grupo (para enlazarlo desde fuera). */
  id?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
  /** Pinta el texto de cada opción, junto al círculo (o sola, con `indicator={false}`). */
  renderOption?: (option: RadioOption, state: ItemRenderState) => React.ReactNode;
  /** Clases de cada opción: forma, fondo, tamaño. La marcada lleva `data-checked`. También como función. */
  optionClassName?: ItemClassName<RadioOption>;
  /** Muestra el círculo. Default true. Sin él, marca tú la elegida: `data-checked:` o `renderOption`. */
  indicator?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = (rawProps) => {
  const {
  options,
  value,
  onChange,
  name,
  label,
  error,
  helperText,
  required,
  id,
  orientation = 'vertical',
  disabled = false,
  className,
  renderOption,
  optionClassName,
  indicator = true,
} = useComponentDefaults('RadioGroup', rawProps);
  const generatedName = React.useId();
  const groupName = name || generatedName;
  const groupId = id ?? `${generatedName}-group`;

  return (
    <ControlField id={groupId} label={label} helperText={helperText} error={error} required={required} labelMode="group" className={className}>
      <div
        id={groupId}
        role="radiogroup"
        data-k-control="radio-group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={describedBy(groupId, error, helperText)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={cn('flex gap-1', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap gap-x-5')}
      >
        {options.map((opt) => {
          const isDisabled = disabled || opt.disabled;
          const isChecked = value === opt.value;
          const content = (
            <span className="flex flex-col">
              <span className="text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-default,#0a1628)] leading-tight">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[length:calc(11px*var(--k-text-scale,1))] text-[var(--fg-subtle,#657486)] mt-0.5">
                  {opt.description}
                </span>
              )}
            </span>
          );
          const state: ItemRenderState = { selected: isChecked, highlighted: false, disabled: Boolean(isDisabled), query: '', label: opt.label, content };
          return (
            <label
              key={opt.value}
              data-checked={isChecked || undefined}
              className={cn(
                'group flex items-start gap-2.5 py-1',
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                !indicator && 'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                resolveItemClass(optionClassName, opt, state),
              )}
            >
              <span className={indicator ? 'relative flex items-center justify-center mt-0.5' : 'sr-only'}>
                <input
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => onChange(opt.value)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'h-4 w-4 rounded-full border transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1',
                    isChecked
                      ? 'border-accent bg-accent'
                      : // `--k-ink-400` y no `--border-strong`: el aro de un radio
                        // sin marcar tiene que verse, y el borde fuerte en claro
                        // (#cbd5e1) queda demasiado pálido. La paleta de tinta no
                        // se invierte, así que en oscuro también contrasta.
                        'border-[var(--k-ink-400)] bg-[var(--bg-card,#ffffff)] group-hover:border-accent',
                  )}
                />
                {isChecked && (
                  <span aria-hidden className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-accent-fg,#ffffff)]" />
                )}
              </span>
              {renderOption ? renderOption(opt, state) : content}
            </label>
          );
        })}
      </div>
    </ControlField>
  );
};
