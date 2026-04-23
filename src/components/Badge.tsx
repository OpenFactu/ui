import * as React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'teal';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants = {
      success:
        'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
      warning:
        'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
      error:
        'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
      info:
        'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE] dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
      teal:
        'bg-[var(--k-teal-50)] text-[var(--k-teal-600)] border-[var(--k-teal-100)] dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
      neutral:
        'bg-[var(--k-surface)] text-[var(--k-ink-500)] border-[var(--k-line)] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-[2px] border px-[10px] py-[3px] text-[10px] font-mono font-medium tracking-[0.5px] transition-colors k-pop-in',
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';
