import * as React from 'react';
import { cn } from '../utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  /** Normalmente un <Button>. */
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: 'default' | 'compact' | 'panel';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  hint,
  action,
  secondaryAction,
  variant = 'default',
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-2 px-4 text-center',
      variant === 'compact' ? 'py-6' : 'py-12',
      variant === 'panel' &&
        'rounded-[var(--k-radius-sm)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)]',
      className,
    )}
  >
    {icon && <div className="text-[var(--fg-subtle,#657486)] opacity-60 mb-1">{icon}</div>}
    <p className="text-[11px] font-mono font-bold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
      {title}
    </p>
    {hint && <p className="text-[12px] text-[var(--fg-muted,#52606f)] max-w-xs">{hint}</p>}
    {(action || secondaryAction) && (
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
    )}
  </div>
);
