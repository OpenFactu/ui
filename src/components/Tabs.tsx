import { enabledIndices, rovingNext } from '../internal/roving';
import * as React from 'react';
import { cn } from '../utils';
import { attrValue, useIndicator } from '../motion/useIndicator';

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
  const hasActive = items.some((item) => item.key === value);
  const { ref: indicatorRef } = useIndicator({
    containerRef: listRef,
    activeSelector: hasActive ? `[data-tab-key="${attrValue(value)}"]` : null,
    mode: variant === 'underline' ? 'bottom' : 'box',
  });
  React.useEffect(() => { const list = listRef.current; if (!list || window.innerWidth >= 768) return; const active = Array.from(list.querySelectorAll<HTMLElement>('[data-tab-key]')).find(element => element.dataset.tabKey === value); active?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [value]);

  // Navegación con flechas entre tabs habilitadas (patrón WAI-ARIA tablist).
  const handleKeyDown = (event: React.KeyboardEvent, currentKey: string) => {
    const index = rovingNext(event.key, enabledIndices(items), items.findIndex((t) => t.key === currentKey), { axis: 'horizontal' });
    if (index === null) return;
    event.preventDefault();
    const next = items[index];
    onChange(next.key);
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-key="${attrValue(next.key)}"]`);
    btn?.focus();
  };

  const isUnderline = variant === 'underline';
  const isSegmented = variant === 'segmented';

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        'k-tabs relative flex',
        isUnderline &&
          'border-b border-[var(--border-default,#e2e8f0)] max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden',
        variant === 'pill' && 'items-center gap-1',
        isSegmented &&
          'items-stretch w-fit rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] overflow-hidden',
        scrollable && 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <span
        ref={indicatorRef}
        aria-hidden="true"
        data-ready="false"
        className={cn(
          'k-indicator',
          isUnderline && 'h-0.5 bg-accent',
          variant === 'pill' && 'rounded-[var(--k-radius-xs,2px)] bg-accent/10 dark:bg-accent/20',
          isSegmented && 'bg-accent',
        )}
      />
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
              'relative z-[1] flex items-center font-medium whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              fullWidth && 'flex-1 justify-center',
              isUnderline
                ? cn(
                    'border-b-2 -mb-px',
                    underlineSizes[size],
                    'border-transparent',
                    isActive
                      ? 'text-accent'
                      : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-body,#2d3a4a)]',
                  )
                : isSegmented
                ? cn(
                    segmentedSizes[size],
                    'justify-center',
                    i > 0 && 'border-l border-[var(--border-default,#e2e8f0)]',
                    isActive
                      ? 'text-[color:var(--color-accent-fg)]'
                      : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover,#f1f5f9)]',
                  )
                : cn(
                    'rounded-[var(--k-radius-xs,2px)]',
                    pillSizes[size],
                    isActive
                      ? 'text-accent'
                      : 'text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)] hover:text-accent',
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
