import * as React from 'react';
import { cn } from '../utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'size'> {
  checked: boolean;
  /** Tristate: true = todos seleccionados, false = ninguno, 'indeterminate' = algunos. */
  state?: 'checked' | 'unchecked' | 'indeterminate';
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  state,
  onChange,
  size = 'md',
  className,
  disabled,
  ...rest
}) => {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'indeterminate';
    }
  }, [state]);

  const dimensions = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        dimensions,
        'cursor-pointer rounded border border-slate-300 dark:border-slate-600',
        'bg-white dark:bg-slate-800',
        'text-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0',
        'transition-colors',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
};
