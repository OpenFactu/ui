import * as React from 'react';
import { cn } from '../utils';
import { Skeleton } from './Skeleton';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: {
    dir: 'up' | 'down' | 'flat';
    text: string;
  };
  /** Icono decorativo en la esquina superior derecha. */
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Sustituye las cifras por barras de carga, sin cambiar la altura. */
  isLoading?: boolean;
  className?: string;
}

/**
 * Tarjeta KPI según el brand guide Keirost.
 * Label (DM Mono 10px uppercase), valor (Syne 32px 700), sub y trend opcional.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  trend,
  icon,
  onClick,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    // Mismas alturas y márgenes que el contenido real, para que no salte nada
    // cuando llegan los datos.
    return (
      <div
        aria-busy="true"
        className={cn(
          'p-7 bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)]',
          className,
        )}
      >
        <div className="mb-2.5">
          <Skeleton height={10} width={110} />
        </div>
        <Skeleton height={32} width={150} />
        {sub !== undefined && (
          <div className="mt-1.5">
            <Skeleton height={12} width={90} />
          </div>
        )}
        {trend !== undefined && (
          <div className="mt-3">
            <Skeleton height={11} width={70} />
          </div>
        )}
      </div>
    );
  }

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'p-7 bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)] relative',
        onClick &&
          'text-left w-full cursor-pointer transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        className,
      )}
    >
      {icon && (
        <span className="absolute top-6 right-6 text-[var(--fg-subtle,#657486)]">
          {icon}
        </span>
      )}
      <div className="font-mono text-[10px] tracking-[1.5px] uppercase text-[var(--fg-subtle,#657486)] mb-2.5">
        {label}
      </div>
      <div className="font-display text-[32px] font-bold leading-none text-[var(--fg-default,#0a1628)]">
        {value}
      </div>
      {sub && (
        <div className="text-[12px] text-[var(--fg-subtle,#657486)] mt-1.5">
          {sub}
        </div>
      )}
      {trend && (
        <div
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-mono font-medium mt-3',
            trend.dir === 'up' && 'text-[var(--k-success-fg)]',
            trend.dir === 'down' && 'text-[var(--k-danger-fg)]',
            trend.dir === 'flat' && 'text-[var(--fg-subtle,#657486)]',
          )}
        >
          <span>
            {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'}
          </span>
          {trend.text}
        </div>
      )}
    </Wrapper>
  );
};
