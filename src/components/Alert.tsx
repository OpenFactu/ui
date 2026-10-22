import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../utils';

export interface AlertProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  variant?: 'soft' | 'outline';
  icon?: React.ReactNode | false;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Usa 'alert' para avisos urgentes que aparecen después de una acción. */
  role?: 'status' | 'alert' | 'note';
  className?: string;
}

const TONES = {
  info: 'bg-[var(--k-info-bg,#eff6ff)] text-[var(--k-info-fg,#1d4ed8)] border-[color-mix(in_srgb,var(--k-info,#2563eb)_30%,var(--bg-card,#ffffff))]',
  success:
    'bg-[var(--k-success-bg,#f0fdf4)] text-[var(--k-success-fg,#15803d)] border-[color-mix(in_srgb,var(--k-success,#16a34a)_30%,var(--bg-card,#ffffff))]',
  warning:
    'bg-[var(--k-warning-bg,#fffbeb)] text-[var(--k-warning-fg,#b45309)] border-[color-mix(in_srgb,var(--k-warning,#d97706)_30%,var(--bg-card,#ffffff))]',
  danger:
    'bg-[var(--k-danger-bg,#fef2f2)] text-[var(--k-danger-fg,#b91c1c)] border-[color-mix(in_srgb,var(--k-danger,#dc2626)_30%,var(--bg-card,#ffffff))]',
  neutral:
    'bg-[var(--bg-muted,#f8fafc)] text-[var(--fg-body,#2d3a4a)] border-[var(--border-default,#e2e8f0)]',
};
const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
};

/** Aviso persistente dentro de una página o formulario, con acción opcional. */
export function Alert({
  title,
  children,
  tone = 'info',
  variant = 'soft',
  icon,
  action,
  onDismiss,
  dismissLabel = 'Cerrar aviso',
  role = 'note',
  className,
}: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-[var(--k-radius-sm,4px)] border p-4 text-[13px]',
        TONES[tone],
        variant === 'outline' && 'bg-[var(--bg-card,#ffffff)]',
        className,
      )}
    >
      {icon !== false && (
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {icon ?? <Icon size={18} />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-5">{title}</p>}
        {children && <div className={cn('leading-relaxed', title && 'mt-1')}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="rounded-[var(--k-radius-xs,2px)] p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
