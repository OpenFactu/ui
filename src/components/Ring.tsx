import * as React from 'react';
import { cn } from '../utils';

export type RingTone = 'accent' | 'success' | 'warning' | 'danger' | 'auto';

export interface RingProps {
  value: number;
  max?: number;
  /** Diámetro en px. Default 40. */
  size?: number;
  /** Grosor del anillo. Default 4. */
  thickness?: number;
  /**
   * 'auto' colorea por umbral: verde por debajo del 70 %, ámbar hasta el 90 %
   * y rojo por encima. Útil para consumos y cuotas.
   */
  tone?: RingTone;
  /** Contenido en el centro; `true` muestra el porcentaje. */
  label?: React.ReactNode | true;
  /** Descripción accesible del valor. */
  ariaLabel?: string;
  className?: string;
}

const TONE_COLORS: Record<Exclude<RingTone, 'auto'>, string> = {
  accent: 'var(--color-accent, #0d9488)',
  success: 'var(--k-success, #16a34a)',
  warning: 'var(--k-warning, #d97706)',
  danger: 'var(--k-danger, #dc2626)',
};

/** Anillo de progreso. Sin dependencias: es un `<circle>` con el trazo recortado. */
export const Ring: React.FC<RingProps> = ({
  value,
  max = 100,
  size = 40,
  thickness = 4,
  tone = 'accent',
  label,
  ariaLabel,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const color =
    tone === 'auto'
      ? pct >= 90
        ? TONE_COLORS.danger
        : pct >= 70
          ? TONE_COLORS.warning
          : TONE_COLORS.success
      : TONE_COLORS[tone];

  return (
    <span
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {/* -90° para que el progreso arranque arriba y no a las 3 en punto. */}
      <svg width={size} height={size} className="-rotate-90 block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-[var(--border-default,#e2e8f0)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {label !== undefined && (
        <span
          className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-[var(--fg-body,#2d3a4a)] tabular-nums"
          style={{ fontSize: Math.max(8, size * 0.26) }}
        >
          {label === true ? `${Math.round(pct)}%` : label}
        </span>
      )}
    </span>
  );
};
