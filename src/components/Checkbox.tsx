import * as React from 'react';
import { cn } from '../utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'size'> {
  checked: boolean;
  /** Tristate: true = todos seleccionados, false = ninguno, 'indeterminate' = algunos. */
  state?: 'checked' | 'unchecked' | 'indeterminate';
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
  /**
   * Texto a la derecha de la casilla, unido a ella con `htmlFor`: así también
   * se marca pulsando el texto, que es lo que espera cualquiera. Sin esto cada
   * sitio se escribía su propio `<label>` y la mitad quedaban sin asociar.
   */
  label?: React.ReactNode;
  /** Segunda línea bajo la etiqueta. */
  description?: React.ReactNode;
  labelClassName?: string;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  state,
  onChange,
  size = 'md',
  className,
  disabled,
  label,
  description,
  labelClassName,
  containerClassName,
  id,
  ...rest
}) => {
  const ref = React.useRef<HTMLInputElement>(null);
  const generatedId = React.useId();
  const inputId = id || generatedId;

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'indeterminate';
    }
  }, [state]);

  const dimensions = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const casilla = (
    <input
      ref={ref}
      id={inputId}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        dimensions,
        'shrink-0 cursor-pointer rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default)]',
        'bg-[var(--bg-muted)]',
        'text-accent accent-[color:var(--k-teal-500)] focus:ring-1 focus:ring-accent focus:ring-offset-0',
        'transition-colors',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );

  // Sin etiqueta se devuelve el `<input>` pelado: hay decenas de usos dentro de
  // celdas de tabla que cuentan con eso y un envoltorio les rompería el hueco.
  if (!label && !description) return casilla;

  return (
    <div className={cn('flex items-start gap-2', containerClassName)}>
      {size === 'sm' ? <span className="mt-0.5">{casilla}</span> : casilla}
      <label
        htmlFor={inputId}
        className={cn(
          'select-none leading-tight',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
          labelClassName,
        )}
      >
        {label && (
          <span className="block text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">
            {label}
            {rest.required && (
              <span className="ml-0.5 text-[var(--k-danger-fg)]" aria-hidden="true">
                *
              </span>
            )}
          </span>
        )}
        {description && (
          <span className="mt-0.5 block text-[11px] text-[var(--fg-subtle,#657486)]">
            {description}
          </span>
        )}
      </label>
    </div>
  );
};
