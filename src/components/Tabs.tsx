import * as React from 'react';
import { cn } from '../utils';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Contenido extra a la derecha del label (contadores, Badge…). */
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /**
   * 'underline': subrayado bajo la pestaña activa.
   * 'pill': pastilla translúcida, ligera.
   * 'segmented': grupo compacto de una pieza con la activa rellena. Mismo
   *   aspecto que `SegmentedControl`, pero anunciado como pestañas: úsalo
   *   cuando lo que cambia es la vista, no un filtro.
   */
  variant?: 'underline' | 'pill' | 'segmented';
  size?: 'sm' | 'md';
  /** overflow-x-auto para muchas tabs (estilo CompanySettings). */
  scrollable?: boolean;
  /** Cada tab ocupa el mismo ancho (flex-1). */
  fullWidth?: boolean;
  className?: string;
}

const underlineSizes = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
};

const pillSizes = {
  sm: 'px-2.5 py-1 text-[11px] gap-1',
  md: 'px-3 py-1.5 text-xs gap-1.5',
};

const segmentedSizes = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5',
  md: 'px-3.5 py-2 text-[13px] gap-2',
};

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  scrollable = false,
  fullWidth = false,
  className,
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Navegación con flechas entre tabs habilitadas (patrón WAI-ARIA tablist).
  const handleKeyDown = (event: React.KeyboardEvent, currentKey: string) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const enabled = items.filter((t) => !t.disabled);
    const idx = enabled.findIndex((t) => t.key === currentKey);
    if (idx === -1) return;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    onChange(next.key);
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-key="${next.key}"]`);
    btn?.focus();
  };

  const isUnderline = variant === 'underline';
  const isSegmented = variant === 'segmented';

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        'flex',
        isUnderline && 'border-b border-[var(--border-default,#e2e8f0)]',
        variant === 'pill' && 'items-center gap-1',
        isSegmented &&
          'items-stretch w-fit rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] overflow-hidden',
        scrollable && 'overflow-x-auto',
        className,
      )}
    >
      {items.map((item, i) => {
        const isActive = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            data-tab-key={item.key}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => handleKeyDown(e, item.key)}
            className={cn(
              'flex items-center font-medium whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              fullWidth && 'flex-1 justify-center',
              isUnderline
                ? cn(
                    'border-b-2 -mb-px',
                    underlineSizes[size],
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-[var(--fg-muted,#64748b)] hover:text-[var(--fg-body,#2d3a4a)]',
                  )
                : isSegmented
                ? cn(
                    segmentedSizes[size],
                    'justify-center',
                    i > 0 && 'border-l border-[var(--border-default,#e2e8f0)]',
                    isActive
                      ? 'bg-accent text-[color:var(--color-accent-fg)]'
                      : 'text-[var(--fg-muted,#64748b)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover,#f1f5f9)]',
                  )
                : cn(
                    'rounded-[var(--k-radius-xs,2px)]',
                    pillSizes[size],
                    isActive
                      ? 'bg-accent/10 text-accent dark:bg-accent/20'
                      : 'text-[var(--fg-body,#2d3a4a)] dark:text-slate-400 hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800 hover:text-accent',
                  ),
              item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
};
