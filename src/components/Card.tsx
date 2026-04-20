import * as React from 'react';
import { cn } from '../utils';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className,
  bodyClassName,
  noPadding = false,
}: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-[var(--k-line)] dark:border-slate-800 rounded-[4px] overflow-hidden',
        className,
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-[var(--k-line)] dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
          <div>
            {title && (
              <h3 className="text-[16px] font-semibold font-display text-[var(--k-ink-900)] dark:text-slate-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] font-sans text-[var(--k-ink-400)] dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={cn(!noPadding && 'p-6', bodyClassName)}>{children}</div>

      {footer && (
        <div className="px-6 py-3 bg-[var(--k-surface)] dark:bg-slate-900 border-t border-[var(--k-line)] dark:border-slate-800 mt-auto">
          {footer}
        </div>
      )}
    </div>
  );
};
