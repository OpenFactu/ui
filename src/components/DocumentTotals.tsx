import * as React from 'react';
import { cn } from '../utils';
import { Amount, type AmountProps } from './Amount';

export interface DocumentTotalLine {
  id: string;
  label: React.ReactNode;
  value: number | null;
  hint?: React.ReactNode;
  tone?: AmountProps['tone'];
}

export interface DocumentTotalsProps {
  /** Desglose ya calculado por el consumidor: base, descuentos, impuestos, etc. */
  lines: DocumentTotalLine[];
  total: number | null;
  totalLabel?: React.ReactNode;
  currency?: string;
  locale?: string;
  note?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
  'aria-label'?: string;
}

/** Presentación del desglose. No implementa reglas fiscales ni suma líneas. */
export const DocumentTotals: React.FC<DocumentTotalsProps> = ({
  lines,
  total,
  totalLabel = 'Total',
  currency = 'EUR',
  locale = 'es-ES',
  note,
  footer,
  variant = 'default',
  className,
  'aria-label': ariaLabel = 'Resumen de importes',
}) => (
  <section
    aria-label={ariaLabel}
    className={cn(
      'min-w-0 rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--fg-default)]',
      variant === 'compact' ? 'p-4' : 'p-6',
      className,
    )}
  >
    <dl className="space-y-3 text-[13px]">
      {lines.map((line) => (
        <div
          key={line.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
        >
          <dt className="text-[var(--fg-muted)]">
            {line.label}
            {line.hint && <span className="mt-0.5 block text-[11px]">{line.hint}</span>}
          </dt>
          <dd>
            <Amount value={line.value} currency={currency} locale={locale} tone={line.tone} />
          </dd>
        </div>
      ))}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--border-default)] pt-4">
        <dt className="font-semibold">{totalLabel}</dt>
        <dd className={cn('font-semibold', variant === 'compact' ? 'text-[20px]' : 'text-[26px]')}>
          <Amount value={total} currency={currency} locale={locale} />
        </dd>
      </div>
    </dl>
    {note && <div className="mt-3 text-[12px] text-[var(--fg-muted)]">{note}</div>}
    {footer && <div className="mt-5">{footer}</div>}
  </section>
);
