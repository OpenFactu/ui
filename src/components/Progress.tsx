import * as React from 'react';
import { cn } from '../utils';

export interface ProgressProps {
  /** 0–100 (se hace clamp interno). */
  value: number;
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
  value,
  variant = 'accent',
  size = 'md',
  label,
  showValue = false,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="font-mono text-[11px] text-[var(--fg-muted,#64748b)]">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-[var(--k-line-2)] dark:bg-slate-800',
          size === 'sm' ? 'h-1' : 'h-2',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', variantClasses[variant])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
