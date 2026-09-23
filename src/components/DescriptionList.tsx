import * as React from 'react';
import { cn } from '../utils';

export interface DescriptionItem {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Ocupa todas las columnas, para direcciones o notas extensas. */
  fullWidth?: boolean;
  mono?: boolean;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
  layout?: 'stacked' | 'inline';
  variant?: 'plain' | 'divided' | 'surface';
  emptyValue?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

/** Datos de una ficha con semántica dt/dd: clientes, documentos o productos. */
export function DescriptionList({
  items,
  columns = 2,
  layout = 'stacked',
  variant = 'plain',
  emptyValue = '—',
  className,
  ariaLabel,
}: DescriptionListProps) {
  return (
    <dl
      aria-label={ariaLabel}
      className={cn('grid min-w-0 gap-x-6 gap-y-4', COLUMNS[columns], className)}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            'min-w-0',
            item.fullWidth && 'col-span-full',
            layout === 'inline' && 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1',
            variant === 'divided' && 'border-b border-[var(--border-default,#e2e8f0)] pb-3',
            variant === 'surface' &&
              'rounded-[var(--k-radius-xs,2px)] bg-[var(--bg-muted,#f8fafc)] p-3',
          )}
        >
          <dt className="text-[12px] leading-5 text-[var(--fg-muted,#52606f)]">{item.label}</dt>
          <dd
            className={cn(
              'min-w-0 break-words text-[13px] font-medium leading-5 text-[var(--fg-default,#0a1628)]',
              layout === 'stacked' && 'mt-1',
              item.mono && 'font-mono tabular-nums',
            )}
          >
            {item.value === null || item.value === undefined || item.value === ''
              ? emptyValue
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
