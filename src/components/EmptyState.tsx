import * as React from 'react';
import { cn } from '../utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  /** Normalmente un <Button>. */
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  hint,
  action,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center gap-2 py-12 px-4 text-center', className)}>
    {icon && <div className="text-[var(--fg-subtle,#94a3b8)] opacity-60 mb-1">{icon}</div>}
    <p className="text-[11px] font-mono font-bold uppercase tracking-[1.5px] text-[var(--fg-subtle,#94a3b8)]">
      {title}
    </p>
    {hint && (
      <p className="text-[12px] text-[var(--fg-muted,#64748b)] max-w-xs">{hint}</p>
    )}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
