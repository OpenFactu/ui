import * as React from 'react';
import { cn } from '../utils';

export interface ProgressProps {
  /** 0–100 (se hace clamp interno). Ignorado si `indeterminate`. */
  value?: number;
  /** No se sabe cuánto falta: una barra que entra y sale. */
  indeterminate?: boolean;
  /** Rayas que avanzan sobre la barra. */
  striped?: boolean;
  /** Brillo que la recorre mientras avanza. */
  glow?: boolean;
  variant?: 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  label?: string;
  /** Muestra el porcentaje a la derecha del label. */
  showValue?: boolean;
  className?: string;
}

const variantClasses = {
  accent: 'bg-accent',
  success: 'bg-[var(--k-success)]',
  warning: 'bg-[var(--k-warning)]',
  danger: 'bg-[var(--k-danger)]',
};

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  indeterminate = false,
  striped = false,
  glow = false,
  variant = 'accent',
  size = 'md',
  label,
  showValue = false,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div data-k-mobile="Progress" className={cn('flex flex-col gap-1.5 w-full', className)}>
      {(label || (showValue && !indeterminate)) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">
              {label}
            </span>
          )}
          {showValue && !indeterminate && (
            <span className="font-mono text-[11px] text-[var(--fg-muted,#52606f)]">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        data-indeterminate={indeterminate || undefined}
        data-striped={striped || undefined}
        data-glow={glow || undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'k-progress-track w-full overflow-hidden rounded-full bg-[var(--bg-hover)]',
          size === 'sm' ? 'h-1' : 'h-2',
        )}
      >
        <div
          className={cn('k-progress-fill h-full rounded-full transition-all duration-300', variantClasses[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
