import * as React from 'react';
import { cn } from '../utils';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: {
    dir: 'up' | 'down' | 'flat';
    text: string;
  };
  className?: string;
}

/**
 * Tarjeta KPI según el brand guide Keirost.
 * Label (DM Mono 10px uppercase), valor (Syne 32px 700), sub y trend opcional.
 */
export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, trend, className }) => {
  return (
    <div
      className={cn(
        'p-7 bg-white dark:bg-slate-900 border border-[var(--k-line)] dark:border-slate-800',
        className,
      )}
    >
      <div className="font-mono text-[10px] tracking-[1.5px] uppercase text-[var(--k-ink-400)] dark:text-slate-500 mb-2.5">
        {label}
      </div>
      <div className="font-display text-[32px] font-bold leading-none text-[var(--k-ink-900)] dark:text-slate-100">
        {value}
      </div>
      {sub && (
        <div className="text-[12px] text-[var(--k-ink-400)] dark:text-slate-500 mt-1.5">
          {sub}
        </div>
      )}
      {trend && (
        <div
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-mono font-medium mt-3',
            trend.dir === 'up' && 'text-[#16A34A]',
            trend.dir === 'down' && 'text-[#DC2626]',
            trend.dir === 'flat' && 'text-[var(--k-ink-400)]',
          )}
        >
          <span>
            {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'}
          </span>
          {trend.text}
        </div>
      )}
    </div>
  );
};
