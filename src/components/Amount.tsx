import * as React from 'react';
import { cn } from '../utils';

export interface AmountProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Importe en unidades de moneda (1234.56 euros), no en céntimos. */
  value: number | null | undefined;
  currency?: string;
  locale?: string;
  /** Opciones de presentación; no calcula ni redondea datos de negocio. */
  formatOptions?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>;
  emptyValue?: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'muted';
}

/** Formato monetario común para celdas, indicadores y resúmenes. Conserva el cero. */
export const Amount = React.forwardRef<HTMLSpanElement, AmountProps>(
  (
    {
      value,
      currency = 'EUR',
      locale = 'es-ES',
      formatOptions,
      emptyValue = '—',
      tone = 'default',
      className,
      ...rest
    },
    ref,
  ) => {
    const formatter = React.useMemo(
      () => new Intl.NumberFormat(locale, { ...formatOptions, style: 'currency', currency }),
      [locale, currency, formatOptions],
    );
    return (
      <span
        ref={ref}
        {...rest}
        className={cn(
          'whitespace-nowrap font-mono tabular-nums',
          {
            default: 'text-[var(--fg-default)]',
            success: 'text-[var(--k-success-fg)]',
            danger: 'text-[var(--k-danger-fg)]',
            muted: 'text-[var(--fg-muted)]',
          }[tone],
          className,
        )}
      >
        {value == null || !Number.isFinite(value) ? emptyValue : formatter.format(value)}
      </span>
    );
  },
);
Amount.displayName = 'Amount';
